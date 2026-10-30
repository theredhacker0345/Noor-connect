// Wall-clock helpers for prayer times of a location whose timezone differs
// from the device's. Aladhan returns "HH:MM" strings in the *location's*
// timezone; parsing them with device-local setHours() shifts alarms,
// countdowns and schedules by the timezone difference for users who select a
// remote city. These helpers interpret "HH:MM" as wall clock in a given IANA
// timezone and fall back to device-local semantics when none is available.

function zonedParts(date: Date, timeZone: string): { y: number; m: number; d: number; minutes: number } {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
    const parts: Record<string, string> = {};
    for (const p of dtf.formatToParts(date)) {
        if (p.type !== 'literal') parts[p.type] = p.value;
    }
    return {
        y: +parts.year,
        m: +parts.month,
        d: +parts.day,
        minutes: +parts.hour * 60 + +parts.minute,
    };
}

/** UTC offset (ms) of `timeZone` at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
    const p = zonedParts(instant, timeZone);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, Math.floor(p.minutes / 60), p.minutes % 60, instant.getUTCSeconds(), instant.getUTCMilliseconds());
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Absolute instant at which the wall clock in `timeZone` reads `hhmm` on the
 * civil date that `dayBase` maps to in that timezone.
 * With no `timeZone` (or an invalid one) this degrades to device-local
 * `setHours()` behaviour, matching the historical semantics.
 */
export function zonedWallTimeToDate(hhmm: string, timeZone: string | undefined, dayBase: Date = new Date()): Date {
    const [h, m] = hhmm.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) {
        throw new Error(`Invalid time string "${hhmm}"`);
    }
    if (!timeZone) {
        const d = new Date(dayBase);
        d.setHours(h, m, 0, 0);
        return d;
    }

    // The civil date is the wall date of dayBase in the target timezone.
    const { y, m: month, d: day } = zonedParts(dayBase, timeZone);
    const wallAsUtc = Date.UTC(y, month - 1, day, h, m);

    // Convert wall→UTC; refine once for the rare DST-transition straddle.
    let instant = wallAsUtc - tzOffsetMs(new Date(wallAsUtc), timeZone);
    instant = wallAsUtc - tzOffsetMs(new Date(instant), timeZone);
    return new Date(instant);
}

/** Current wall clock in `timeZone` as "HH:MM" (device-local when no zone). */
export function zonedNowHhmm(timeZone: string | undefined, now: Date = new Date()): string {
    if (!timeZone) {
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    const { minutes } = zonedParts(now, timeZone);
    return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}
