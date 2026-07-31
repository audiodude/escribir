<img src="assets/logo.svg" alt="ESCribir logo" width="96" />

# ESCribir

<br>
<img width="500"  alt="SCR-20260731-hhoh" src="https://github.com/user-attachments/assets/a3cae494-8652-4605-9787-8faaf7d6c1d9"/>
<br>
<br>
<img width="250"  alt="SCR-20260731-hglh" src="https://github.com/user-attachments/assets/c3f85131-c74f-4410-b7a2-4fa2bcb6d4d2" />
<img width="250"  alt="SCR-20260731-hgjr" src="https://github.com/user-attachments/assets/16d6946d-5b9a-4eac-b241-b032e9bd1834" />
<br>
<br>

A distraction-free desktop markdown writing app. Toggle between a CodeMirror
source view and a ProseMirror WYSIWYG view of the same markdown document.

The app icon is a pen writing "ESC" onto a keycap — a nod to the app's own
name (Spanish *escribir*, "to write") and to the Escape key restoring the
UI chrome while writing. Source vector at `assets/logo.svg`; platform icon
files under `src-tauri/icons/` are generated from it via `tauri icon`.

## Features

- Distraction free: automatically hides toolbar as soon as you start typing,
  Press **ESC** to bring it back.
- Toggle between plaintext and WYSIWYG editing of Markdown, or don't use
  Markdown at all!
- Autosave and manual save.
- ESCribir opens to your last document automatically, even if it wasn't
  explicitly saved. **⌘S** on an unsaved document prompts you to save it.
- **Tab** / **Shift-Tab** indent and outdenting works.
- **Cmd+O** opens a different markdown file; **Cmd+N** starts a new one.
- It's easy to just have one big notes/docs folder. The filename dropdown
- in the toolbar lists every other `.md` file in the current file's
  directory, for quick switching. Or **⌘O** to open a file from anywhere.
- No sidebar, no file browser, no project/vault concept — just the one
  document you have open.

## License

This is free (as in pizza and as in freedom) software under the MIT license. Enjoy!

---

## Nerdy coding details follow

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
