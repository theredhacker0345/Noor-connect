// Prevents an extra console window on Windows in debug builds — harmless on Linux.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use noor_connect::adhan_scheduler::{self, AdhanAlarm};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Headless maintenance modes — used for testing the scheduler without a
    // GUI session: noor-connect --schedule-test '<json>', --clear-adhan,
    // --version.
    if args.len() >= 3 && args[1] == "--schedule-test" {
        // Payload can be inline JSON or "@file" (audio base64 exceeds argv limits).
        let payload = if args[2].starts_with('@') {
            std::fs::read_to_string(&args[2][1..]).expect("failed to read alarms file")
        } else {
            args[2].clone()
        };
        let alarms: Vec<AdhanAlarm> =
            serde_json::from_str(&payload).expect("invalid alarms JSON");
        let result = adhan_scheduler::schedule_alarms(&alarms);
        println!("{}", serde_json::to_string(&result).expect("serialize"));
        return;
    }
    if args.len() >= 2 && args[1] == "--clear-adhan" {
        let result = adhan_scheduler::clear_alarms();
        println!("{}", serde_json::to_string(&result).expect("serialize"));
        return;
    }
    if args.len() >= 2 && args[1] == "--version" {
        println!("Noor Connect {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    noor_connect::run();
}
