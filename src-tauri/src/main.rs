#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use mimalloc::MiMalloc;

#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    std::env::args().collect()
}

#[tauri::command]
fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
fn write_file_binary(path: String, contents: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[cfg(target_os = "windows")]
fn register_pdf_association() {
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_str = exe_path.to_string_lossy();
        let cmd = format!("\"{}\" \"%1\"", exe_str);
        let icon_cmd = format!("\"{}\",0", exe_str);

        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\Applications\\pdf-opener-pro.exe\\shell\\open\\command", "/ve", "/t", "REG_SZ", "/d", &cmd, "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\Applications\\pdf-opener-pro.exe\\SupportedTypes", "/v", ".pdf", "/t", "REG_SZ", "/d", "", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\Applications\\pdf-opener-pro.exe\\DefaultIcon", "/ve", "/t", "REG_SZ", "/d", &icon_cmd, "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }
}

#[cfg(target_os = "windows")]
fn setup_webview2_user_data() {
    if std::env::var_os("WEBVIEW2_USER_DATA_FOLDER").is_none() {
        let base = std::env::var("LOCALAPPDATA")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|_| std::env::temp_dir());
        let pid = std::process::id();
        let app_dir = base.join("pdf-opener-pro").join("instances").join(format!("inst_{}", pid));
        let _ = std::fs::create_dir_all(&app_dir);
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", &app_dir);

        // Clean up previous closed instance folders
        let instances_root = base.join("pdf-opener-pro").join("instances");
        if let Ok(entries) = std::fs::read_dir(&instances_root) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let path = entry.path();
                        if path != app_dir {
                            let _ = std::fs::remove_dir_all(&path);
                        }
                    }
                }
            }
        }
    }
}

fn main() {
    env_logger::init();

    #[cfg(target_os = "windows")]
    {
        setup_webview2_user_data();
        register_pdf_association();
    }

    if let Err(e) = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_cli_args,
            read_file_binary,
            write_file_binary
        ])
        .run(tauri::generate_context!())
    {
        log::error!("Error while running tauri application: {}", e);
    }
}
