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

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_cli_args])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
