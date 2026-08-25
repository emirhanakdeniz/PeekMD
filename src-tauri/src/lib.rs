mod commands;
use commands::{
    get_initial_document, load_preferences, open_document, open_relative_document, pick_document,
    resolve_local_asset, save_preferences,
};
use tauri::Manager;
use tauri_plugin_window_state::{StateFlags, WindowExt};

#[cfg(target_os = "windows")]
fn ensure_windows_file_icon_associations(app_handle: &tauri::AppHandle) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().unwrap_or(std::path::Path::new(""));
        let local_ico = exe_dir.join("document.ico");
        let resource_ico = app_handle
            .path()
            .resolve("icons/document.ico", tauri::path::BaseDirectory::Resource)
            .ok();

        let target_ico = if local_ico.exists() {
            Some(local_ico)
        } else if let Some(ref r_ico) = resource_ico {
            if r_ico.exists() {
                Some(r_ico.clone())
            } else {
                None
            }
        } else {
            None
        };

        if let Some(ico) = target_ico {
            let ico_str = format!("{},0", ico.display());
            let exe_str = format!("\"{}\" \"%1\"", exe_path.display());

            let commands = [
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\PeekMD.md",
                    "/ve",
                    "/d",
                    "Markdown Document",
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\PeekMD.md\\DefaultIcon",
                    "/ve",
                    "/d",
                    &ico_str,
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\PeekMD.md\\shell\\open\\command",
                    "/ve",
                    "/d",
                    &exe_str,
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\PeekMD.markdown",
                    "/ve",
                    "/d",
                    "Markdown Document",
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\PeekMD.markdown\\DefaultIcon",
                    "/ve",
                    "/d",
                    &ico_str,
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\PeekMD.markdown\\shell\\open\\command",
                    "/ve",
                    "/d",
                    &exe_str,
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\.md\\OpenWithProgids",
                    "/v",
                    "PeekMD.md",
                    "/t",
                    "REG_SZ",
                    "/d",
                    "",
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\.markdown\\OpenWithProgids",
                    "/v",
                    "PeekMD.md",
                    "/t",
                    "REG_SZ",
                    "/d",
                    "",
                    "/f",
                ],
                vec![
                    "add",
                    "HKCU\\Software\\Classes\\Applications\\PeekMD.exe\\DefaultIcon",
                    "/ve",
                    "/d",
                    &ico_str,
                    "/f",
                ],
            ];

            for args in commands {
                let _ = std::process::Command::new("reg")
                    .args(&args)
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_filename("window-state.json")
                .build(),
        )
        .setup(|app| {
            #[cfg(target_os = "windows")]
            ensure_windows_file_icon_associations(app.handle());

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.restore_state(StateFlags::all());
                let _ = window.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_document,
            pick_document,
            open_document,
            open_relative_document,
            resolve_local_asset,
            load_preferences,
            save_preferences
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                window.app_handle().exit(0);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            app_handle.exit(0);
        }
    });
}
