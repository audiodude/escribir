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
user-facing name — window title, app/bundle name (`ESCribir.app`) — while
the underlying identifiers that npm/cargo/Apple expect lowercase (package
name, Cargo crate/lib name, bundle identifier, directory name) stay
`escribir`.

Everything referencing the old name was updated: `package.json` name,
`src-tauri/Cargo.toml` package + lib name, `src-tauri/src/main.rs`'s
`escribir_lib::run()` call, `tauri.conf.json` (`productName` → "ESCribir",
`identifier` → `com.tmoney.escribir`, window title → "ESCribir"),
`index.html` `<title>`, and the project directory itself
(`~/code/vibes/writenow` → `~/code/vibes/escribir`).

## Release (v1.0.0)

- Version bumped to `1.0.0` in `package.json`, `src-tauri/Cargo.toml`, and
  `src-tauri/tauri.conf.json`.
- A stray `package-lock.json` was removed — pnpm (via `pnpm-lock.yaml`) is
  the project's actual package manager; having both was leftover mess from
  scaffolding.
- `src-tauri/target` was excluded from git (build artifacts, not source).
- Production build via `pnpm exec tauri build` produces:
  - `src-tauri/target/release/bundle/macos/ESCribir.app`
  - `src-tauri/target/release/bundle/dmg/ESCribir_1.0.0_aarch64.dmg`
- Pushed to GitHub (`audiodude/escribir`, public) and released as `v1.0.0`
  with the dmg attached.

### Codesigning and notarization

The first uploaded build was unsigned, so anyone downloading it via a
browser got Gatekeeper's "is damaged and can't be opened" dialog — quarantine
flag on an unsigned app, not actual corruption. Fixed once a paid Apple
Developer account was available:

- A **Developer ID Application** certificate (distinct from the free
  "Apple Development" cert Xcode sets up automatically — that one can't
  sign for distribution outside the App Store) was created via Xcode →
  Settings → Accounts → Manage Certificates, and lands in the login
  keychain.
- `src-tauri/tauri.conf.json` → `bundle.macOS.signingIdentity` set to the
  resulting identity string (`security find-identity -v -p codesigning`
  to find it).
- Notarization credentials (`APPLE_ID`, `APPLE_PASSWORD` — an
  app-specific password from appleid.apple.com, not the account
  password — and `APPLE_TEAM_ID`) live in `~/.secrets`, never in the repo.
  `tauri build` picks them up from the environment automatically and
  signs, notarizes, and staples the ticket to the `.app` in one pass.
- Verified via `codesign --verify --deep --strict`, `spctl -a -vv`
  (should report `source=Notarized Developer ID`), and
  `xcrun stapler validate` (confirms the ticket is stapled, so Gatekeeper
  checks work offline too).
- The signed dmg replaced the original unsigned one on the `v1.0.0`
  GitHub release (`gh release upload --clobber`).

## Logo

