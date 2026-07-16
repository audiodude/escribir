# ESCribir

A distraction-free desktop markdown writing app. Toggle between a CodeMirror
source view and a ProseMirror WYSIWYG view of the same markdown document.

## Features

- Toggle between source (CodeMirror) and WYSIWYG (ProseMirror) editing of the
  same markdown, with no loss of content between modes.
- Chrome (toolbar) automatically hides as soon as you start typing, so
  nothing but your text is on screen. Press **Esc** to bring it back.
- Autosave, with a manual **Cmd+S** giving a "(saved)" confirmation.
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
