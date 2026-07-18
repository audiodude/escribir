import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const h = vi.hoisted(() => ({ closeHandlers: [], exitListeners: [] }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    onCloseRequested: vi.fn(async (cb) => {
      h.closeHandlers.push(cb);
      return () => {};
    }),
  }),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (_name, cb) => {
    h.exitListeners.push(cb);
    return () => {};
  }),
}));

let invoke, App, state;

function mountApp() {
  return mount(App, { global: { stubs: { Toolbar: true, EditorPane: true } } });
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  h.closeHandlers.length = 0;
  h.exitListeners.length = 0;

  ({ invoke } = await import('@tauri-apps/api/core'));
  invoke.mockResolvedValue('');
  ({ state } = (await import('./composables/useDocument.js')).useDocument());
  App = (await import('./App.vue')).default;
});

describe('(saved) flash', () => {
  it('appears over hidden chrome after a manual save, and only then', async () => {
    const wrapper = mountApp();
    expect(wrapper.find('.saved-flash').exists()).toBe(false);

    state.saveStatus = 'saved';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.saved-flash').exists()).toBe(false);

    state.chromeHidden = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.saved-flash').text()).toBe('(saved)');

    state.saveStatus = 'idle';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.saved-flash').exists()).toBe(false);
  });
});

describe('window close', () => {
  it('lets the close proceed after flushing pending changes', async () => {
    mountApp();
    await flushPromises();
    state.documentOpen = true;
    state.content = 'pending words';

    const event = { preventDefault: vi.fn() };
    await h.closeHandlers[0](event);

    expect(invoke).toHaveBeenCalledWith('write_draft', { contents: 'pending words' });
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('blocks the close when the write fails', async () => {
    mountApp();
    await flushPromises();
    state.documentOpen = true;
    state.content = 'pending words';
    invoke.mockImplementation((cmd) =>
      cmd.startsWith('write') ? Promise.reject(new Error('disk full')) : Promise.resolve('')
    );

    const event = { preventDefault: vi.fn() };
    await h.closeHandlers[0](event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});

describe('app quit (Cmd+Q)', () => {
  it('flushes then finishes the exit', async () => {
    mountApp();
    await flushPromises();
    state.documentOpen = true;
    state.content = 'pending words';

    await h.exitListeners[0]();

    expect(invoke).toHaveBeenCalledWith('write_draft', { contents: 'pending words' });
    expect(invoke).toHaveBeenCalledWith('finish_exit');
  });

  it('does not finish the exit when the flush fails', async () => {
    mountApp();
    await flushPromises();
    state.documentOpen = true;
    state.content = 'pending words';
    invoke.mockImplementation((cmd) =>
      cmd.startsWith('write') ? Promise.reject(new Error('disk full')) : Promise.resolve('')
    );

    await h.exitListeners[0]();

    expect(invoke).not.toHaveBeenCalledWith('finish_exit');
  });
});
