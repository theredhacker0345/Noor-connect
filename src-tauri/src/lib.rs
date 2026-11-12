pub mod adhan_scheduler;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            adhan_scheduler::schedule_adhan_alarms,
            adhan_scheduler::clear_adhan_alarms
        ])
        .run(tauri::generate_context!())
        .expect("error while running Noor Connect");
}
