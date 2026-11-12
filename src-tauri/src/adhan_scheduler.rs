//! Linux adhan scheduler — systemd user timers.
//!
//! The webview computes prayer times and calls `schedule_adhan_alarms` with
//! one entry per prayer (absolute local time as an OnCalendar string plus the
//! adhan audio, base64-encoded from the app's embedded assets). This module
//! writes systemd **user** units (no root needed), reloads the daemon and
//! enables the timers — so the adhan fires while the app is closed, survives
//! reboots, and uses the same native mechanism every Linux desktop already
//! trusts. Regeneration replaces the previous set wholesale.

use std::fs;
use std::path::PathBuf;
use std::process::Command;

use serde::{Deserialize, Serialize};

const UNIT_DIR_SUFFIX: &str = ".config/systemd/user";
const DATA_DIR_SUFFIX: &str = ".local/share/NoorConnect/adhan";
const UNIT_PREFIX: &str = "noor-adhan-";

#[derive(Debug, Deserialize)]
pub struct AdhanAlarm {
    /// "Fajr", "Dhuhr", … (used in descriptions and the audio filename)
    pub name: String,
    /// Absolute instant, pre-formatted in the SYSTEM timezone for OnCalendar:
    /// "2026-11-12 05:14:00"
    pub at: String,
    /// base64-encoded adhan audio (mp3) fetched from the app's assets
    pub audio: String,
    /// audio extension, e.g. "mp3"
    pub ext: String,
}

#[derive(Debug, Serialize)]
pub struct ScheduleResult {
    pub scheduled: usize,
    pub cleared: usize,
    pub daemon_reload_ok: bool,
    pub errors: Vec<String>,
}

fn home_dir() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/root".into()))
}

fn unit_dir() -> PathBuf {
    let mut p = home_dir();
    p.push(UNIT_DIR_SUFFIX);
    p
}

fn audio_dir() -> PathBuf {
    let mut p = home_dir();
    p.push(DATA_DIR_SUFFIX);
    p
}

/// Safe slug for unit filenames: lowercase, alphanumerics only.
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

/// Minimal base64 decoder (standard alphabet, ignores padding/whitespace).
fn base64_decode(input: &str) -> Vec<u8> {
    const TABLE: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    fn val(c: u8) -> Option<u32> {
        TABLE.iter().position(|&t| t == c).map(|p| p as u32)
    }
    let bytes: Vec<u8> = input
        .bytes()
        .filter(|b| !b.is_ascii_whitespace() && *b != b'=')
        .collect();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    for chunk in bytes.chunks(4) {
        let mut buf: u32 = 0;
        for (i, &c) in chunk.iter().enumerate() {
            if let Some(v) = val(c) {
                buf |= v << (18 - 6 * i);
            }
        }
        match chunk.len() {
            4 => {
                out.push((buf >> 16) as u8);
                out.push((buf >> 8) as u8);
                out.push(buf as u8);
            }
            3 => {
                out.push((buf >> 16) as u8);
                out.push((buf >> 8) as u8);
            }
            2 => {
                out.push((buf >> 16) as u8);
            }
            _ => {}
        }
    }
    out
}

pub fn service_unit(name: &str, date: &str, time: &str, audio_path: &str) -> String {
    format!(
        "[Unit]\n\
         Description=Noor Connect Adhan - {name} ({date} {time})\n\n\
         [Service]\n\
         Type=oneshot\n\
         ExecStart=/usr/bin/mpv --really-quiet --no-video \"{audio_path}\"\n",
        name = name,
        date = date,
        time = time,
        audio_path = audio_path
    )
}

pub fn timer_unit(name: &str, date: &str, time: &str, unit_name: &str) -> String {
    format!(
        "[Unit]\n\
         Description=Noor Connect Adhan timer - {name} ({date} {time})\n\n\
         [Timer]\n\
         OnCalendar={date} {time}\n\
         Persistent=true\n\
         Unit={unit_name}\n\n\
         [Install]\n\
         WantedBy=timers.target\n",
        name = name,
        date = date,
        time = time,
        unit_name = unit_name
    )
}

fn systemctl_user(args: &[&str]) -> bool {
    Command::new("systemctl")
        .arg("--user")
        .args(args)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Remove every previous noor-adhan unit (files + enabled timer links).
fn clear_stale_units() -> usize {
    let dir = unit_dir();
    let mut cleared = 0;
    if let Ok(entries) = fs::read_dir(&dir) {
        let stale: Vec<PathBuf> = entries
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| {
                p.file_name()
                    .map(|n| n.to_string_lossy().starts_with(UNIT_PREFIX))
                    .unwrap_or(false)
            })
            .collect();
        for p in &stale {
            if p.extension().map(|e| e == "timer").unwrap_or(false) {
                if let Some(n) = p.file_name().and_then(|n| n.to_str()) {
                    systemctl_user(&["disable", "--now", n]);
                }
            }
            if fs::remove_file(p).is_ok() {
                cleared += 1;
            }
        }
    }
    cleared
}

