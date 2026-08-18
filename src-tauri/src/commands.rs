use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::Window;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OpenedFile {
    pub path: String,
    pub filename: String,
    pub content: String,
}

fn normalize_path(path: &Path) -> String {
    if let Ok(abs) = std::path::absolute(path) {
        let s = abs.to_string_lossy().to_string();
        if let Some(stripped) = s.strip_prefix(r"\\?\") {
            stripped.to_string()
        } else {
            s
        }
    } else {
        path.to_string_lossy().to_string()
    }
}

pub fn read_markdown_file(path_str: &str) -> Result<OpenedFile, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path_str));
    }
    if !path.is_file() {
        return Err(format!("Path is not a regular file: {}", path_str));
    }

    let filename = path
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled.md".to_string());

    let normalized = normalize_path(path);

    match fs::read_to_string(path) {
        Ok(content) => Ok(OpenedFile {
            path: normalized,
            filename,
            content,
        }),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
pub fn get_initial_file(window: Window) -> Result<Option<OpenedFile>, String> {
    let args: Vec<String> = std::env::args().collect();
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let path = Path::new(arg);
        if path.exists() && path.is_file() {
            let opened = read_markdown_file(arg)?;
            let _ = window.set_title(&format!("{} — PeekMD", opened.filename));
            return Ok(Some(opened));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn open_file(window: Window, path: String) -> Result<OpenedFile, String> {
    let opened = read_markdown_file(&path)?;
    let _ = window.set_title(&format!("{} — PeekMD", opened.filename));
    Ok(opened)
}

#[tauri::command]
pub fn reload_file(window: Window, path: String) -> Result<OpenedFile, String> {
    let opened = read_markdown_file(&path)?;
    let _ = window.set_title(&format!("{} — PeekMD", opened.filename));
    Ok(opened)
}

#[tauri::command]
pub fn pick_and_open_file(window: Window) -> Result<Option<OpenedFile>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown Files (*.md, *.markdown)", &["md", "markdown"])
        .add_filter("All Files (*.*)", &["*"])
        .pick_file();

    if let Some(path) = file {
        let path_str = path.to_string_lossy().to_string();
        let opened = read_markdown_file(&path_str)?;
        let _ = window.set_title(&format!("{} — PeekMD", opened.filename));
        Ok(Some(opened))
    } else {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_read_existing_file() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("test_peekmd_sample.md");
        let mut file = fs::File::create(&file_path).unwrap();
        writeln!(file, "# Hello Test\n\nContent here.").unwrap();

        let result = read_markdown_file(file_path.to_str().unwrap());
        assert!(result.is_ok());
        let opened = result.unwrap();
        assert_eq!(opened.filename, "test_peekmd_sample.md");
        assert!(opened.content.contains("# Hello Test"));

        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_read_file_with_spaces_and_unicode() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("test document 🚀 Türkçe.markdown");
        let mut file = fs::File::create(&file_path).unwrap();
        writeln!(file, "Markdown with unicode: Türkçe karakterler").unwrap();

        let result = read_markdown_file(file_path.to_str().unwrap());
        assert!(result.is_ok());
        let opened = result.unwrap();
        assert_eq!(opened.filename, "test document 🚀 Türkçe.markdown");
        assert!(opened.content.contains("Türkçe karakterler"));

        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_nonexistent_file_returns_error() {
        let result = read_markdown_file("C:\\nonexistent_peekmd_path_12345.md");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File does not exist"));
    }

    #[test]
    fn test_directory_returns_error() {
        let temp_dir = std::env::temp_dir();
        let result = read_markdown_file(temp_dir.to_str().unwrap());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a regular file"));
    }
}
