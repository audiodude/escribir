import { reactive, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

const AUTOSAVE_DELAY = 1000;
const SAVED_FLASH_DURATION = 1500;
const MD_FILTERS = [{ name: 'Markdown', extensions: ['md'] }];

const state = reactive({
  documentOpen: false,
  docId: 0,
  currentFile: null, // path on disk, or null for an unsaved new document
  content: '',
  isDirty: false,
  chromeHidden: false,
  mode: 'source', // 'source' | 'wysiwyg'
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  errorMessage: '',
  siblingFiles: [], // .md files in the current file's directory, for the filename dropdown
});

let autosaveTimer = null;
let lastSavedContent = '';

async function refreshSiblings() {
  if (!state.currentFile) {
    state.siblingFiles = [];
    return;
  }
  try {
    state.siblingFiles = await invoke('list_markdown_siblings', { path: state.currentFile });
  } catch {
    state.siblingFiles = [];
  }
}

function resetDocument(path, content) {
  state.docId += 1;
  state.documentOpen = true;
  state.currentFile = path;
  state.content = content;
  lastSavedContent = content;
  state.isDirty = false;
  state.chromeHidden = false;
  state.saveStatus = 'idle';
  refreshSiblings();
}

async function loadFile(path) {
  try {
    const text = await invoke('read_file', { path });
    resetDocument(path, text);
  } catch (e) {
    state.errorMessage = String(e);
    state.saveStatus = 'error';
  }
}

async function openFile() {
  const selected = await open({ multiple: false, filters: MD_FILTERS });
  if (!selected) return;
  await loadFile(selected);
}

async function selectSibling(path) {
  if (!path || path === state.currentFile) return;
  await loadFile(path);
}

function newFile() {
  resetDocument(null, '');
}

async function writeCurrent() {
  if (!state.documentOpen || !state.currentFile) return;
  if (state.content === lastSavedContent) {
    state.isDirty = false;
    return;
  }
  state.saveStatus = 'saving';
  try {
    await invoke('write_file', { path: state.currentFile, contents: state.content });
    lastSavedContent = state.content;
    state.isDirty = false;
    if (state.saveStatus === 'saving') state.saveStatus = 'idle';
  } catch (e) {
    state.errorMessage = String(e);
    state.saveStatus = 'error';
  }
}

function flashSaved() {
  state.saveStatus = 'saved';
  setTimeout(() => {
    if (state.saveStatus === 'saved') state.saveStatus = 'idle';
  }, SAVED_FLASH_DURATION);
}

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    writeCurrent();
  }, AUTOSAVE_DELAY);
}

async function saveNow() {
  if (!state.documentOpen) return;
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  let isNewPath = false;
  if (!state.currentFile) {
    const path = await save({ filters: MD_FILTERS, defaultPath: 'untitled.md' });
    if (!path) return;
    state.currentFile = path;
    lastSavedContent = null; // force the write below even if content is still empty/unchanged
    isNewPath = true;
  }
  await writeCurrent();
  if (isNewPath) refreshSiblings();
  if (state.saveStatus !== 'error') flashSaved();
}

function showChrome() {
  state.chromeHidden = false;
}

watch(
  () => state.content,
  () => {
    if (!state.documentOpen) return;
    state.isDirty = state.content !== lastSavedContent;
    if (state.isDirty) {
      state.chromeHidden = true;
      if (state.currentFile) scheduleAutosave();
    }
  }
);

export function useDocument() {
  return {
    state,
    openFile,
    newFile,
    saveNow,
    showChrome,
    selectSibling,
  };
}
