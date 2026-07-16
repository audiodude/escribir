# ESCribir — project history

A distraction-free desktop markdown writing app. This doc captures how it
came to be and why it's built the way it is, for future reference.

## Origin

The starting request was a distraction-free writing app that reused the
markdown editor from two references:

- The user's own travisbriggs.com custom CMS, which turned out to use
  **CodeMirror 6** with a dark theme for its markdown source editor.
- **Keystatic**, a git-based CMS whose markdoc field uses a
  **ProseMirror**-based WYSIWYG editor.

Rather than pick one, the app supports both, toggled with a single button:
a plain-text **source** view (CodeMirror) and a **WYSIWYG** view
(ProseMirror). Both editors read and write the same markdown string — that
string is the single source of truth, not a shared document model — so the
toggle is just "which component is currently mounted."

Platform: a **Tauri v2** desktop app (Rust backend, Vue 3 + Vite frontend),
not a browser app — chosen specifically so the window itself, not just the
page, could go chrome-free.

## Architecture

- **State**: a single reactive module-level singleton composable
  (`useDocument.js`), no state-management library. Matches the stack
  conventions of the travisbriggs.com CMS this was modeled on.
- **Editors**: `SourceEditor.vue` wraps CodeMirror 6 (`basicSetup` +
  `@codemirror/lang-markdown`, dark theme adapted from the CMS).
  `WysiwygEditor.vue` wraps ProseMirror using the stock
  `defaultMarkdownParser` / `defaultMarkdownSerializer` / `schema` from
  `prosemirror-markdown`, rather than reimplementing a Markdoc-specific
  schema — a deliberate simplification versus how Keystatic actually works.
  Both emit the full markdown string on every keystroke via
  `update:modelValue`.
- **Backend**: three Rust commands (`read_file`, `write_file`,
  `list_markdown_siblings`), no plugins beyond `dialog` and `opener`. No
  `fs` or `store` plugin — those were tried and removed once the
  folder/sidebar model was dropped (see below).

## Distraction-free chrome hiding — three iterations

This went through real-world-tested revisions rather than landing right the
first time:

1. **First attempt**: chrome hides only when the user explicitly enters
   native OS fullscreen (a ⛶ button / ⌃⌘F). Rejected after actual use —
   "there are almost no apps that I ever want truly 'fullscreen'." All
   native-fullscreen code (window fullscreen tracking, the button, the
   shortcut, the two related Tauri permissions) was removed.
2. **Second attempt**: chrome hides automatically the moment the document
   becomes dirty (i.e. the instant you start typing), and **Escape**
   restores it. This is the current model.
3. **Bug found via screenshot**: hiding the sidebar changed the flex-row
   width available to the editor, so the centered text visibly reflowed
   left-right when chrome hid/showed — "toolbars disappearing and the text
   shifting is definitely not distraction free." Fixed by switching the
   toolbar's hide mechanism from `v-if` (unmount) to CSS
   `opacity`/`pointer-events` toggling, which keeps its layout space
   reserved so nothing else reflows. This fix, plus removing the sidebar
   entirely (see next section), eliminated the shift.

## Save behavior

Autosave (debounced ~1s) does most of the work silently. **Cmd+S** is the
manual/reassurance path: it always flashes a "(saved)" confirmation, even
when there was nothing new to write to disk — the user wanted the
instinctive "did that work?" keystroke to always get a visible answer.

A real bug from this session: `writeCurrent()` set `saveStatus = 'saving'`
but never reset it to `'idle'` on success, so after the first autosave the
toolbar would show "saving…" forever once revealed. Fixed alongside the
toolbar rework.

## The folder/sidebar model was tried, then removed

The original design (from brainstorming) was "plain .md files in a folder
you pick," with a persistent sidebar file list that hid along with the rest
of the chrome. This was fully built (`Sidebar.vue`, folder-scan Rust
commands, `tauri-plugin-store` for remembering the folder) — then scrapped
after actual use:

> "Let's just load empty, with open and new buttons, cmd+o should open a
> different markdown file, and no file browser at all."

