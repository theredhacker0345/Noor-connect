// Prevents an extra console window on Windows in debug builds — harmless on Linux.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    noor_connect::run();
}
