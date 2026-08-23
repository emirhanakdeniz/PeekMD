mod commands;
use commands::{
    get_initial_document, load_preferences, open_document, open_relative_document, pick_document,
    resolve_local_asset, save_preferences,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_filename("window-state.json")
                .build(),
        )
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
