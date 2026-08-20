use serde::Serialize;
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager, Window};

pub const MAX_DOCUMENT_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OpenedDocument {
    pub path: String,
    pub filename: String,
    pub content: String,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct DocumentError {
    pub code: &'static str,
    pub message: String,
}

impl DocumentError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| matches!(value.to_ascii_lowercase().as_str(), "md" | "markdown"))
}

fn normalized_path(path: &Path) -> String {
    let value = path.to_string_lossy();
    value.strip_prefix(r"\\?\").unwrap_or(&value).to_string()
}

pub fn read_document(path: &Path) -> Result<OpenedDocument, DocumentError> {
    if !is_markdown(path) {
        return Err(DocumentError::new(
            "unsupported_type",
            "PeekMD can only open .md and .markdown files.",
        ));
    }
    let metadata = fs::metadata(path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            DocumentError::new("not_found", "The Markdown file no longer exists.")
        } else {
            DocumentError::new(
                "read_failed",
                format!("The document could not be read: {error}"),
            )
        }
    })?;
    if !metadata.is_file() {
        return Err(DocumentError::new(
            "read_failed",
            "The selected path is not a file.",
        ));
    }
    if metadata.len() > MAX_DOCUMENT_BYTES {
        return Err(DocumentError::new(
            "too_large",
            "This document is larger than the 5 MiB limit.",
        ));
    }

    let mut bytes = Vec::with_capacity(metadata.len() as usize);
    fs::File::open(path)
        .and_then(|file| file.take(MAX_DOCUMENT_BYTES + 1).read_to_end(&mut bytes))
        .map_err(|error| {
            DocumentError::new(
                "read_failed",
                format!("The document could not be read: {error}"),
            )
        })?;
    if bytes.len() as u64 > MAX_DOCUMENT_BYTES {
        return Err(DocumentError::new(
            "too_large",
            "This document is larger than the 5 MiB limit.",
        ));
    }
    let content = String::from_utf8(bytes).map_err(|_| {
        DocumentError::new("invalid_utf8", "This document is not valid UTF-8 text.")
    })?;
    let canonical = path.canonicalize().map_err(|error| {
        DocumentError::new(
            "read_failed",
            format!("The document path could not be resolved: {error}"),
        )
    })?;
    Ok(OpenedDocument {
        path: normalized_path(&canonical),
        filename: canonical
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Untitled.md")
            .to_string(),
        size_bytes: metadata.len(),
        content,
    })
}

async fn load_document(window: Window, path: PathBuf) -> Result<OpenedDocument, DocumentError> {
    let document = tauri::async_runtime::spawn_blocking(move || read_document(&path))
        .await
        .map_err(|error| {
            DocumentError::new("read_failed", format!("The document task failed: {error}"))
        })??;
    let _ = window.set_title(&format!("{} — PeekMD", document.filename));
    Ok(document)
}

