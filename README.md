<img src="assets/logo.svg" alt="ESCribir logo" width="96" />

# ESCribir

A distraction-free desktop markdown writing app. Toggle between a CodeMirror
source view and a ProseMirror WYSIWYG view of the same markdown document.

The app icon is a pen writing "ESC" onto a keycap — a nod to the app's own
name (Spanish *escribir*, "to write") and to the Escape key restoring the
UI chrome while writing. Source vector at `assets/logo.svg`; platform icon
files under `src-tauri/icons/` are generated from it via `tauri icon`.

## Features

- Toggle between source (CodeMirror) and WYSIWYG (ProseMirror) editing of the
  same markdown, with no loss of content between modes.
- Chrome (toolbar) automatically hides as soon as you start typing, so
  nothing but your text is on screen. Press **Esc** to bring it back.
- Autosave, with a manual **Cmd+S** flashing a "(saved)" confirmation —
  shown even when the chrome is hidden, because writers are paranoid about
  saving their work.
- An untitled document autosaves to an app-managed draft file, so it
  survives closing and quitting with no save dialog ever. **Cmd+S** or
  clicking the "Untitled" name in the toolbar opens the save dialog to give
  it a real name.
- Reopens the last document you had open on launch (or your untitled
  draft), and remembers the window's size and position between sessions.
- Pending changes are flushed to disk when the window is closed or the app
  quits.
- **Tab** / **Shift-Tab** indent and outdent in both editors (list items in
  WYSIWYG mode) instead of moving keyboard focus.
- **Cmd+O** opens a different markdown file; **Cmd+N** starts a new one.
- The filename dropdown in the toolbar lists every other `.md` file in the
  current file's directory, for quick switching between files in the same
  folder.
- No sidebar, no file browser, no project/vault concept — just the one
  document you have open.

## Development

```sh
npm install
npm run tauri dev
```

## Tests

```sh
npm test                    # frontend: Vitest + jsdom (composable, components, ProseMirror keymap)
cd src-tauri && cargo test  # backend: Rust fs commands and the exit-flush predicate
```

## Building a release

```sh
npm run tauri build
```

Produces a signed `.app` / `.dmg` bundle under
`src-tauri/target/release/bundle/`.

## Stack

- [Tauri v2](https://tauri.app/) (Rust backend, native window/file dialogs)
- Vue 3 for the UI shell
- [CodeMirror 6](https://codemirror.net/) for the source editor
- [ProseMirror](https://prosemirror.net/) (`prosemirror-markdown`) for the
  WYSIWYG editor