Generated via [fal.ai](https://fal.ai), iterated in four rounds:

1. Four pictorial concepts (Esc key, cursor, quill, page-corner) via
   `flux/schnell` — rejected outright ("these are all absolutely terrible").
   In hindsight the wrong approach twice over: the escribir/ESC pun is a
   letter-level wordplay that no pictogram can carry, and `flux/schnell` is
   a photo-oriented raster model that defaults to glossy skeuomorphic
   app-icon renders (plus a stock feather-quill cliché) rather than
   anything distinctive.
2. Switched to `recraft-v3` (`vector_illustration` style — actually trained
   for icon/vector work, and returns real SVG rather than raster) with a
   concrete reference image supplied by the user: a fountain pen writing
   "ESC" onto a keycap. This landed the concept immediately, in both an
   amber-background variant (matching the reference) and a dark
   charcoal/gold variant (matching the app's own theme) — but the keycap
   geometry read as "a pillow," and a busier multi-key variant didn't read
   as a keyboard at all.
3. Reprompted for an explicitly sharp trapezoidal single-keycap shape
   ("NOT rounded, NOT soft, NOT pillow-shaped") — fixed the geometry across
   the board.
4. Final pass rebalanced composition: the pen was too small relative to
   the keycap, so the prompt was adjusted to make the pen dominate the
   frame diagonally while keeping its nib in contact with the keycap top
   (losing that contact was the main failure mode of this round — two of
   four attempts drifted the pen away from the key entirely).

Final pick: **`04_darkbigpen_4`** — large pen, dark/gold theme match, and
"ESC" rendered as if embossed into the keycap face rather than just printed
on it. Saved as `assets/logo.svg` (source of truth) with all platform icon
sizes regenerated from it via `pnpm exec tauri icon assets/logo.svg`
(mobile/Android/iOS variants the generator also produces were deleted —
this is a macOS-only desktop app).

## Post-1.0.0: session restore, save-on-close, Tab handling

Four behavior changes requested as a follow-up batch:

- **Reopen last document on launch.** The current file's path is mirrored
  to `localStorage` (`escribir:lastFile`) via a watcher on
  `state.currentFile`; on mount, `restoreLastFile()` re-reads that path and
  opens it, silently dropping the key if the file no longer exists.
  `localStorage` rather than a plugin/store file — a single string doesn't
  justify re-adding `tauri-plugin-store` (removed earlier with the folder
  model). The empty Open/New state still exists but is now only seen on
  first run or after Cmd+N; its redesign is deferred per the user ("we'll
  talk about the zero state later").
- **Window size/position persistence** via the official
  `tauri-plugin-window-state` (Rust-side, restores on window creation and
  saves on close) plus the `window-state:default` capability. No JS involved.
- **Save on close/exit, and the untitled draft buffer.** An untitled
  document is autosaved to a draft file (`untitled-draft.md` in the app
  data dir) via the same 1s-debounced autosave path as real files — the
  user asked for this explicitly over a save-on-close dialog ("writers are
  paranoid about saving their work", and a dialog on quit is friction).
  Draft lifecycle: written by autosave whenever the buffer is untitled and
  dirty; deleted when it becomes irrelevant — `newFile()`, a successful
  `loadFile()`, or naming the buffer via Cmd+S/clicking "Untitled" (which
  saves to a real path, then deletes the draft). Startup order:
  `localStorage` last-file path wins; otherwise a non-empty draft is
  restored as the untitled buffer. Because everything is already on disk,
  close/quit never prompts: JS intercepts `onCloseRequested` and awaits
  `flushSave()` (clears any pending autosave timer, writes immediately). On
  success the handler returns without `preventDefault()`, and the Tauri JS
  wrapper itself calls `window.destroy()` — so closing needs the
  `core:window:allow-destroy` capability (the first attempt instead
  re-called `close()` behind a re-entrancy flag, which dead-ended exactly
  here: the wrapper's `destroy()` was permission-denied and the red close
  button silently did nothing). On write error, `preventDefault()` keeps
  the window open so the error stays visible. Cmd+Q never reaches JS window
  events, so Rust intercepts `RunEvent::ExitRequested`, calls
  `prevent_exit()`, and emits a `flush-before-exit` event; the JS listener
  flushes, then invokes a `finish_exit` command that sets an `AtomicBool`
  and calls `app.exit(0)` (the flag lets the second `ExitRequested`
  through). Guard: if no windows remain (e.g. exit triggered by the last
  window's destroy), exit proceeds without emitting to a dead webview —
  otherwise the prevented exit would leave a windowless zombie process.
  `tauri-plugin-window-state` is compatible with `destroy()`: it tracks
  geometry continuously on Moved/Resized and writes its state file on
  `RunEvent::Exit`.
- **Tab / Shift-Tab no longer steal focus.** Neither CodeMirror's
  `basicSetup` nor ProseMirror's `exampleSetup` binds Tab, so the browser
  default (focus the next element) won. Source mode now adds CodeMirror's
  `indentWithTab` at `Prec.highest`; WYSIWYG adds a keymap where Tab sinks
  and Shift-Tab lifts list items (`prosemirror-schema-list`), falling back
  to a swallowed no-op (`|| true`) outside lists so focus stays in the
  editor. `@codemirror/commands` and `prosemirror-schema-list` were added
  as direct dependencies (previously only transitive — undeclared imports
  are unreliable under pnpm's strict node_modules).

Also clarified by the user in the same batch: autosave must never trigger
a save dialog (it already couldn't — it only schedules when a path
exists), and clicking the "Untitled" filename should immediately pop the
save dialog, so that control is now a button wired to `saveNow()`.

## Automated tests (post-1.0.0 follow-up)

Everything added in the session above is covered except the parts that
can't be automated on macOS:

- **Frontend — Vitest + jsdom** (`npm test`, 35 tests): the full
  `useDocument` behavior matrix (autosave debounce to file vs draft,
  saveNow dialog flow, flushSave, startup restore order, draft deletion on
  new/open/save-as), the Toolbar (sibling dropdown, clickable Untitled,
  mode toggle, status text), App-level chrome behavior (the `(saved)` flash
  gating, close/quit flush wiring via mocked `onCloseRequested` /
  `listen`), and the ProseMirror Tab keymap (sink/lift/swallow) exercised
  directly through `plugin.props.handleKeyDown` with a fake view — no DOM
  editor needed. Two gotchas surfaced: the composable is a module-level
  singleton with an unexported `lastSavedContent`, so suites must
  `vi.resetModules()` + re-import per test; and `vi.resetModules()` does
  NOT recreate `vi.mock` instances, so `vi.clearAllMocks()` is still
  required or call history leaks between tests (a real failure this hit).
  The Tab keymap was extracted from `WysiwygEditor.vue` to
  `src/prosemirror/tabKeymap.js` to make it importable. CodeMirror's
  `indentWithTab` is untested beyond wiring — it's library behavior.
- **Rust — `cargo test`** (6 tests): the draft read/write/delete helpers
  and `list_markdown_siblings` against `tempfile` dirs (commands were
  refactored to thin `AppHandle` wrappers over pure `&Path` functions), a
  read/write roundtrip, and `should_flush_before_exit` — the predicate
  extracted from the `ExitRequested` handler, guarding the
  windowless-zombie regression.
- **Not automated**: window-geometry persistence (the plugin's own tested
  behavior) and true end-to-end of the red close button / Cmd+Q roundtrip —
  Tauri's WebDriver has no WKWebView driver on macOS. Those stay manual
  smoke-test items.

## Release (v1.1.0)

Version bumped to `1.1.0` in `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json`; signed + notarized build via
`pnpm exec tauri build` (notarization accepted, ticket stapled, verified
with `spctl`/`stapler validate`); released on GitHub as draft `v1.1.0`
with `ESCribir_1.1.0_aarch64.dmg` attached, matching the v1.0.0 pattern.

## Deliberate non-goals

Called out explicitly during brainstorming so they don't get "fixed" later
by mistake:

- No wikilink / cross-file linking — "keep it simple."
- No persistent sidebar or file list of any kind.
- No typewriter scrolling, focus/dim mode, or word count — considered and
  explicitly not selected as distraction-free features.
- No native OS fullscreen — chrome-hiding is automatic and windowed, not
  tied to fullscreen.