#[tauri::command]
pub async fn get_initial_document(window: Window) -> Result<Option<OpenedDocument>, DocumentError> {
    let path = std::env::args_os().skip(1).find_map(|argument| {
        let path = PathBuf::from(argument);
        (!path.to_string_lossy().starts_with('-')).then_some(path)
    });
    match path {
        Some(path) => load_document(window, path).await.map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn pick_document(window: Window) -> Result<Option<OpenedDocument>, DocumentError> {
    let path = tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter("Markdown files", &["md", "markdown"])
            .pick_file()
    })
    .await
    .map_err(|error| {
        DocumentError::new("read_failed", format!("The file picker failed: {error}"))
    })?;
    match path {
        Some(path) => load_document(window, path).await.map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn open_document(window: Window, path: String) -> Result<OpenedDocument, DocumentError> {
    load_document(window, path.into()).await
}

fn split_href(href: &str) -> (&str, Option<&str>) {
    href.split_once('#')
        .map_or((href, None), |(path, fragment)| (path, Some(fragment)))
}

#[tauri::command]
pub async fn open_relative_document(
    window: Window,
    base_path: String,
    href: String,
) -> Result<OpenedDocument, DocumentError> {
    let (relative, _) = split_href(&href);
    if relative.is_empty() || Path::new(relative).is_absolute() || relative.contains('\0') {
        return Err(DocumentError::new(
            "invalid_link",
            "This local document link is not valid.",
        ));
    }
    let base = PathBuf::from(base_path);
    let parent = base.parent().ok_or_else(|| {
        DocumentError::new("invalid_link", "The current document has no parent folder.")
    })?;
    load_document(window, parent.join(relative)).await
}

#[tauri::command]
pub async fn resolve_local_asset(
    app: AppHandle,
    document_path: String,
    source: String,
) -> Result<String, DocumentError> {
    let (relative, _) = split_href(&source);
    if relative.is_empty() || Path::new(relative).is_absolute() || relative.contains('\0') {
        return Err(DocumentError::new(
            "invalid_link",
            "This local image path is not valid.",
        ));
    }
    let base = PathBuf::from(document_path);
    let parent = base.parent().ok_or_else(|| {
        DocumentError::new("invalid_link", "The current document has no parent folder.")
    })?;
    let asset = parent.join(relative).canonicalize().map_err(|_| {
        DocumentError::new(
            "not_found",
            "A local image referenced by this document was not found.",
        )
    })?;
    if !asset.is_file() {
        return Err(DocumentError::new(
            "not_found",
            "A local image referenced by this document was not found.",
        ));
    }
    app.asset_protocol_scope()
        .allow_file(&asset)
        .map_err(|error| {
            DocumentError::new(
                "read_failed",
                format!("The image could not be made available: {error}"),
            )
        })?;
    Ok(normalized_path(&asset))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn isolated_dir() -> PathBuf {
        let id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("peekmd-{id}"));
        fs::create_dir(&path).unwrap();
        path
    }

    #[test]
    fn accepts_supported_extensions_case_insensitively_and_empty_documents() {
        for name in ["README.MD", "notes.MarkDown"] {
            let dir = isolated_dir();
            let path = dir.join(name);
            fs::write(&path, b"").unwrap();
            let document = read_document(&path).unwrap();
            assert_eq!(document.content, "");
            assert_eq!(document.size_bytes, 0);
            fs::remove_dir_all(dir).unwrap();
        }
    }

    #[test]
    fn rejects_unsupported_missing_and_invalid_utf8_files() {
        let dir = isolated_dir();
        let text = dir.join("notes.txt");
        fs::write(&text, b"hello").unwrap();
        assert_eq!(read_document(&text).unwrap_err().code, "unsupported_type");
        assert_eq!(
            read_document(&dir.join("missing.md")).unwrap_err().code,
            "not_found"
        );
        let invalid = dir.join("invalid.md");
        fs::write(&invalid, [0xff, 0xfe]).unwrap();
        assert_eq!(read_document(&invalid).unwrap_err().code, "invalid_utf8");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn enforces_the_five_mib_boundary() {
        let dir = isolated_dir();
        let exact = dir.join("exact.md");
        fs::write(&exact, vec![b'a'; MAX_DOCUMENT_BYTES as usize]).unwrap();
        assert_eq!(
            read_document(&exact).unwrap().size_bytes,
            MAX_DOCUMENT_BYTES
        );
        let large = dir.join("large.md");
        fs::write(&large, vec![b'a'; MAX_DOCUMENT_BYTES as usize + 1]).unwrap();
        assert_eq!(read_document(&large).unwrap_err().code, "too_large");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn preserves_unicode_paths_and_splits_relative_fragments() {
        let dir = isolated_dir();
        let path = dir.join("Türkçe 🚀.markdown");
        fs::write(&path, "# Başlık").unwrap();
        let document = read_document(&path).unwrap();
        assert_eq!(document.filename, "Türkçe 🚀.markdown");
        assert!(document.path.ends_with("Türkçe 🚀.markdown"));
        assert_eq!(
            split_href("../guide/readme.md#setup"),
            ("../guide/readme.md", Some("setup"))
        );
        fs::remove_dir_all(dir).unwrap();
    }
}
