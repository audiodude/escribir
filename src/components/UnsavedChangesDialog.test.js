import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import UnsavedChangesDialog from './UnsavedChangesDialog.vue';
import { useDocument } from '../composables/useDocument.js';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));

const { state, newFile } = useDocument();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.assign(state, {
    documentOpen: true,
    docId: 1,
    currentFile: null,
    content: 'work in progress',
    isDirty: false,
    chromeHidden: false,
    mode: 'source',
    saveStatus: 'idle',
    errorMessage: '',
    siblingFiles: [],
    unsavedPrompt: null,
  });
  invoke.mockResolvedValue('');
});

// Puts a real prompt up via newFile() so the dialog resolves the same promise
// the app awaits, rather than a stand-in.
function promptFromNewFile() {
  const done = newFile();
  return { done };
}

describe('unsaved changes dialog', () => {
  it('stays out of the way until something is at risk', () => {
    const wrapper = mount(UnsavedChangesDialog);
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('appears when the document layer asks', async () => {
    const wrapper = mount(UnsavedChangesDialog);
    const { done } = promptFromNewFile();
    await flushPromises();

    expect(wrapper.find('.dialog').exists()).toBe(true);
    expect(wrapper.findAll('.dialog button').map((b) => b.text())).toEqual([
      'Save…',
      "Don't Save",
      'Cancel',
    ]);

    wrapper.find('button.cancel').trigger('click');
    await done;
  });

  it('names the action that is about to replace the buffer', async () => {
    const wrapper = mount(UnsavedChangesDialog);

    state.unsavedPrompt = 'new';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.title').text()).toBe('Save your work before starting a new document?');

    state.unsavedPrompt = 'open';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.title').text()).toBe('Save your work before opening another document?');
  });

  it('routes Save through the save flow and then starts the new document', async () => {
    save.mockResolvedValue('/a/essay.md');
    const wrapper = mount(UnsavedChangesDialog);
    const { done } = promptFromNewFile();
    await flushPromises();

    await wrapper.find('button.save').trigger('click');
    await done;

    expect(invoke).toHaveBeenCalledWith('write_file', {
      path: '/a/essay.md',
      contents: 'work in progress',
    });
    expect(state.content).toBe('');
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it("throws the work away on Don't Save", async () => {
    const wrapper = mount(UnsavedChangesDialog);
    const { done } = promptFromNewFile();
    await flushPromises();

    await wrapper.find('button.discard').trigger('click');
    await done;

    expect(invoke).toHaveBeenCalledWith('delete_draft');
    expect(state.content).toBe('');
  });

  it('keeps the work on Cancel', async () => {
    const wrapper = mount(UnsavedChangesDialog);
    const { done } = promptFromNewFile();
    await flushPromises();

    await wrapper.find('button.cancel').trigger('click');
    await done;

    expect(invoke).not.toHaveBeenCalledWith('delete_draft');
    expect(state.content).toBe('work in progress');
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('treats Escape as Cancel so a stray key cannot lose work', async () => {
    const wrapper = mount(UnsavedChangesDialog, { attachTo: document.body });
    const { done } = promptFromNewFile();
    await flushPromises();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await done;

    expect(invoke).not.toHaveBeenCalledWith('delete_draft');
    expect(state.content).toBe('work in progress');
    wrapper.unmount();
  });
});