This was a full architectural simplification, not a toggle: `Sidebar.vue`
was deleted, the `list_md_files`/`create_file` Rust commands and the
`tauri-plugin-store` dependency were removed (from `Cargo.toml`, `lib.rs`,
and `capabilities/default.json`), and `@tauri-apps/plugin-fs` /
`@tauri-apps/plugin-store` were uninstalled from `package.json`. The app now
starts empty with **Open** / **New** buttons; **Cmd+O** opens a different
file via a native dialog; **Cmd+N** starts a new one. There is no
persistent file list of any kind.

## Toolbar iteration

The toolbar itself went through two more rounds after the folder model was
dropped:

- The mode-toggle button originally labeled itself with the *current* mode
  (clicking "Source" while already in source mode switched you *away* from
  it). Fixed so the label always names the mode you'll land on after
  clicking — click "Source" to see the source.
- The toolbar only showed Open/New as empty-state buttons; there was no way
  to switch files without the empty state or a keyboard shortcut. Reworked
  per a mockup into a persistent bar with: a filename control, an
  **Open other…** button, a **New** button, save status, and the mode
  toggle on the right — visible any time a document is open, not just when
  none is.
- The filename control became a real dropdown, backed by a new Rust command
  `list_markdown_siblings(path)` that lists every `.md` file in the current
  file's directory. Picking one switches straight to it (no dialog).
  Switching files via "Save As" to a brand-new path also refreshes this
  list so the just-created file appears in it.

## Naming: writenow → ESCribir

The original working name was "writenow." Before tagging a v1.0.0 release,
a name-collision check turned up:

- `writenow` unclaimed on the user's own GitHub account, but crowded
  elsewhere: a deprecated npm CLI package, and ~9 other GitHub repos named
  `writenow`/`WriteNow`, including one with 94 stars.

Alternatives considered and checked against npm + GitHub:

| Name | Verdict |
|---|---|
| driftpen / focusdown / stillwrite / barepage | all clean, no real conflicts |
| inkwell | ⚠️ collides with a 3k-star Rust LLVM binding crate |
| owrite | clean on npm/GitHub, but conceptually collides with an obscure existing "distraction free writing tool" of the same name (`chloelaws/OWrite`) |
| headsdown | ⚠️ collides with an actively-maintained multi-repo product/org (`headsdownapp/*`, plus a couple of unrelated focus-mode apps) |
| escribe / escrito | npm names already taken; `escrito` also collides with a 68-star markdown writing tool on GitHub |
| **escribir** | fully clean on npm and GitHub |

Landed on **escribir** — the Spanish word for "to write" — because the
**Esc** key is exactly the mechanism that brings the chrome back
(`Escape → showChrome()`), and "escribir" begins with those same three
letters. Stylized as **ESCribir** (capitalizing the pun) for the
user-facing name — window title, app title — while the underlying
identifiers (package name, Cargo crate/lib name, bundle identifier,
directory name) stay lowercase `escribir`, since macOS bundle identifiers
and package names don't handle mixed case cleanly.

Everything referencing the old name was updated: `package.json` name,
`src-tauri/Cargo.toml` package + lib name, `src-tauri/src/main.rs`'s
`escribir_lib::run()` call, `tauri.conf.json` (`productName`, `identifier`
→ `com.tmoney.escribir`, window title → "ESCribir"), `index.html` `<title>`,
and the project directory itself
(`~/code/vibes/writenow` → `~/code/vibes/escribir`).

## Release (v1.0.0)

- Version bumped to `1.0.0` in `package.json`, `src-tauri/Cargo.toml`, and
  `src-tauri/tauri.conf.json`.
- A stray `package-lock.json` was removed — pnpm (via `pnpm-lock.yaml`) is
  the project's actual package manager; having both was leftover mess from
  scaffolding.
- `src-tauri/target` was excluded from git (build artifacts, not source).
- Production build via `pnpm exec tauri build` produces:
  - `src-tauri/target/release/bundle/macos/escribir.app`
  - `src-tauri/target/release/bundle/dmg/escribir_1.0.0_aarch64.dmg`

## Deliberate non-goals

Called out explicitly during brainstorming so they don't get "fixed" later
by mistake:

- No wikilink / cross-file linking — "keep it simple."
- No persistent sidebar or file list of any kind.
- No typewriter scrolling, focus/dim mode, or word count — considered and
  explicitly not selected as distraction-free features.
- No native OS fullscreen — chrome-hiding is automatic and windowed, not
  tied to fullscreen.
