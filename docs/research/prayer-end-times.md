# Prayer End Times — Research & Integration Plan

| | |
|---|---|
| **Task ID** | NC-6-b (research subagent) |
| **Repo** | `repo-staging/noor-connect` @ `4229c54` (v2.4.0, React 18 + Vite + TS PWA/Capacitor 6) |
| **Scope** | RESEARCH ONLY. No code changed. Single deliverable: this file. |
| **Question** | "Is it possible that we show the prayer end time? Find if there is an API or any library for it" — for each of Fajr, Dhuhr, Asr, Maghrib, Isha. |

> **Ownership note:** this document was written by the NC-6-b research subagent. Other agents are working in the same repo in parallel; an untracked `src/lib/prayer-display.ts` (shared localized/Arabic prayer-name helpers, `PRAYER_ORDER`, `PRAYER_NAME_I18N_KEYS`) appeared during research and is referenced where relevant.

---

## 1. Executive summary

**Yes — it is possible, and it needs zero new dependencies and zero new network calls.** The app already computes everything needed; it just (a) computes `Isha`'s end incorrectly for the majority of madhabs, (b) has a wrong Islamic-midnight fallback, and (c) renders end times nowhere — the only UI ever written for it (`PrayerCards.tsx`) is orphaned.

**Recommended approach (5 lines):**

1. **Keep Aladhan API as the source of prayer *start* times** (as today); compute *end* times locally in one canonical place — extend `src/lib/prayer-end-times.ts` and have `usePrayerTimes` consume it (today it hand-rolls ends inline).
2. **Fajr→Sunrise, Dhuhr→Asr start, Asr→Maghrib, Maghrib→Isha** — these are already fiqh-correct because the app already computes Asr/Isha starts per the user's madhab (`school` param / `params.madhab`).
3. **Isha end becomes madhab-aware**: `hanafi` → tomorrow's Fajr (Subh Sadiq); `shafi` (default; Maliki/Hanbali normalize to it in this app) → **Islamic midnight = midpoint(Maghrib, tomorrow's Fajr)** — which is *exactly* what the already-installed `adhan@4.4.3` package computes as `SunnahTimes.middleOfTheNight`.
4. **Tomorrow's Fajr**: prefer the already-cached Aladhan monthly calendar (`AladhanAPI.getPrayerTimesForDate(tomorrow)`); fall back to offline `new PrayerTimes(coords, date+1, params).fajr` from the `adhan` lib.
5. **Wire the display** into the real UI (PremiumDashboard prayer grid via a new `endsAt` field, or revive `PrayerCards.tsx`), add i18n keys `endsAt` / `timeLeft` to all 7 locales (en/ar/ur/bn/ru/fr/ko — parity is enforced at 1037 keys today), reusing `formatPrayerTime` from `time-formatter.ts` and the existing `minuteTick` re-render pattern.

Effort: ~1 day. Risk: low (all new computation is offline and additive; no API contract changes needed).

---

## 2. Current-state audit

### 2.1 Data flow today (prayer times)

```
Aladhan /v1/calendar/{y}/{m}  ──(localStorage 'aladhan-monthly-data')──┐
        │  online                                                       │
        ▼                                                               ▼
src/lib/aladhan-api.ts ──timings──► src/hooks/usePrayerTimes.ts ──► prayerTimes (starts only, 5+extras)
        ▲ offline fallback                        │
src/lib/prayer-calculator.ts (adhan lib,          ├─► prayerTimesWithEnd ({start,end} per prayer)  ──► ONLY consumer: RamadanWidget (Suhoor/Iftar)
 method+madhab aware)                             │
src/lib/prayer-methods.ts / prayer-method-resolver ┘ (effective method: explicit choice → region recommendation → MWL)

Dashboard.tsx (page) ── its OWN AladhanAPI path ──► PremiumDashboard.tsx grid: name + START time + NEXT pill (NO end times)
src/lib/prayer-end-times.ts ── DEAD CODE (never called) ──► imported only by orphaned src/components/PrayerCards.tsx
```

### 2.2 What each relevant file does today

