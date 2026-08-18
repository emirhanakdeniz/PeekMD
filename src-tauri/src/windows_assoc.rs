#[cfg(windows)]
pub fn register_windows_associations() {
    use std::env::current_exe;
    use winreg::enums::*;
    use winreg::RegKey;

    let exe_path = match current_exe() {
        Ok(path) => path.to_string_lossy().to_string(),
        Err(_) => return,
    };

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let classes = match hkcu.open_subkey_with_flags("Software\\Classes", KEY_ALL_ACCESS) {
        Ok(k) => k,
        Err(_) => return,
    };

    let exe_name = "peekmd.exe";
    let app_open_cmd = format!("\"{}\" \"%1\"", exe_path);
    let app_icon = format!("\"{}\",0", exe_path);

    // 1. Register in HKCU\Software\Classes\Applications\peekmd.exe
    if let Ok((app_key, _)) = classes.create_subkey(format!("Applications\\{}", exe_name)) {
        let _ = app_key.set_value("FriendlyAppName", &"PeekMD");

        if let Ok((cmd_key, _)) = app_key.create_subkey("shell\\open\\command") {
            let _ = cmd_key.set_value("", &app_open_cmd);
        }
        if let Ok((icon_key, _)) = app_key.create_subkey("DefaultIcon") {
            let _ = icon_key.set_value("", &app_icon);
        }
        if let Ok((supported_types, _)) = app_key.create_subkey("SupportedTypes") {
            let _ = supported_types.set_value(".md", &"");
            let _ = supported_types.set_value(".markdown", &"");
        }
    }

    // 2. Register in HKCU\Software\Classes\PeekMD.Document ProgID
    if let Ok((prog_key, _)) = classes.create_subkey("PeekMD.Document") {
        let _ = prog_key.set_value("", &"Markdown Document");
        let _ = prog_key.set_value("FriendlyTypeName", &"Markdown Document");

        if let Ok((cmd_key, _)) = prog_key.create_subkey("shell\\open\\command") {
            let _ = cmd_key.set_value("", &app_open_cmd);
        }
        if let Ok((icon_key, _)) = prog_key.create_subkey("DefaultIcon") {
            let _ = icon_key.set_value("", &app_icon);
        }
    }

    // 3. Register OpenWithList and OpenWithProgids for .md and .markdown
    for ext in &[".md", ".markdown"] {
        if let Ok((ext_key, _)) = classes.create_subkey(ext) {
            if let Ok((owl_key, _)) = ext_key.create_subkey(format!("OpenWithList\\{}", exe_name)) {
                let _ = owl_key.set_value("", &"");
            }
            if let Ok((owp_key, _)) = ext_key.create_subkey("OpenWithProgids") {
                let _ = owp_key.set_value("PeekMD.Document", &"");
            }
        }
    }

    // 4. Notify Windows Shell that associations have changed
    unsafe {
        windows_sys::Win32::UI::Shell::SHChangeNotify(
            windows_sys::Win32::UI::Shell::SHCNE_ASSOCCHANGED as i32,
            windows_sys::Win32::UI::Shell::SHCNF_IDLIST,
            std::ptr::null(),
            std::ptr::null(),
        );
    }
}

#[cfg(not(windows))]
pub fn register_windows_associations() {}
