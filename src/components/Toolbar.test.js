import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Toolbar from './Toolbar.vue';
import { useDocument } from '../composables/useDocument.js';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));

const { state } = useDocument();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.assign(state, {
    documentOpen: true,
    docId: 1,
    currentFile: null,
    content: '',
    isDirty: false,
    chromeHidden: false,
    mode: 'source',
    saveStatus: 'idle',
    errorMessage: '',
    siblingFiles: [],
  });
  invoke.mockImplementation((cmd) => {
    if (cmd === 'read_file') return Promise.resolve('# file');
    if (cmd === 'list_markdown_siblings') return Promise.resolve([]);
    return Promise.resolve('');
  });
});

describe('filename control', () => {
  it('lists sibling markdown files when a file is open', () => {
    state.currentFile = '/a/b.md';
    state.siblingFiles = ['/a/b.md', '/a/c.md'];
    const wrapper = mount(Toolbar);

    const options = wrapper.findAll('select.filename-select option');
    expect(options.map((o) => o.text())).toEqual(['b.md', 'c.md']);
    expect(wrapper.find('select').element.value).toBe('/a/b.md');
  });

  it('switches files without a dialog when a sibling is picked', async () => {
    state.currentFile = '/a/b.md';
    state.siblingFiles = ['/a/b.md', '/a/c.md'];
    const wrapper = mount(Toolbar);

    await wrapper.find('select').setValue('/a/c.md');
    await flushPromises();

    expect(invoke).toHaveBeenCalledWith('read_file', { path: '/a/c.md' });
    expect(state.currentFile).toBe('/a/c.md');
    expect(state.content).toBe('# file');
  });

  it('shows a clickable Untitled that pops the save dialog', async () => {
    state.content = 'words';
    save.mockResolvedValue('/a/named.md');
    const wrapper = mount(Toolbar);

    const untitled = wrapper.find('button.untitled');
    expect(untitled.text()).toBe('Untitled');
    await untitled.trigger('click');
    await flushPromises();

    expect(save).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('write_file', {
      path: '/a/named.md',
      contents: 'words',
    });
    expect(invoke).toHaveBeenCalledWith('delete_draft');
    expect(state.currentFile).toBe('/a/named.md');
    expect(state.saveStatus).toBe('saved');
    expect(localStorage.getItem('escribir:lastFile')).toBe('/a/named.md');
  });

  it('stays untitled when the save dialog is cancelled', async () => {
    save.mockResolvedValue(null);
    const wrapper = mount(Toolbar);

    await wrapper.find('button.untitled').trigger('click');
    await flushPromises();

    expect(invoke).not.toHaveBeenCalledWith('write_file', expect.anything());
    expect(state.currentFile).toBeNull();
  });
});

describe('mode toggle', () => {
  it('names the mode you will land on and toggles on click', async () => {
    const wrapper = mount(Toolbar);
    const toggle = wrapper.find('button.mode-toggle');

    expect(toggle.text()).toBe('Preview');
    await toggle.trigger('click');
    expect(state.mode).toBe('wysiwyg');
    expect(toggle.text()).toBe('Source');
    await toggle.trigger('click');
    expect(state.mode).toBe('source');
  });
});

describe('save status', () => {
  it('reflects saving / saved / error / idle', async () => {
    const wrapper = mount(Toolbar);
    const status = wrapper.find('.status');

    expect(status.text()).toBe('');

    state.saveStatus = 'saving';
    await wrapper.vm.$nextTick();
    expect(status.text()).toBe('saving…');

    state.saveStatus = 'saved';
    await wrapper.vm.$nextTick();
    expect(status.text()).toBe('(saved)');

    state.saveStatus = 'error';
    state.errorMessage = 'disk full';
    await wrapper.vm.$nextTick();
    expect(status.text()).toBe('error: disk full');
  });
});