- **`src/hooks/usePrayerTimes.ts`** — main hook. Builds `PrayerTimesWithEnd` where:
  - `fajr: {start, end: sunrise}` ✔ (Fajr ends at sunrise — agreed by all madhabs)
  - `dhuhr: {start, end: asr}` ✔ (correct in *principle*; and because Aladhan `school` / adhan `params.madhab` were already applied when computing **Asr's start**, the Dhuhr window automatically respects the user's madhab: Shafi'i/Maliki/Hanbali → mithl 1 boundary, Hanafi → mithl 2 boundary)
  - `asr: {start, end: maghrib}` ✔ (Asr ends at sunset — agreed)
  - `maghrib: {start, end: isha}` ✔ (Maghrib ends when Isha enters; Isha start is method-dependent — twilight angles 15/17/17.5/18/19.5° or 90-min intervals — all already handled by the method resolver)
  - `isha: {start, end: tomorrowResult.fajr}` ✖ **hard-wired to tomorrow's Fajr for every madhab** (correct only for Hanafi; jumhur ends at Islamic midnight)
  - Tomorrow's Fajr always comes from the **offline adhan calculator** (`calculatePrayerTimes(..., tomorrow)`) even when today's times came from the Aladhan API → mixed-source boundary (bug #9).
  - Extras: `midnight` = `timings.Midnight` (API) **or 00:00 next civil day**; `tahajjud` = `timings.Lastthird` **or** `midnight + (tomorrowFajr − midnight)/2`. Both fallbacks are wrong (bugs #5–#7); the API values are shifted too (bug #8).
- **`src/lib/prayer-end-times.ts`** — a complete end-times lib (`calculatePrayerEndTimes`, `getCurrentPrayer`, `getNextPrayer`, `isPrayerEndingSoon`, `getPrayerStatus`). Same end rules as the hook (incl. tomorrow-Fajr for Isha) plus a `calculateIslamicMidnight()` fallback that returns **00:00 of the next civil day** (bug #1). **None of it is called anywhere** (verified: `rg "calculatePrayerEndTimes|isPrayerEndingSoon|getPrayerStatus"` → definitions only).
- **`src/lib/prayer-calculator.ts`** — offline adhan wrapper. Already sets `params.madhab = Madhab.Hanafi | Shafi` from `getMadhab()` and resolves the method. Exposes `calculatePrayerTimes(lat, lon, date, method?)` — the natural place to add tomorrow-Fajr / SunnahTimes helpers.
- **`src/lib/aladhan-api.ts`** — monthly-calendar fetch/cache (`/v1/calendar/{y}/{m}?latitude&longitude&method&school`), `getTodaysPrayerTimes`, `getNextEventCountdown`. Its response type **already declares `Midnight`, `Firstthird`, `Lastthird`** (`AladhanPrayerTime`), and the hook parses them when present. But its **offline fallback hardcodes `'00:00'` for all three** (bug #5). It passes no `midnightMode` param (→ API default STANDARD, bug #8).
- **`src/lib/prayer-methods.ts` / `prayer-method-resolver.ts`** — single source of truth for the calculation method (13 methods, Aladhan id mapping, region recommendation). End-time code should consume `getEffectiveCalculationMethod()` rather than re-derive.
- **`src/lib/time-formatter.ts`** — `formatTime(time: string | Date, format?: '12'|'24', options?: TimeFormatOptions)`; strips the Aladhan `" (TZ)"` suffix; locale-aware via i18n. This is what end times must be formatted with (the doc's earlier sketch confirmed `formatTime` is the shared entry point; `formatPrayerTime` is the prayer-card variant).
- **`src/lib/time-events.ts`** — **not** related to prayer timing (it is the quiz XP-events system: Friday/weekend bonuses). No changes needed or useful here.
- **`package.json`** — `adhan: ^4.4.3` is already a dependency (`node_modules/adhan` present, MIT, batoulapps Adhan).

### 2.3 The orphaned `PrayerCards.tsx` component

Verified with `rg -n "PrayerCards" src/` — **zero imports**. The only hits are inside the file itself plus a *comment* in `time-formatter.ts:115` listing it among components listening to `time-format-changed`. `OfflinePrayerTimes.tsx` is likewise orphaned (self-reference only) — `RamadanWidget.tsx` on the other hand **is** live (lazy-imported by `PremiumDashboard.tsx:14`, rendered during Ramadan).

What `PrayerCards.tsx` already offers:
- Props are exactly a slice of `UsePrayerTimesReturn` (`timings: PrayerTimesWithEnd | null`, `location`, `isLoading`, `error`, `needsManualLocation`, `refresh`, `setManualLocation`) → can be wired by passing the `usePrayerTimes()` hook result fields directly.
- 2-column grid of 5 cards (Lucide icons per prayer), **"Current" / "Next" pills**, big start time, and a **`until {endTimeFormatted}`** sub-line — i.e. the end-time UI already exists, built on `formatPrayerTime` + reactive `useTimeFormat()` + `getCurrentPrayer()` from `prayer-end-times.ts`.
- Loading skeleton, error card (retry / "Use Karachi"), and manual-location search states.

What it needs before revival: i18n (all strings are hardcoded English: "Prayer Times", "until", "Current", "Next", "Loading...", error copy), Jummah rename handling, integration with the salah check-in tracker, and it *inherits* every hook bug in §2.5. Recommended instead: surface `endsAt` in the **live** PremiumDashboard grid (see §5.4) and keep PrayerCards revival as an optional follow-up.

### 2.4 Where prayer times are actually displayed today

- **`src/pages/Dashboard.tsx`** → delegates to **`PremiumDashboard.tsx`**: hero (next-prayer countdown + progress bar between previous prayer start and next target), a 2-column prayer grid showing name (`t(prayer.name.toLowerCase())`) + start time + amber "NEXT" pill, Daily Salah check-in row, `RamadanWidget` (Suhoor/Iftar + countdowns) during Ramadan. **No prayer end time is rendered anywhere.** (`dashboardPrayers` carries only `{name, time, icon, isActive, isUpcoming, isCompleted, onCheckIn}`.)
- `Dashboard.tsx` already holds a `usePrayerTimes()` instance (`prayerTimesHook`, line ~117) — the end-time data one prop away from the grid.
- Friday handling exists: Dhuhr is renamed **"Jummah"** before 14:00 (`key 'jummah'` exists in all 7 locales).

### 2.5 BUG list in existing end-time code

1. **`calculateIslamicMidnight()` returns 00:00 of the next civil day** (`prayer-end-times.ts:133-138`). Islamic midnight is the midpoint between Maghrib and (tomorrow's) Fajr — "the night" in fiqh runs Maghrib→Fajr, not 00:00→00:00. Effect: whenever tomorrow's data is missing, Isha's shown end jumps to 00:00 — *over*-permissive for jumhur users (tells Shafi'i users Isha is valid after its real limit) and arbitrarily truncating for Hanafi users.
2. **Isha's end ignores the madhab entirely.** Both `usePrayerTimes.ts:349` (`isha: {start, end: tomorrowResult.fajr}`) and `prayer-end-times.ts` hard-wire tomorrow's Fajr. The app's default madhab is **shafi** (`getMadhab()` defaults to `'shafi'`), so for the majority-jurisdiction case the displayed window overstates Isha's valid time (midnight→Fajr is a Hanafi-only leniency). The `madhab-changed` event re-fetches times but cannot fix this because the end rule never reads the madhab.
3. **The whole end-times lib is dead code.** `calculatePrayerEndTimes`, `getNextPrayer`, `isPrayerEndingSoon`, `getPrayerStatus` have zero call sites; the `PrayerTimesWithEnd` data that *is* produced by the hook is consumed only by `RamadanWidget` for Suhoor/Iftar starts.
4. **`PrayerCards.tsx` is orphaned** (§2.3) — the only end-time UI ever built ships to no page, and it is not i18n-ready.
5. **`AladhanAPI.getTodaysPrayerTimes()` offline fallback hardcodes `Midnight: '00:00'`, `Firstthird: '00:00'`, `Lastthird: '00:00'`** (`aladhan-api.ts:335-337`). Downstream, `usePrayerTimes` parses these non-null strings as *real* times (`optionalTimes.midnight = parseTime('00:00')` → **today** 00:00, i.e. a past instant), so `times.midnight` and `times.tahajjud` become "today 00:00" and the `midnight` window becomes today-00:00 → tomorrow-Fajr (~24 h). Silent garbage on the offline path.
6. **`times.midnight` fallback is 00:00 next civil day** (`usePrayerTimes.ts:330-332,336`) — same wrong semantics as bug #1.
7. **Tahajjud fallback formula is wrong**: `midnight + (tomorrowFajr − midnight)/2` (line ~340) takes the midpoint of civil-midnight→Fajr, which is not the last third of the night. Correct: `maghrib + ⅔ × (fajr − maghrib)` = `SunnahTimes.lastThirdOfTheNight`.
8. **Aladhan `Midnight`/`Firstthird`/`Lastthird` are shifted even when fetched.** Empirically verified (§3.2): the API's default `midnightMode=STANDARD` returns the midpoint of **Sunset→next-day Sunrise** (and thirds of that span), *not* the legal night (Maghrib→Fajr). London 2026-11-17: STANDARD `Midnight` 23:45 vs true Islamic midnight 22:46; Karachi 2026-11-17: 00:17 vs 23:37. `midnightMode=1` (JAFARI) returns the Maghrib→Fajr values. The app sends no `midnightMode`, so `times.midnight`/`tahajjud` are ~35–60 min late. **Conclusion: don't trust the default `Midnight` field for fiqh purposes — compute the midpoint locally (or use adhan `SunnahTimes`).**
9. **Mixed-source Isha-end boundary**: today's times come from Aladhan (online) but tomorrow's Fajr from the offline adhan calc — ±1–2 min disagreement at exactly the boundary users watch (esp. with methods that apply offsets). Prefer tomorrow's Fajr from the *same* cached Aladhan month (already in localStorage; month-boundary → offline fallback).
10. **`getCurrentPrayer` inclusive-window logic**: with the 00:00 fallback (bugs #1/#5) Isha is reported "current" past its madhab limit; boundaries use `<=` on both edges so an instant matches two windows (cosmetic); between Islamic midnight and 00:00 (once fixed) it correctly returns null.
11. **No end times in the real UI** (§2.4) — the user-visible gap this research was commissioned for.
12. *(Minor)* `endTimeFormatted` strings are computed once inside `prayer-end-times.ts` via the re-exported `formatTime` — a 12/24h flip mid-session would leave stale strings (PrayerCards recomputes via `formatPrayerTime`, so this only bites future direct consumers; the format listener comment in `time-formatter.ts` lists PrayerCards even though it's unmounted anywhere — dead reference).
13. *(Minor)* `PrayerTimes` interface in `aladhan-api.ts` omits `Sunset` (the API returns it) — harmless today, worth adding when touching the file.

---

## 3. API / library comparison

### 3.1 Options

| Criterion | **`adhan` npm v4.4.3** (already installed) | **Aladhan API** (already integrated) | Custom calc (status quo) |
|---|---|---|---|
| Source of Fajr end | `PrayerTimes.sunrise` | `timings.Sunrise` | next event (sunrise) ✔ already |
| Source of Dhuhr end | next prayer start = `PrayerTimes.asr` (madhab-aware via `params.madhab`) | `timings.Asr` (school=0/1 param) | `times.asr` ✔ already madhab-aware |
| Source of Asr end | `PrayerTimes.maghrib` / `sunset` | `timings.Maghrib` / `timings.Sunset` | `times.maghrib` ✔ |
| Source of Maghrib end | `PrayerTimes.isha` (method-dependent) | `timings.Isha` | `times.isha` ✔ |
| Source of Isha end | **`SunnahTimes.middleOfTheNight`** (jumhur) or tomorrow `PrayerTimes.fajr` (Hanafi) — must pick per madhab yourself | `timings.Midnight` — ⚠ default STANDARD is Sunset→Sunrise midpoint (wrong base); `midnightMode=1` needed for Maghrib→Fajr; **no madhab-aware field** | tomorrow `fajr` or 00:00 fallback ✖ |
| Islamic midnight / last third | ✔ native (`SunnahTimes`), verified in `node_modules/adhan/lib/cjs/SunnahTimes.js` | ⚠ `Midnight`/`Firstthird`/`Lastthird` exist but semantics depend on `midnightMode`; default is not the fiqh midnight | ✖ wrong formulas (bugs #6/#7) |
| Madhab correctness | ✔ Asr mithl 1/2 via `Madhab.Shafi/Hanafi`; Isha end = *your* rule on top | ✔ Asr via `school=0/1`; Isha end field not madhab-aware | partial (Asr yes, Isha no) |
| Offline capability | ✔ full (astronomical) | ✖ network (month cached in localStorage) | ✔ |
| Effort | **~0.5 day** (lib already wraps it in `prayer-calculator.ts`) | ~0.5 day (needs `midnightMode=1` + month-boundary handling) | — (this is what exists) |
| Risk | Low — offline, deterministic, MIT | Low-Med — network dep, midnightMode ambiguity (§3.2), tz suffix quirks | High — known bugs above |

**Verdict:** hybrid — keep Aladhan for starts (parity with what the user already sees), derive ends + Islamic midnight locally with `adhan` (already installed), falling back to adhan-only when offline. This is also exactly what mainstream apps do (starts from a service; ends derived on-device).

### 3.2 Aladhan API — exact fields (live-verified 2026-10-22)

`GET https://api.aladhan.com/v1/timings/{DD-MM-YYYY}?latitude&longitude&method&school&midnightMode&iso8601&tune` and `GET /v1/calendar/{year}/{month}?...` (the endpoint the app caches) return `data.timings`:

```
Fajr, Sunrise, Dhuhr, Asr, Sunset, Maghrib, Isha, Imsak, Midnight, Firstthird, Lastthird
   — format "HH:mm" (24h); a " (TZ-abbrev)" suffix may appear ("05:30 (PKT)") — the app already strips it
     (regex \s*\(.*?\)\s* in aladhan-api.ts, time-formatter.ts, usePrayerTimes.ts, Dashboard.tsx).
   — iso8601=true switches to ISO 8601 timestamps (not used by the app).
data.meta: timezone ("Europe/London"), method {id, name, params}, latitudeAdjustmentMethod ("ANGLE_BASED"),
   midnightMode ("STANDARD" | "JAFARI"), school ("STANDARD" | "HANAFI"), offset {…}
Query params: method (id), school (0 = Shafi'i … 1 = Hanafi — affects Asr only),
   midnightMode (0 = STANDARD, 1 = JAFARI — affects Midnight/Firstthird/Lastthird only)
```

**Empirical verification of the `Midnight` semantics** (this matters for bug #8):

| Location / date | Maghrib | Fajr (+1d) | Sunrise (+1d) | `Midnight` @ STANDARD (default) | `Midnight` @ JAFARI | midpoint(Maghrib→Fajr) | midpoint(Sunset→Sunrise) |
|---|---|---|---|---|---|---|---|
| London 51.51,-0.13 · 17-11-2026 · MWL | 16:08 | 05:24 | ~07:22 | **23:45** | 22:46 | 22:46 | 23:45 |
| Karachi 24.86,67.00 · 17-11-2026 · Karachi | 17:44 | 05:30 | 06:50 | **00:17** | 23:37 | 23:37 | 00:17 |

→ Default STANDARD = midpoint(**Sunset → next Sunrise**); `midnightMode=1` (JAFARI) = midpoint(**Maghrib → next Fajr**) = the fiqh "middle of the night". `Firstthird`/`Lastthird` follow the same base span. The docs page (`https://aladhan.com/prayer-times-api`) is JS-rendered and could not be text-scraped from this sandbox; all field names/semantics above were verified against the live API instead.

**What the app currently parses:** `usePrayerTimes.ts` reads `Imsak`, `Midnight`, `Firstthird`, `Lastthird` (optional) from the response; `aladhan-api.ts` types them in `AladhanPrayerTime` but its offline fallback fakes them as `'00:00'` (bug #5). It never sends `midnightMode` and never uses `Midnight` for Isha's end.

### 3.3 `adhan` v4.4.3 — exact typings (from `node_modules/adhan/lib/types/`)

```ts
// SunnahTimes.d.ts — the money API for Islamic midnight
export default class SunnahTimes {
    middleOfTheNight: Date;       // = maghrib + (tomorrowFajr − maghrib)/2, rounded to minute
    lastThirdOfTheNight: Date;    // = maghrib + 2/3 × (tomorrowFajr − maghrib)
    constructor(prayerTimes: PrayerTimes);
}

// PrayerTimes.d.ts (relevant subset)
export default class PrayerTimes {
    coordinates: Coordinates; date: Date; calculationParameters: CalculationParameters;
    fajr: Date; sunrise: Date; dhuhr: Date; asr: Date;
    sunset: Date; maghrib: Date; isha: Date;
    constructor(coordinates: Coordinates, date: Date, calculationParameters: CalculationParameters);
    timeForPrayer(prayer: ValueOf<typeof Prayer>): Date | null;
    currentPrayer(date?: Date): "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
    nextPrayer(date?: Date): "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
}

// Madhab.d.ts — drives Asr shadow length (shadowLength(): 1 | 2)
export declare const Madhab: { readonly Shafi: "shafi"; readonly Hanafi: "hanafi" };

// CalculationParameters.d.ts (subset)
class CalculationParameters {
    madhab: ValueOf<typeof Madhab>;
    ishaInterval: number;          // UmmAlQura/Qatar/Gulf: Isha = fixed minutes after maghrib
    adjustments: { fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number };
    highLatitudeRule: ValueOf<typeof HighLatitudeRule>;   // 'middleofthenight' | 'seventhofsixthnight' | 'twilightangle'
}
```

Verified against the bundled source (`lib/cjs/SunnahTimes.js`): the constructor builds tomorrow's `PrayerTimes` with the same coordinates/parameters, `nightDuration = (nextDay.fajr − today.maghrib)/1000`, `middleOfTheNight = roundedMinute(maghrib + nightDuration/2)`, `lastThirdOfTheNight = roundedMinute(maghrib + nightDuration × 2/3)`.

**What adhan does NOT provide:** explicit "end of Fajr/Dhuhr/Asr/Maghrib" fields, and no madhab-aware Isha limit. Ends must be derived from next-event starts (trivial) plus a madhab rule for Isha (one `if`). Note also `DateUtils` (`dateByAddingDays` etc.) is **not exported** from the package root (`Adhan.d.ts` exports `Prayer, Madhab, HighLatitudeRule, Coordinates, CalculationParameters, CalculationMethod, PrayerTimes, SunnahTimes, Qibla, PolarCircleResolution, Rounding, Shafaq` only) — construct tomorrow with `new Date(d); d.setDate(d.getDate() + 1)` (calendar-day arithmetic, DST-safe; `PrayerTimes` only reads the date's Y/M/D components).

---

## 4. Fiqh rules — the END of each prayer's valid time

Primary hadith (fetched from sunnah.com in this session):

> **Sahih Muslim 612a** (Abdullah ibn 'Amr): "When you pray Fajr, its time is until the first part of the sun appears. When you pray Zuhr, its time is until 'Asr comes. When you pray 'Asr, its time is until the sun turns yellow. When you pray Maghrib, its time is until the twilight has disappeared. When you pray 'Isha, its time is until half of the night has passed." — https://sunnah.com/muslim:612a

> **Jami' at-Tirmidhi 151** (Abu Hurairah): "Indeed for (the time of) Salat there is a beginning and an end. … the end of its [Zuhr's] time is when the time for Asr enters. … the end of [Asr's] time is when the sun yellows (turns pale). … the end of [Maghrib's] time is when the twilight has vanished … the end of [Isha's] time is when the night is at its half. … [Fajr's] end is when the sun rises." — https://sunnah.com/tirmidhi:151 (Tirmidhi notes the Ibn-'Amr narration comes in two wordings — Isha "until midnight" and "until dawn" — which is precisely the madhab split below.)

| Prayer | Begins | Ends (Maliki / Shafi'i / Hanbali — **jumhur**) | Ends (Hanafi) | Nuances the UI should not get wrong |
|---|---|---|---|---|
| **Fajr** | Subh Sadiq (true dawn; angle per method) | **Sunrise (shuruq)** — agreed | **Sunrise** — agreed | After sunrise the prayer is *qada'*; display end = Sunrise. |
| **Dhuhr** | Zenith (after zuha) | **When Asr enters = shadow equals object + its noon shadow (mithl 1)** | **When Asr enters = shadow 2× object (+noon shadow) (mithl 2)** — window is ~1h longer | The "end" moves with the madhab because *Asr's start* moves. The app already computes Asr per madhab (`school`/`params.madhab`) → deriving Dhuhr's end from the displayed Asr time is automatically correct. |
| **Asr** | mithl 1 (jumhur) / mithl 2 (Hanafi) | **Sunset (ghurub)** — agreed | **Sunset** — agreed | Shafi'i distinguishes **waqt al-ikhtiyār** (choice time, ends at mithl 2) from **waqt aḍ-ḍarūra** (necessity, ends at sunset — valid but sinful to delay without excuse). Hanafi: delaying to near sunset (sun turning pale/yellow, *ṣufr*) is **karāhiyyah** (disliked, not invalid) — Muslim 612a's "until the sun turns yellow" marks the end of the *excused* window. UI implication: an end-time display near sunset should not read as "pray as late as you like". |
| **Maghrib** | Sunset | **When Isha enters** (disappearance of twilight — red for jumhur start of Isha, white/gone per Hanafi; angle/interval per the selected calculation method) | **Same** (Isha enter) | Maghrib's end == Isha's start, and Isha's start varies by method (15°/17°/17.5°/18°/19.5° twilight, or 60–90 min intervals for UmmAlQura/Qatar/Gulf). Already handled: the app's displayed Isha time comes from the selected method. |
| **Isha** | Twilight gone (per method) or interval | **Islamic midnight = middle of the night (niṣf al-layl) = midpoint(Maghrib → tomorrow's Fajr)** (Muslim 612a "until half of the night"; Tirmidhi 151 "night at its half"). Maliki minority: delaying past the *first half* is the makruh threshold (Wikipedia, *Isha prayer*, fetched). | **Until Subh Sadiq (tomorrow's Fajr)** — the second Tirmidhi 151 narration | ⚠ **Do not confuse the last third of the night with Isha's limit.** The "last third" (ṣulāh's descent hadith — Bukhari 1145 / Muslim 758) is about **Tahajjud's most virtuous window**, not Isha's validity boundary. Isha ends at the *middle* (jumhur) or dawn (Hanafi); the last-third timestamp belongs to a Tahajjud/Qiyam feature (the app's `tahajjud` field). |

Sources: fetched in this session — sunnah.com Muslim 612a & Tirmidhi 151; Wikipedia *Isha prayer*, *Asr prayer*, *Maghrib prayer*, *Fajr prayer* (state the same end rules and cite the schools; e.g. Asr "ends at sunset… frowned upon (and sinful in the Maliki school) to delay… until the sun turns pale"; Isha "Time ends: at the beginning of dawn… frowned upon to delay past the first third… Maliki: first half"). Standard manual references cited for the Shafi'i choice/necessity times (not fetchable from this sandbox — islamqa.org & seekersguidance.org return 403/JS-only here; cited by name): *ʿUmdat as-Sālik* (Reliance of the Traveller) f5.3–f5.6 & *Fiqh al-Manhajī*; Hanafi: *Marāqī al-Falāḥ / Radd al-Muḥtār* (waqt tām vs faḍl vs ḍarūra). Treat those two as "cited from standard references", the sunnah.com/Wikipedia/API items as "verified".

---

## 5. RECOMMENDED INTEGRATION PLAN (file-by-file)

All sketches follow repo conventions: named exports, `formatTime`/`formatPrayerTime` from `time-formatter.ts`, `getMadhab` from `storage.ts`, method resolution via `prayer-method-resolver.ts`, `adhan` classes imported at top like `prayer-calculator.ts` does. Nothing here changes the API contract or storage keys.

### Step 1 — Canonicalize end computation in `src/lib/prayer-end-times.ts`

Make this file the *only* place that knows an end-time rule. Keep the old export names working (they're currently unused, so signatures may be fixed freely).

```ts
// src/lib/prayer-end-times.ts (proposed)
import { Coordinates, CalculationMethod, PrayerTimes, Madhab, SunnahTimes,
         type CalculationParameters } from 'adhan';
import { getMadhab, type MadhabType } from './storage';
import { getEffectiveCalculationMethod, type CalculationMethodName } from './prayer-method-resolver';
import { formatTime } from './time-formatter';

// …existing PrayerTime / PrayerWithEndTime / PrayerSchedule interfaces…  (+ new:)
export type EndBasis =
  | 'sunrise' | 'asr' | 'maghrib' | 'isha'          // = next event start
  | 'islamicMidnight'                               // jumhur Isha limit
  | 'fajrTomorrow';                                 // Hanafi Isha limit

export interface PrayerWithEndTime extends PrayerTime {
  endTime: Date;
  endTimeFormatted: string;
  endBasis: EndBasis;      // lets the UI explain "Ends (Islamic midnight)" if desired
}

/** True Islamic midnight: midpoint of tonight's Maghrib → tomorrow's Fajr.
 *  Replaces the old 00:00 fallback (bug #1). Rounded to the minute, like adhan. */
export const calculateIslamicMidnight = (maghrib: Date, tomorrowFajr: Date): Date => {
  const ms = maghrib.getTime() + (tomorrowFajr.getTime() - maghrib.getTime()) / 2;
  return new Date(Math.round(ms / 60000) * 60000);
};

/** Tomorrow's Fajr via the adhan lib (offline, DST-safe: calendar-day arithmetic). */
export const calculateTomorrowFajr = (
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  methodName?: CalculationMethodName
): Date => {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return buildPrayerTimes(latitude, longitude, tomorrow, methodName).fajr;
};

// buildPrayerTimes(): same params construction as prayer-calculator.calculatePrayerTimes
// (CALCULATION_METHODS[method]() + params.madhab = getMadhab() === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi)
// — or import/call calculatePrayerTimes-adjacent code to avoid duplication.

export interface ComputeEndTimesInput {
  latitude: number;
  longitude: number;
  date?: Date;                       // default today
  madhab?: MadhabType;               // default getMadhab()
  today?: Partial<PrayerSchedule>;   // starts parsed from Aladhan when online; adhan used for gaps
  tomorrowFajr?: Date;               // pass from cached Aladhan month when available (bug #9)
}

/** The one canonical end-time function. */
export const computePrayerEndTimes = (input: ComputeEndTimesInput): PrayerWithEndTime[] => {
  const { latitude, longitude } = input;
  const date = input.date ?? new Date();
  const madhab = input.madhab ?? getMadhab();
  const method = getEffectiveCalculationMethod(latitude, longitude);
  const pt = buildPrayerTimes(latitude, longitude, date, method);       // fills any missing starts
  const fajrT  = input.today?.fajr  ?? { datetime: pt.fajr };
  const asrT   = input.today?.asr   ?? { datetime: pt.asr };
  const maghribT = input.today?.maghrib ?? { datetime: pt.maghrib };
  const ishaT  = input.today?.isha  ?? { datetime: pt.isha };
  const sunriseT = input.today?.sunrise ?? { datetime: pt.sunrise };
  const tomorrowFajr = input.tomorrowFajr ?? calculateTomorrowFajr(latitude, longitude, date, method);

  const islamicMidnight = calculateIslamicMidnight(maghribT.datetime, tomorrowFajr);
  // Extreme-latitude guard: if the midpoint precedes Isha (≈ polar day), fall back to tomorrow Fajr.
  const ishaEnd = madhab === 'hanafi' || islamicMidnight <= ishaT.datetime
    ? tomorrowFajr : islamicMidnight;

  const rows: Array<[string, Date, Date, EndBasis]> = [
    ['Fajr',   fajrT.datetime,    sunriseT.datetime,  'sunrise'],
    ['Dhuhr',  /* dhuhr start */, asrT.datetime,      'asr'],
    ['Asr',    asrT.datetime,     maghribT.datetime,  'maghrib'],
    ['Maghrib', maghribT.datetime, ishaT.datetime,     'isha'],
    ['Isha',   ishaT.datetime,    ishaEnd,            madhab === 'hanafi' ? 'fajrTomorrow' : 'islamicMidnight'],
  ];
  return rows.map(([name, datetime, endTime, endBasis]) => ({
    name, time: formatTime(datetime), datetime, endTime, endBasis,
    endTimeFormatted: formatTime(endTime),
  }));
};

// Keep legacy wrappers (now correct): calculatePrayerEndTimes(today, tomorrow?) delegates to
// computePrayerEndTimes; getCurrentPrayer / getPrayerStatus / isPrayerEndingSoon unchanged
// except boundary comparisons (< start, >= start && < end).
```

### Step 2 — Expose SunnahTimes through `src/lib/prayer-calculator.ts`

```ts
// src/lib/prayer-calculator.ts (additions)
import { SunnahTimes } from 'adhan';

export interface SunnahTimesResult {
  middleOfTheNight: Date;      // = Islamic midnight (jumhur Isha limit)
  lastThirdOfTheNight: Date;   // = Tahajjud window start — NOT the Isha limit (§4)
}

export const calculateSunnahTimes = (
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  methodName?: CalculationMethodName
): SunnahTimesResult => {
  const coordinates = new Coordinates(latitude, longitude);
  const params = CALCULATION_METHODS[methodName ?? getCalculationMethod()]();
  params.madhab = getMadhab() === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const st = new SunnahTimes(new PrayerTimes(coordinates, date, params));
  return { middleOfTheNight: st.middleOfTheNight, lastThirdOfTheNight: st.lastThirdOfTheNight };
};
```

### Step 3 — `src/hooks/usePrayerTimes.ts` consumes the canonical lib

Replace the inline `withEnd` block (lines ~343-355) and the `midnight`/`tahajjud` fallbacks:

```ts
// tomorrow's Fajr — prefer the SAME source as today's times (bug #9):
const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
let tomorrowFajr: Date | undefined;
const cachedTomorrow = AladhanAPI.getPrayerTimesForDate(tomorrow);   // monthly cache, same month only
if (cachedTomorrow) {
  tomorrowFajr = parseTime(cachedTomorrow.timings.Fajr);
  tomorrowFajr.setDate(tomorrow.getDate());                          // re-anchor to tomorrow's date
} else {
  tomorrowFajr = calculateTomorrowFajr(lat, lon, now, methodName);   // offline adhan
}

const times: PrayerTimes = {
  ...prayerDates,
  // fix bugs #5–#8: never trust API 'Midnight'/'00:00' fallbacks for fiqh semantics
  midnight: sunnah.middleOfTheNight,
  imsak: optionalTimes.imsak ?? new Date(prayerDates.fajr.getTime() - 10 * 60000),
  ishraq: new Date(prayerDates.sunrise.getTime() + 15 * 60000),
  duha: new Date(prayerDates.sunrise.getTime() + (prayerDates.dhuhr.getTime() - prayerDates.sunrise.getTime()) / 2),
  tahajjud: sunnah.lastThirdOfTheNight,
};
// where: const sunnah = calculateSunnahTimes(lat, lon, now, methodName);
// (drop optionalTimes.midnight / firstthird / lastthird reads entirely — §3.2 shows they're off-base)

const withEnd: PrayerTimesWithEnd = computePrayerEndTimes({
  latitude, longitude, today: prayerDates, tomorrowFajr,
});
```

Also: delete the `'00:00'` hardcodes in `aladhan-api.ts:335-337` (bug #5) — the fields can simply be omitted (the hook treats them as optional); the `getPrayerTimesForDate` month-boundary case is already handled by the `else` branch above.

### Step 4 — Wire the display into the real UI

**4a. PremiumDashboard grid (recommended, lowest risk).** `Dashboard.tsx` already has `prayerTimesHook`; map end times into `dashboardPrayers`:

```ts
// src/pages/Dashboard.tsx (dashboardPrayers memo — add:)
const withEnd = prayerTimesHook.prayerTimesWithEnd;
const endsByName: Record<string, Date | undefined> = withEnd ? {
  Fajr: withEnd.fajr.end, Dhuhr: withEnd.dhuhr.end, Asr: withEnd.asr.end,
  Maghrib: withEnd.maghrib.end, Isha: withEnd.isha.end,
} : {};
// …per prayer:
return { name: displayName, /* …existing… */,
  endsAt: endsByName[p.originalName ?? p.name]
    ? formatPrayerTime(endsByName[p.originalName ?? p.name]!, timeFormat, location.timeZone)
    : undefined };
```

```tsx
// src/components/PremiumDashboard.tsx — inside the prayer card, under the start time:
<p className="text-sm mt-0.5 font-semibold" style={{ /* existing */ }}>{prayer.time}</p>
{prayer.endsAt && (
  <p className="text-[11px] mt-0.5 text-muted-foreground" dir="auto">
    {t('endsAt', { time: prayer.endsAt })}
  </p>
)}
```

Optional "time left" line on the NEXT card (reuse the existing `minuteTick` re-render and `targetTime`): `t('timeLeft', { duration: formatTimeLeft(end - now) })` with a tiny `formatTimeLeft(ms)` helper (h/m only — see `RamadanWidget.formatCountdown` for the established in-repo pattern). For the current-prayer card, `endBasis === 'islamicMidnight'` can be annotated with a new optional key `islamicMidnight` ("Islamic midnight") so jumhur users understand what the number means.

**4b. Reviving `PrayerCards.tsx` (alternative).** Pass `<PrayerCards timings={prayerTimesHook.prayerTimesWithEnd} location={prayerTimesHook.location} … />` — it renders "until {endTimeFormatted}" today. Before reviving it must be: i18n'd ("Prayer Times"→`t('prayerTimes')`, "until"→new `untilTime` or reuse `endsAt`, "Current"/"Next"→existing `currentPrayer`/`next` keys — check `currentPrayer` exists; `next` does), given the Jummah rename, and hooked into the salah check-in row. Recommend 4a first; revive 4b only if a dedicated page wants the richer states.

### Step 5 — i18n keys (all 7 locales; parity enforced — 1037 keys today)

Reuse: `endsIn` ("Ends In" / "ينتهي خلال") exists in every locale but is **unused** and duration-shaped (no placeholder) — repurpose it *or* deprecate it; do not rely on it for "Ends 06:12".

New keys (suggested values; keep placeholders — `i18next` interpolation `{{time}}` / `{{duration}}`):

| key | en | ar (RTL-safe) | ur (RTL-safe) | bn | ru | fr | ko |
|---|---|---|---|---|---|---|---|
| `endsAt` | Ends {{time}} | ينتهي {{time}} | {{time}} پر ختم | শেষ {{time}} | до {{time}} | Jusqu'à {{time}} | {{time}} 종료 |
| `timeLeft` | {{duration}} left | متبقٍ {{duration}} | {{duration}} باقی | {{duration}} বাকি | осталось {{duration}} | {{duration}} restantes | {{duration}} 남음 |
| `islamicMidnight` | Islamic midnight | منتصف الليل الشرعي | شرحي نصف شب | ইসলামিক মধ্যরাত | исламская полночь | minuit islamique | 이슬람 한밤중 |

RTL notes: put the interpolated time *adjacent to the translation text* with no manual bidi marks and set `dir="auto"` on the element; times are LTR digit runs inside RTL sentences — React/Intl handle isolation in modern engines, but test ar/ur visually (Arabic "ينتهي 06:12" renders time to the left, which is correct RTL order). The existing `endsIn` Urdu value ("کہاں تک ختم ہوتا ہے", ≈ "until when does it end") is mistranslated for this use — fix or leave unused.

### Step 6 — Out of scope / follow-ups

- Notification text ("Asr ends in 25 min") could reuse the same lib via `notification-content.ts` — separate task.
- `PrayerCards.tsx` revival, `midnightMode=1` experiment on the Aladhan fetch (only if the team prefers API-supplied midnight; not needed once Step 2 lands), and adding `Sunset` to `AladhanPrayerTime`.

---

## 6. Edge cases

- **DST:** all times are `Date`s in the device's local timezone; the adhan lib recomputes solar positions per *calendar day*, and tomorrow must be built with `setDate(+1)` (calendar arithmetic) — never `+86400000 ms` (a DST day is 23/25 h). On DST-change days the Islamic-midnight midpoint is still correct because both endpoints are computed for their own day. The app's 00:00–00:05-only auto-refresh (`usePrayerTimes`) misses DST-shift recompute — pre-existing, unrelated, note for follow-up.
- **Midnight crossing:** Isha's window legitimately spans 00:00. `endTimeFormatted` shows a clock time only ("03:12"); when `end` is tomorrow, consider an a11y/tooltip hint ("tomorrow") — the formatted HH:mm alone is ambiguous for Isha ends (jumhur ≈ 22:00–01:00; Hanafi ≈ Fajr).
- **Device-tz ≠ location-tz (travel/VPN):** Aladhan times are parsed into *device-local* Date objects today; end times inherit that skew. Mitigation: pass `location.timeZone` into `formatTime(…, { timeZone })` (already supported by `TimeFormatOptions`) — same fix benefits start times.
- **Aladhan `(TZ)` suffix & formats:** already stripped by the shared regex; `iso8601=true` remains unused. Keep the regex in one place (`time-formatter`) if refactoring.
- **Month boundary for tomorrow's Fajr:** the Aladhan cache is a single monthly slot — on the 1st/last day of a month `getPrayerTimesForDate(tomorrow)` returns null → the offline adhan fallback covers it (±1 min vs API, acceptable at the boundary).
- **Ramadan:** Isha→Taraweeh context — after Isha the next meaningful event is Suhoor end (Fajr), which `RamadanWidget` already shows; do *not* replace Isha's end with Suhoor. The jumhur Islamic-midnight display is additionally useful (Qiyam framing); Hanafi users see Fajr. No special casing beyond what the widget already does — it only reads `.fajr.start`/`.maghrib.start`.
- **Jummah (Friday):** `Dashboard.tsx` renames Dhuhr→Jummah before 14:00 (`t('jummah')` exists in all locales). The *end* of the valid Dhuhr window is still Asr's start — but khutbah length is not computable, so either keep "Ends {{Asr}}" (fiqh-correct for the salah window) or suppress the line for the Jummah card; product decision, document whichever is chosen.
- **12/24 h & numerals:** always format via `formatPrayerTime`/`formatTime` (respects `time-format` + reactive `time-format-changed`); never persist formatted strings (bug #12). Locale numerals verified on Node full-ICU: `bn` renders Bengali digits (১৮:০৫) automatically; `ar`/`ur`/`ru`/`fr`/`ko` render Latin digits; `ko` renders "오후/오전" in 12 h. Parsing formatted output back is forbidden (breaks bn immediately).
- **High latitudes / polar day:** adhan `PrayerTimes` may produce `Invalid Date` (NaN) near polar circles; guard every `endTime` with `Number.isNaN(end.getTime())` and hide the end line rather than rendering "Invalid Date". Aladhan uses `latitudeAdjustmentMethod=ANGLE_BASED`; minor start-time divergence from the offline fallback is possible in far-north summer — the `tomorrowFajr` fallback ordering in Step 3 keeps the boundary consistent with whichever source produced today's times.

---

## 7. Sources

**Fetched in this session:**
- Aladhan API live responses (field names, `midnightMode` semantics, formats): `https://api.aladhan.com/v1/timings/17-11-2026?latitude=51.5074&longitude=-0.1278&method=3[&midnightMode=0|1]` and `…/timings/17-11-2026?latitude=24.86&longitude=67.0&method=1[&midnightMode=0|1]`, `…/v1/timingsByCity?city=Karachi&country=Pakistan&method=1` — https://aladhan.com/prayer-times-api (docs page; JS-rendered, fields verified from the API itself)
- Sahih Muslim 612a — https://sunnah.com/muslim:612a
- Jami' at-Tirmidhi 151 — https://sunnah.com/tirmidhi:151
- Wikipedia: https://en.wikipedia.org/wiki/Isha_prayer · https://en.wikipedia.org/wiki/Asr_prayer · https://en.wikipedia.org/wiki/Maghrib_prayer · https://en.wikipedia.org/wiki/Fajr_prayer (prayer-time-window sections, incl. Hanafi/jumhur split, Asr shadow definitions, "sinful in the Maliki school to delay until the sun pales")
- `adhan@4.4.3` typings & source (local `node_modules`): `lib/types/SunnahTimes.d.ts`, `lib/types/PrayerTimes.d.ts`, `lib/types/Madhab.d.ts`, `lib/types/CalculationParameters.d.ts`, `lib/types/Adhan.d.ts` (exports), `lib/cjs/SunnahTimes.js` (midpoint math); upstream https://github.com/batoulapps/adhan-js (MIT)

**Cited by name (403/JS-blocked from this sandbox — standard references):**
- islamqa.org / SeekersGuidance articles on the end of Isha & Dhuhr times (both returned 403/bot-walls to the sandbox)
- *ʿUmdat as-Sālik* (Reliance of the Traveller), Shafi'i times f5.3–f5.6 — waqt al-ikhtiyār vs waqt aḍ-ḍarūra
- Hanafi manuals (*Marāqī al-Falāḥ / Radd al-Muḥtār*) — Asr karāhiyyah near sunset; Isha until Subh Sadiq

**Local code (audited):** `src/lib/prayer-end-times.ts`, `src/hooks/usePrayerTimes.ts`, `src/hooks/usePrayerTimesQuery.ts`, `src/lib/prayer-calculator.ts`, `src/lib/aladhan-api.ts`, `src/lib/adhan-preferences.ts` (adhan *audio* prefs — unrelated to timing), `src/lib/prayer-methods.ts`, `src/lib/prayer-method-resolver.ts`, `src/lib/time-formatter.ts`, `src/lib/time-events.ts` (quiz XP events — unrelated), `src/components/PrayerCards.tsx`, `src/components/PremiumDashboard.tsx`, `src/components/RamadanWidget.tsx`, `src/components/OfflinePrayerTimes.tsx` (also orphaned), `src/pages/Dashboard.tsx`, `src/locales/*.json`, `package.json`, `node_modules/adhan/*`.

**Prior art (mainstream apps):** from general product knowledge — Muslim Pro / Athan-class apps show a next-prayer countdown ("3h 12m left") and several show an explicit "Ends at HH:mm" or per-prayer "until" subtext; Muslim Pro's support hub (https://support.muslimpro.com) confirms notifications centered on *start* times only. In-repo precedents for the UI wording: `RamadanWidget` ("Suhoor ends 05:24" + live countdown), `PremiumDashboard` next-prayer progress bar — the recommended `endsAt`/`timeLeft` wording matches both patterns and the existing (unused) `endsIn` key.
