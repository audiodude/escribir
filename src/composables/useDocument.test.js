import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));

let invoke, open, save;
let useDocument, state;

const FILE = '/notes/ideas.md';

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  vi.useFakeTimers();

  ({ invoke } = await import('@tauri-apps/api/core'));
  ({ open, save } = await import('@tauri-apps/plugin-dialog'));
  ({ useDocument } = await import('./useDocument.js'));
  state = useDocument().state;

  invoke.mockResolvedValue('');
});

afterEach(() => {
  vi.useRealTimers();
});

function invoked(cmd) {
  return invoke.mock.calls.filter(([c]) => c === cmd);
}

async function type(text) {
  state.content = text;
  await nextTick();
}

async function loadFile(path = FILE, contents = '# hi') {
  invoke.mockImplementation((cmd) =>
    Promise.resolve(cmd === 'read_file' ? contents : '')
  );
  await useDocument().selectSibling(path);
}

describe('autosave', () => {
  it('writes the file after a 1s debounce when dirty', async () => {
    await loadFile();
    await type('# hi\n\nnew words');
    expect(invoked('write_file')).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(invoked('write_file')).toEqual([
      ['write_file', { path: FILE, contents: '# hi\n\nnew words' }],
    ]);
    expect(state.isDirty).toBe(false);
  });

  it('debounces rapid typing into a single write', async () => {
    await loadFile();
    await type('a');
    await vi.advanceTimersByTimeAsync(500);
    await type('ab');
    await vi.advanceTimersByTimeAsync(1000);
    expect(invoked('write_file')).toHaveLength(1);
    expect(invoked('write_file')[0][1].contents).toBe('ab');
  });

  it('autosaves untitled documents to the draft, never a dialog', async () => {
    useDocument().newFile();
    await type('draft words');
    await vi.advanceTimersByTimeAsync(1000);

    expect(invoked('write_draft')).toEqual([['write_draft', { contents: 'draft words' }]]);
    expect(invoked('write_file')).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not write when nothing changed', async () => {
    await loadFile();
    await vi.advanceTimersByTimeAsync(2000);
    expect(invoked('write_file')).toHaveLength(0);
    expect(state.isDirty).toBe(false);
  });

  it('hides the chrome as soon as the document becomes dirty', async () => {
    await loadFile();
    expect(state.chromeHidden).toBe(false);
    await type('x');
    expect(state.chromeHidden).toBe(true);
  });
});

describe('saveNow (Cmd+S)', () => {
  it('prompts for a path on untitled docs, writes the file, then deletes the draft', async () => {
    useDocument().newFile();
    await type('my essay');
    save.mockResolvedValue(FILE);
    invoke.mockClear();

    await useDocument().saveNow();

    expect(save).toHaveBeenCalledOnce();
    expect(invoked('write_file')).toEqual([['write_file', { path: FILE, contents: 'my essay' }]]);
    expect(invoked('delete_draft')).toHaveLength(1);
    expect(state.currentFile).toBe(FILE);
    expect(state.saveStatus).toBe('saved');
    expect(localStorage.getItem('escribir:lastFile')).toBe(FILE);
  });

  it('does nothing when the save dialog is cancelled', async () => {
    useDocument().newFile();
    await type('my essay');
    save.mockResolvedValue(null);
    invoke.mockClear();

    await useDocument().saveNow();

    expect(invoked('write_file')).toHaveLength(0);
    expect(invoked('delete_draft')).toHaveLength(0);
    expect(state.currentFile).toBeNull();
  });

  it('saves in place without a dialog for files that already have a path', async () => {
    await loadFile();
    await type('more');

    await useDocument().saveNow();

    expect(save).not.toHaveBeenCalled();
    expect(invoked('write_file')).toEqual([['write_file', { path: FILE, contents: 'more' }]]);
    expect(state.saveStatus).toBe('saved');
  });

  it('writes immediately instead of waiting for the pending autosave', async () => {
    await loadFile();
    await type('quick');
    await useDocument().saveNow();
    await vi.advanceTimersByTimeAsync(5000);

    expect(invoked('write_file')).toHaveLength(1);
  });
});

