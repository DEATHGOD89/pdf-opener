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

fn main() {
    env_logger::init();

    #[cfg(target_os = "windows")]
    register_pdf_association();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_cli_args,
            read_file_binary,
            write_file_binary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
