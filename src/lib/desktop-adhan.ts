/**
 * desktop-adhan.ts — Linux adhan scheduler for the Tauri desktop build.
 *
 * The Android app schedules adhan alarms through the NativeAdhanScheduler;
 * on Linux the equivalent native mechanism is **systemd user timers**, which
 * fire while the app is closed, survive reboots and need no root. The webview
 * computes prayer times (same timezone-correct code as everywhere else) and
 * hands them to a Rust command that writes
 * ~/.config/systemd/user/noor-adhan-*.timer/.service units playing the
 * bundled adhan audio via mpv.
 *
 * Regeneration policy mirrors the Android scheduler: the next 7 days are
 * scheduled, and every app start (or adhan-settings change) replaces the
 * previous set wholesale.
 */

const SCHEDULE_WINDOW_DAYS = 7;
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const PRAYER_TOGGLE_MAP: Record<string, "fajrEnabled" | "dhuhrEnabled" | "asrEnabled" | "maghribEnabled" | "ishaEnabled"> = {
  Fajr: "fajrEnabled",
  Dhuhr: "dhuhrEnabled",
  Asr: "asrEnabled",
  Maghrib: "maghribEnabled",
  Isha: "ishaEnabled",
};
const PRAYER_AUDIO: Record<string, string> = {
  Fajr: "/audio/adhan-fajr.mp3",
  Dhuhr: "/audio/adhan-classic.mp3",
  Asr: "/audio/adhan-classic.mp3",
  Maghrib: "/audio/adhan-makkah.mp3",
  Isha: "/audio/adhan-madinah.mp3",
};
const SIGNATURE_KEY = "desktop-adhan-signature";
const ADHAN_ALARM_ENABLED_KEY = "prayer-alarm-enabled";

export function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Format an instant in the SYSTEM timezone as OnCalendar-compatible text. */
function systemLocalCalendarString(d: Date): string {
  // 'sv-SE' yields ISO-like "2026-11-12 05:14:00" — exactly what systemd wants.
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function signatureFor(alarms: { name: string; at: string }[]): string {
  return alarms.map(a => `${a.name}:${a.at}`).join("|");
}

/**
 * Schedule the next 7 days of adhan alarms as systemd user timers.
 * Returns null on non-Tauri environments; a result object on Tauri.
 */
export async function scheduleDesktopAdhan(): Promise<{ scheduled: number; errors?: string[] } | null> {
  if (!isTauriDesktop()) return null;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const { adhanService } = await import("./adhan-service");
    const { getEffectiveAladhanMethodId } = await import("./prayer-method-resolver");
    const { AladhanAPI } = await import("./aladhan-api");
    const { zonedWallTimeToDate } = await import("./tz-time");

    const config = adhanService.getAdhanConfig();

    const locationRaw = localStorage.getItem("location-storage");
    const location = locationRaw ? JSON.parse(locationRaw) : null;
    if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      return null; // no location — can't compute prayer times yet
    }

    const now = new Date();

    const alarms: { name: string; at: string; audio: string; ext: string }[] = [];
    const audioCache = new Map<string, string>();

    for (let dayOffset = 0; dayOffset < SCHEDULE_WINDOW_DAYS; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      let dayData = AladhanAPI.getPrayerTimesForDate(targetDate, location.latitude, location.longitude);
      if (!dayData) {
        try {
          await AladhanAPI.fetchMonthlyCalendar(
            location.latitude,
            location.longitude,
            targetDate.getFullYear(),
            targetDate.getMonth() + 1,
            getEffectiveAladhanMethodId(location.latitude, location.longitude),
            getMadhab() === "hanafi" ? 1 : 0,
          );
          dayData = AladhanAPI.getPrayerTimesForDate(targetDate, location.latitude, location.longitude);
        } catch { /* offline + no cache — skip this day */ }
      }
      if (!dayData) continue;

      for (const prayer of PRAYERS) {
        const toggleKey = PRAYER_TOGGLE_MAP[prayer];
        if (toggleKey && !config[toggleKey]) continue;

        const rawTime = dayData.timings[prayer];
        if (!rawTime) continue;
        const cleaned = rawTime.replace(/\s*\(.*?\)\s*/g, "").trim();
        const prayerDate = zonedWallTimeToDate(cleaned, location.timeZone, targetDate);
        if (prayerDate <= now) continue;

        const audioPath = PRAYER_AUDIO[prayer] || "/audio/adhan-classic.mp3";
        let audioB64 = audioCache.get(audioPath);
        if (!audioB64) {
          const resp = await fetch(audioPath);
          if (!resp.ok) continue;
          audioB64 = arrayBufferToBase64(await resp.arrayBuffer());
          audioCache.set(audioPath, audioB64);
        }

        alarms.push({
          name: prayer,
          at: systemLocalCalendarString(prayerDate),
          audio: audioB64,
          ext: "mp3",
        });
      }
    }

    if (alarms.length === 0) {
      await invoke("clear_adhan_alarms");
      return { scheduled: 0 };
    }

    const result = await invoke<{ scheduled: number; errors?: string[] }>(
      "schedule_adhan_alarms",
      { alarms },
    );
    return result;
  } catch (error) {
    console.warn("[desktop-adhan] scheduling failed:", error);
    return null;
  }
}

/** Startup hook with a change-signature guard — safe to call often. */
export async function scheduleDesktopAdhanIfChanged(): Promise<void> {
  if (!isTauriDesktop()) return;
  if (localStorage.getItem(ADHAN_ALARM_ENABLED_KEY) === "false") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_adhan_alarms");
    } catch { /* ignore */ }
    return;
  }

  try {
    const { getAdhanService } = await import("./adhan-service");
    const { AladhanAPI } = await import("./aladhan-api");
    const config = getAdhanService().getAdhanConfig();
    const locationRaw = localStorage.getItem("location-storage");
    const now = new Date();
    const dayData = locationRaw
      ? AladhanAPI.getPrayerTimesForDate(now, JSON.parse(locationRaw).latitude, JSON.parse(locationRaw).longitude)
      : null;
    const times = dayData
      ? ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map(p => {
          const raw = dayData.timings[p]?.replace(/\s*\(.*?\)\s*/g, "").trim() || "";
          return `${p}=${raw}`;
        }).join("|")
      : "no-location";
    const sig = `${config.fajrEnabled}${config.dhuhrEnabled}${config.asrEnabled}${config.maghribEnabled}${config.ishaEnabled}|${times}|${now.toDateString()}`;
    if (localStorage.getItem(SIGNATURE_KEY) === sig) return;
    localStorage.setItem(SIGNATURE_KEY, sig);
  } catch { /* signature is best-effort */ }

  await scheduleDesktopAdhan();
}