describe('flushSave (close/quit)', () => {
  it('flushes a pending autosave immediately and reports success', async () => {
    await loadFile();
    await type('unsaved');

    const ok = await useDocument().flushSave();

    expect(ok).toBe(true);
    expect(invoked('write_file')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(invoked('write_file')).toHaveLength(1);
  });

  it('flushes untitled content to the draft without prompting', async () => {
    useDocument().newFile();
    await type('untitled thoughts');

    const ok = await useDocument().flushSave();

    expect(ok).toBe(true);
    expect(invoked('write_draft')).toEqual([['write_draft', { contents: 'untitled thoughts' }]]);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns false when the write fails so the close can be aborted', async () => {
    await loadFile();
    await type('unsaved');
    invoke.mockRejectedValue(new Error('disk full'));

    const ok = await useDocument().flushSave();

    expect(ok).toBe(false);
    expect(state.saveStatus).toBe('error');
  });
});

describe('startup restore', () => {
  it('reopens the last open file', async () => {
    localStorage.setItem('escribir:lastFile', FILE);
    invoke.mockImplementation((cmd) =>
      Promise.resolve(cmd === 'read_file' ? '# restored' : '')
    );

    await useDocument().restoreLastFile();

    expect(state.documentOpen).toBe(true);
    expect(state.currentFile).toBe(FILE);
    expect(state.content).toBe('# restored');
    expect(state.isDirty).toBe(false);
  });

  it('drops a vanished last file and falls back to the draft', async () => {
    localStorage.setItem('escribir:lastFile', '/gone.md');
    invoke.mockImplementation((cmd) => {
      if (cmd === 'read_file') return Promise.reject(new Error('not found'));
      if (cmd === 'read_draft') return Promise.resolve('draft survives');
      return Promise.resolve('');
    });

    await useDocument().restoreLastFile();

    expect(localStorage.getItem('escribir:lastFile')).toBeNull();
    expect(state.documentOpen).toBe(true);
    expect(state.currentFile).toBeNull();
    expect(state.content).toBe('draft survives');
  });

  it('restores the draft as an untitled document when there is no last file', async () => {
    invoke.mockImplementation((cmd) =>
      Promise.resolve(cmd === 'read_draft' ? 'untitled from yesterday' : '')
    );

    await useDocument().restoreLastFile();

    expect(state.documentOpen).toBe(true);
    expect(state.currentFile).toBeNull();
    expect(state.content).toBe('untitled from yesterday');
    expect(state.isDirty).toBe(false);
  });

  it('stays at the empty state when there is nothing to restore', async () => {
    invoke.mockResolvedValue('');
    await useDocument().restoreLastFile();
    expect(state.documentOpen).toBe(false);
  });
});

describe('document switching', () => {
  it('deletes the draft when a real file replaces the untitled buffer', async () => {
    useDocument().newFile();
    await type('abandoned');
    await vi.advanceTimersByTimeAsync(1000);
    expect(invoked('write_draft')).toHaveLength(1);
    invoke.mockClear();

    await loadFile();

    expect(invoked('delete_draft')).toHaveLength(1);
    expect(state.currentFile).toBe(FILE);
  });

  it('deletes the draft on newFile so an empty buffer stays empty', async () => {
    await loadFile();
    invoke.mockClear();
    useDocument().newFile();
    await nextTick();

    expect(invoked('delete_draft')).toHaveLength(1);
    expect(state.documentOpen).toBe(true);
    expect(state.currentFile).toBeNull();
    expect(state.content).toBe('');
    expect(localStorage.getItem('escribir:lastFile')).toBeNull();
  });

  it('ignores selecting the file that is already open', async () => {
    await loadFile();
    invoke.mockClear();

    await useDocument().selectSibling(FILE);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('reports an error when a file cannot be read', async () => {
    invoke.mockRejectedValue(new Error('permission denied'));
    await useDocument().selectSibling('/root/secret.md');

    expect(state.saveStatus).toBe('error');
    expect(state.documentOpen).toBe(false);
  });
});
