use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Emitter, Manager, RunEvent};

static EXIT_FLUSHED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_markdown_siblings(path: String) -> Result<Vec<String>, String> {
    let dir = Path::new(&path).parent().ok_or("no parent directory")?;
    let mut files: Vec<String> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|p| p.extension().is_some_and(|ext| ext == "md"))
        .filter_map(|p| p.to_str().map(String::from))
        .collect();
    files.sort();
    Ok(files)
}

fn draft_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("untitled-draft.md"))
}

fn read_draft_file(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(s) => Ok(s),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

fn write_draft_file(path: &Path, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}

fn delete_draft_file(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn read_draft(app: tauri::AppHandle) -> Result<String, String> {
    read_draft_file(&draft_path(&app)?)
}

#[tauri::command]
fn write_draft(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    write_draft_file(&draft_path(&app)?, &contents)
}

#[tauri::command]
fn delete_draft(app: tauri::AppHandle) -> Result<(), String> {
    delete_draft_file(&draft_path(&app)?)
}

fn should_flush_before_exit(exit_flushed: bool, has_windows: bool) -> bool {
    !exit_flushed && has_windows
}

#[tauri::command]
fn finish_exit(app: tauri::AppHandle) {
    EXIT_FLUSHED.store(true, Ordering::SeqCst);
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            list_markdown_siblings,
            read_draft,
            write_draft,
            delete_draft,
            finish_exit
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { api, .. } = event {
            if !should_flush_before_exit(
                EXIT_FLUSHED.load(Ordering::SeqCst),
                !app_handle.webview_windows().is_empty(),
            ) {
                return;
            }
            api.prevent_exit();
            let _ = app_handle.emit("flush-before-exit", ());
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_only_markdown_files_sorted() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("b.md"), "").unwrap();
        fs::write(dir.path().join("a.md"), "").unwrap();
        fs::write(dir.path().join("c.txt"), "").unwrap();
        fs::create_dir(dir.path().join("nested")).unwrap();
        fs::write(dir.path().join("nested/d.md"), "").unwrap();

        let result =
            list_markdown_siblings(dir.path().join("a.md").to_string_lossy().into_owned()).unwrap();

        assert_eq!(
            result,
            vec![
                dir.path().join("a.md").to_string_lossy().into_owned(),
                dir.path().join("b.md").to_string_lossy().into_owned(),
            ]
        );
    }

    #[test]
    fn read_missing_draft_is_empty_not_an_error() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("draft.md");
        assert_eq!(read_draft_file(&path).unwrap(), "");
    }

    #[test]
    fn draft_roundtrips() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("draft.md");
        write_draft_file(&path, "# draft").unwrap();
        assert_eq!(read_draft_file(&path).unwrap(), "# draft");
    }

    #[test]
    fn deleting_a_draft_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("draft.md");
        delete_draft_file(&path).unwrap();
        write_draft_file(&path, "x").unwrap();
        delete_draft_file(&path).unwrap();
        assert!(!path.exists());
        delete_draft_file(&path).unwrap();
    }

    #[test]
    fn write_then_read_file_roundtrips() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("note.md").to_string_lossy().into_owned();
        write_file(p.clone(), "hello".into()).unwrap();
        assert_eq!(read_file(p).unwrap(), "hello");
    }

    #[test]
    fn exit_is_intercepted_only_with_windows_and_no_prior_flush() {
        assert!(should_flush_before_exit(false, true));
        assert!(!should_flush_before_exit(true, true));
        assert!(!should_flush_before_exit(false, false));
        assert!(!should_flush_before_exit(true, false));
    }
}