/// Core scheduler — shared by the Tauri command and the CLI test mode.
pub fn schedule_alarms(alarms: &[AdhanAlarm]) -> ScheduleResult {
    let mut errors: Vec<String> = Vec::new();
    let cleared = clear_stale_units();

    let dir = unit_dir();
    if let Err(e) = fs::create_dir_all(&dir) {
        errors.push(format!("unit dir: {e}"));
        return ScheduleResult { scheduled: 0, cleared, daemon_reload_ok: false, errors };
    }
    let adir = audio_dir();
    if let Err(e) = fs::create_dir_all(&adir) {
        errors.push(format!("audio dir: {e}"));
        return ScheduleResult { scheduled: 0, cleared, daemon_reload_ok: false, errors };
    }

    let mut scheduled = 0;
    let mut enabled_timers: Vec<String> = Vec::new();

    for alarm in alarms {
        let slug = slugify(&alarm.name);
        let compact_date: String = alarm.at.chars().take(10).filter(|c| *c != '-').collect();
        let time_of_day = alarm.at.get(11..19).unwrap_or("00:00:00").to_string();
        let compact_time: String = time_of_day.replace(':', "");
        let unit_base = format!("{UNIT_PREFIX}{slug}-{compact_date}-{compact_time}");
        let audio_name = format!("{slug}.{}", alarm.ext);

        // Audio file: write only when changed (avoids rewriting MBs daily).
        let audio_path = adir.join(&audio_name);
        let decoded = base64_decode(&alarm.audio);
        let needs_write = match fs::read(&audio_path) {
            Ok(existing) => existing != decoded,
            Err(_) => true,
        };
        if needs_write {
            if let Err(e) = fs::write(&audio_path, &decoded) {
                errors.push(format!("audio {}: {e}", alarm.name));
                continue;
            }
        }

        let svc_name = format!("{unit_base}.service");
        let timer_name = format!("{unit_base}.timer");
        if let Err(e) = fs::write(dir.join(&svc_name), service_unit(&alarm.name, &alarm.at[..10], &time_of_day, &audio_path.to_string_lossy()))
        {
            errors.push(format!("write {svc_name}: {e}"));
            continue;
        }
        if let Err(e) = fs::write(dir.join(&timer_name), timer_unit(&alarm.name, &alarm.at[..10], &time_of_day, &svc_name))
        {
            errors.push(format!("write {timer_name}: {e}"));
            continue;
        }
        enabled_timers.push(timer_name);
        scheduled += 1;
    }

    let daemon_reload_ok = systemctl_user(&["daemon-reload"]);
    for t in &enabled_timers {
        systemctl_user(&["enable", "--now", t]);
    }

    ScheduleResult { scheduled, cleared, daemon_reload_ok, errors }
}

pub fn clear_alarms() -> ScheduleResult {
    let cleared = clear_stale_units();
    let ok = systemctl_user(&["daemon-reload"]);
    ScheduleResult { scheduled: 0, cleared, daemon_reload_ok: ok, errors: Vec::new() }
}

#[tauri::command]
pub fn schedule_adhan_alarms(alarms: Vec<AdhanAlarm>) -> ScheduleResult {
    schedule_alarms(&alarms)
}

#[tauri::command]
pub fn clear_adhan_alarms() -> ScheduleResult {
    clear_alarms()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_AUDIO: &str = "SGVsbG8gQWRoYW4="; // "Hello Adhan"

    fn sample_alarm(name: &str, at: &str) -> AdhanAlarm {
        AdhanAlarm {
            name: name.into(),
            at: at.into(),
            audio: SAMPLE_AUDIO.into(),
            ext: "mp3".into(),
        }
    }

    #[test]
    fn slugify_strips_non_alphanumeric() {
        assert_eq!(slugify("Al-Fajr Adhān!"), " AlfajrAdhn".trim().to_lowercase().replace(' ', ""));
        assert_eq!(slugify("Fajr"), "fajr");
        assert_eq!(slugify("Maghrib 2"), "maghrib2");
    }

    #[test]
    fn base64_decodes_standard_payloads() {
        assert_eq!(base64_decode("SGVsbG8gQWRoYW4="), b"Hello Adhan");
        assert_eq!(base64_decode("SGVsbG8="), b"Hello");
        assert_eq!(base64_decode("YQ=="), b"a"); // 1-char payload
    }

    #[test]
    fn service_unit_contains_exec_and_description() {
        let s = service_unit("Fajr", "2026-11-12", "05:14:00", "/home/u/.local/share/NoorConnect/adhan/fajr.mp3");
        assert!(s.contains("Description=Noor Connect Adhan - Fajr (2026-11-12 05:14:00)"));
        assert!(s.contains("ExecStart=/usr/bin/mpv --really-quiet --no-video \"/home/u/.local/share/NoorConnect/adhan/fajr.mp3\""));
        assert!(s.starts_with("[Unit]"));
        assert!(s.contains("[Service]"));
        assert!(s.contains("Type=oneshot"));
    }

    #[test]
    fn timer_unit_points_to_service_and_uses_oncalendar() {
        let s = timer_unit("Fajr", "2026-11-12", "05:14:00", "noor-adhan-fajr-20261112-051400.service");
        
        assert!(s.contains("OnCalendar=2026-11-12 05:14:00"));
        assert!(s.contains("Unit=noor-adhan-fajr-20261112-051400.service"));
        assert!(s.contains("Persistent=true"));
        assert!(s.contains("WantedBy=timers.target"));
    }
}
