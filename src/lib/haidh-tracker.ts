// ============================================================
//  Haidh Tracker — complete data model & service layer
//  Replaces the thin menstrual-mode.ts with full cycle engine
// ============================================================

export type Madhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali';
export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type MoodType = 'happy' | 'neutral' | 'sad' | 'irritable' | 'anxious' | 'emotional';
export type CyclePhase = 'haidh' | 'tuhr' | 'premenstrual' | 'fertile' | 'unknown';
export type BleedingType = 'haidh' | 'nifas' | 'istihadhah';

// ─── Sub-types ───────────────────────────────────────────────
export interface DailyLog {
  date: string; // YYYY-MM-DD
  flow: FlowIntensity;
  symptoms: string[];
  mood: MoodType | null;
  energyLevel: 1 | 2 | 3 | 4 | 5 | null;
  painLevel: number; // 0–10
  notes: string;
  isIstihadhah: boolean;
  ghusulCompleted: boolean;
  missedFast: boolean;
  committed: boolean; // true once the user confirms the day's log
}

export interface CycleEntry {
  id: string;
  startDate: string;       // YYYY-MM-DD
  endDate: string | null;  // null if still active
  expectedDuration: number;
  actualDuration: number | null;
  bleedingType: BleedingType;
  logs: DailyLog[];
  madhab: Madhab;
  notes: string;
}

export interface PregnancyInfo {
  active: boolean;
  startDate: string;      // YYYY-MM-DD (LMP or tracking start)
  dueDate: string | null; // YYYY-MM-DD (computed from LMP +280d or user-entered)
  notes: string;
  endedDate?: string | null; // YYYY-MM-DD, set when pregnancy tracking ends
}

export interface HaidhTrackerData {
  // Current state
  isActive: boolean;
  currentCycleId: string | null;

  // Pregnancy mode (optional — absent in pre-NC4c stored data, merged on load)
  pregnancy: PregnancyInfo | null;

  // All cycles (history + current)
  cycles: CycleEntry[];

  // Computed predictions (re-calculated on save)
  averageCycleLength: number; // total cycle (period-to-period)
  averagePeriodLength: number; // days of bleeding
  nextPredictedStart: string | null; // YYYY-MM-DD

  // Islamic settings
  madhab: Madhab;
  showIslamicGuidance: boolean;
  ghusulReminderEnabled: boolean;

  // Reminder toggles
  periodPredictionReminderEnabled: boolean;
  dailyLogReminderEnabled: boolean;

  // Prayer integration (mirrors old menstrual-mode.ts fields)
  pausePrayerNotifications: boolean;
  pauseQazaAutoSync: boolean;

  // Ramadan fasting
  missedRamadanFasts: number;
  madeUpRamadanFasts: number;

  // Security
  pinCode: string | null;
}

// ─── Madhab Rules ─────────────────────────────────────────────
export const MADHAB_RULES: Record<Madhab, { minHaidh: number; maxHaidh: number; minTuhr: number; maxNifas: number }> = {
  hanafi:  { minHaidh: 3,  maxHaidh: 10, minTuhr: 15, maxNifas: 40 },
  maliki:  { minHaidh: 1,  maxHaidh: 15, minTuhr: 15, maxNifas: 60 },
  shafii:  { minHaidh: 1,  maxHaidh: 15, minTuhr: 15, maxNifas: 60 },
  hanbali: { minHaidh: 1,  maxHaidh: 15, minTuhr: 15, maxNifas: 40 },
};

// ─── Symptoms catalogue ───────────────────────────────────────
export const SYMPTOMS = [
  { key: 'cramps',      label: 'Cramps',            icon: '😣' },
  { key: 'headache',   label: 'Headache',           icon: '🤕' },
  { key: 'fatigue',    label: 'Fatigue',            icon: '🥱' },
  { key: 'bloating',   label: 'Bloating',           icon: '😴' },
  { key: 'back_pain',  label: 'Back Pain',          icon: '🔙' },
  { key: 'nausea',     label: 'Nausea',             icon: '🤢' },
  { key: 'acne',       label: 'Acne',               icon: '🫧' },
  { key: 'tender',     label: 'Breast Tenderness',  icon: '💆' },
  { key: 'hot_flash',  label: 'Hot Flashes',        icon: '🌡️' },
  { key: 'mood_swings',label: 'Mood Swings',        icon: '🌊' },
];

// ─── Storage ─────────────────────────────────────────────────
const STORAGE_KEY = 'haidh-tracker-v2';
const MAX_CYCLES = 24;

const DEFAULT_DATA: HaidhTrackerData = {
  isActive: false,
  currentCycleId: null,
  pregnancy: null,
  cycles: [],
  averageCycleLength: 28,
  averagePeriodLength: 7,
  nextPredictedStart: null,
  madhab: 'hanafi',
  showIslamicGuidance: true,
  ghusulReminderEnabled: true,
  periodPredictionReminderEnabled: true,
  dailyLogReminderEnabled: false,
  pausePrayerNotifications: true,
  pauseQazaAutoSync: true,
  missedRamadanFasts: 0,
  madeUpRamadanFasts: 0,
  pinCode: null,
};

// ─── Helpers ─────────────────────────────────────────────────
const generateId = () => `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const diffDays = (a: string, b: string): number => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
};

// ─── Pregnancy math (pure) ───────────────────────────────────
export const PREGNANCY_DURATION_DAYS = 280; // 40 weeks from LMP (Naegele's rule)

/** Return dateStr shifted by `days` (negative allowed), as YYYY-MM-DD. */
export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

/** Estimated due date from the first day of the last menstrual period (+280 days). */
export const computeDueDate = (lmpDateStr: string): string => addDays(lmpDateStr, PREGNANCY_DURATION_DAYS);

const safeDayDiff = (a: string, b: string): number => {
  const n = diffDays(a, b);
  return Number.isFinite(n) ? n : 0;
};

/** Gestational age as completed weeks + days, given pregnancy start (LMP). */
export const weeksDaysPregnant = (startDate: string, todayStr: string): { weeks: number; days: number } => {
  const total = Math.max(0, safeDayDiff(startDate, todayStr));
  return { weeks: Math.floor(total / 7), days: total % 7 };
};

/** 1st trimester: weeks 0–13, 2nd: 14–27, 3rd: 28+. */
export const trimesterFor = (startDate: string, todayStr: string): 1 | 2 | 3 => {
  const total = Math.max(0, safeDayDiff(startDate, todayStr));
  if (total < 14 * 7) return 1;
  if (total < 28 * 7) return 2;
  return 3;
};

/** Whole days remaining until the due date (negative = overdue). null if unknown. */
export const daysUntilDue = (dueDate: string | null, todayStr: string): number | null =>
  dueDate && !isNaN(new Date(dueDate).getTime()) ? safeDayDiff(todayStr, dueDate) : null;

// ─── Prediction Engine ───────────────────────────────────────
const recalculatePredictions = (data: HaidhTrackerData): HaidhTrackerData => {
  // While pregnant the cycle clock is meaningless — suppress period predictions
  // (they resume automatically once pregnancy tracking ends).
  if (data.pregnancy?.active) return { ...data, nextPredictedStart: null };

  const completed = data.cycles.filter(c => c.endDate && !isNaN(new Date(c.startDate).getTime()));
  if (completed.length < 2) return { ...data, nextPredictedStart: null };

  // Average period length (last 6)
  const periodLengths = completed.slice(0, 6)
    .map(c => c.actualDuration ?? diffDays(c.startDate, c.endDate!))
    .filter(n => n > 0 && n <= 20);

  // Cycle-to-cycle gaps (last 6)
  const sorted = [...completed].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(sorted.length, 7); i++) {
    gaps.push(diffDays(sorted[i - 1].startDate, sorted[i].startDate));
  }
  const validGaps = gaps.filter(g => g >= 15 && g <= 60);

  const avgPeriod = periodLengths.length
    ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
    : 7;
  const avgCycle = validGaps.length
    ? Math.round(validGaps.reduce((a, b) => a + b, 0) / validGaps.length)
    : 28;

  // Predict from the most recent cycle start
  const lastStart = sorted[sorted.length - 1].startDate;
  const nextDate = new Date(lastStart);
  nextDate.setDate(nextDate.getDate() + avgCycle);

  return {
    ...data,
    averagePeriodLength: avgPeriod,
    averageCycleLength: avgCycle,
    nextPredictedStart: toDateStr(nextDate),
  };
};

// ─── Istihadhah detection ─────────────────────────────────────
export const detectIstihadhah = (cycle: CycleEntry, madhab: Madhab): boolean => {
  // Nifas (postpartum) has its own ceiling — only flag as irregular if it
  // exceeds maxNifas. Regular Haidh is checked against maxHaidh.
  const ceiling = cycle.bleedingType === 'nifas'
    ? MADHAB_RULES[madhab].maxNifas
    : MADHAB_RULES[madhab].maxHaidh;

  if (!cycle.endDate) {
    // Still active — check running duration
    const days = diffDays(cycle.startDate, toDateStr(new Date())) + 1;
    return days > ceiling;
  }
  return (cycle.actualDuration ?? 0) > ceiling;
};

// ─── Fiqh Status Calculator ───────────────────────────────────
export interface FiqhStatus {
  phase: CyclePhase;
  label: string;
  salahExempt: boolean;
  fastingExempt: boolean;
  tawafPermitted: boolean;
  quranRecitationAllowed: boolean;
  mushaafAllowed: string; // 'yes' | 'no' | 'differs'
  istihadhahDetected: boolean;
  ghusulRequired: boolean;
  dayOfCycle: number;
  isPregnant: boolean; // pregnancy never exempts salah — kept for UI awareness
}

export const getFiqhStatus = (data: HaidhTrackerData): FiqhStatus => {
  const today = toDateStr(new Date());

  const isPregnant = Boolean(data.pregnancy?.active);

  if (!data.isActive || !data.currentCycleId) {
    // Check if we just ended — Tuhr phase
    const lastCycle = data.cycles.find(c => c.id === data.cycles[0]?.id);
    return {
      phase: 'tuhr',
      label: isPregnant ? 'Ṭuhr — Pregnant' : 'Ṭuhr (Pure)',
      salahExempt: false,
      fastingExempt: false,
      tawafPermitted: true,
      quranRecitationAllowed: true,
      mushaafAllowed: 'yes',
      istihadhahDetected: false,
      ghusulRequired: false,
      dayOfCycle: 0,
      isPregnant,
    };
  }

  const cycle = data.cycles.find(c => c.id === data.currentCycleId);
  if (!cycle) return getFiqhStatus({ ...data, isActive: false, currentCycleId: null });

  const dayOfCycle = diffDays(cycle.startDate, today) + 1;
  const isIsti = detectIstihadhah(cycle, data.madhab);
  const isNifas = cycle.bleedingType === 'nifas';

  if (isIsti) {
    return {
      phase: 'haidh',
      label: 'Istiḥāḍah (Irregular)',
      salahExempt: false,
      fastingExempt: false,
      tawafPermitted: false,
      quranRecitationAllowed: true,
      mushaafAllowed: 'yes',
      istihadhahDetected: true,
      ghusulRequired: true,
      dayOfCycle,
      isPregnant,
    };
  }

  return {
    phase: 'haidh',
    label: isNifas ? 'Nifās (Postpartum)' : 'Ḥaidh (Menstruation)',
    salahExempt: true,
    fastingExempt: true,
    tawafPermitted: false,
    quranRecitationAllowed: true, // Dhikr + listening allowed
    mushaafAllowed: 'differs',
    istihadhahDetected: false,
    ghusulRequired: false,
    dayOfCycle,
    isPregnant,
  };
};

// ─── Current Cycle ────────────────────────────────────────────
export const getCurrentCycle = (data: HaidhTrackerData): CycleEntry | null => {
  if (!data.currentCycleId) return null;
  return data.cycles.find(c => c.id === data.currentCycleId) ?? null;
};

// ─── CRUD Operations ─────────────────────────────────────────
/** Tolerant normalizer so old/partial stored data never breaks parsing. */
const normalizePregnancy = (p: unknown): PregnancyInfo | null => {
  if (!p || typeof p !== 'object') return null;
  const obj = p as Partial<PregnancyInfo>;
  const startDate = typeof obj.startDate === 'string' ? obj.startDate : '';
  const startValid = Boolean(startDate) && !isNaN(new Date(startDate).getTime());
  // Heal a missing due date on active pregnancies so partial imports still
  // get a working countdown.
  const dueDate = typeof obj.dueDate === 'string' && obj.dueDate
    ? obj.dueDate
    : (obj.active && startValid ? computeDueDate(startDate) : null);
  return {
    active: Boolean(obj.active),
    startDate,
    dueDate,
    notes: typeof obj.notes === 'string' ? obj.notes : '',
    endedDate: typeof obj.endedDate === 'string' ? obj.endedDate : null,
  };
};

export const getHaidhData = (): HaidhTrackerData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateFromOldData();
    const parsed: HaidhTrackerData = JSON.parse(raw);
    // Ensure all fields present (schema evolution); pregnancy merged safely.
    return { ...DEFAULT_DATA, ...parsed, pregnancy: normalizePregnancy(parsed.pregnancy) };
  } catch {
    return DEFAULT_DATA;
  }
};

const saveHaidhData = (data: HaidhTrackerData): HaidhTrackerData => {
  const withPredictions = recalculatePredictions(data);
  // Trim cycle history
  withPredictions.cycles = withPredictions.cycles.slice(0, MAX_CYCLES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withPredictions));
  } catch {
    console.error('Failed to save haidh tracker data');
  }
  window.dispatchEvent(new CustomEvent('haidh-tracker-updated', { detail: withPredictions }));
  // Also fire legacy event for Dashboard compatibility
  window.dispatchEvent(new CustomEvent('menstrual-mode-updated', { detail: withPredictions }));
  return withPredictions;
};

// ─── Migrate from old menstrual-mode.ts data ─────────────────
const migrateFromOldData = (): HaidhTrackerData => {
  try {
    const old = localStorage.getItem('menstrual-mode-data');
    if (!old) return DEFAULT_DATA;
    const parsed = JSON.parse(old);
    const data: HaidhTrackerData = {
      ...DEFAULT_DATA,
      isActive: Boolean(parsed.isActive),
      pausePrayerNotifications: parsed.pausePrayerNotifications ?? true,
      pauseQazaAutoSync: parsed.pauseQazaAutoSync ?? true,
      cycles: (parsed.history ?? []).map((h: { startedAt: string; endedAt: string; durationDays: number }) => ({
        id: generateId(),
        startDate: h.startedAt ? toDateStr(new Date(h.startedAt)) : toDateStr(new Date()),
        endDate: h.endedAt ? toDateStr(new Date(h.endedAt)) : null,
        expectedDuration: parsed.cycleLengthDays ?? 7,
        actualDuration: h.durationDays ?? null,
        bleedingType: 'haidh' as BleedingType,
        logs: [],
        madhab: 'hanafi' as Madhab,
        notes: '',
      })),
    };
    if (parsed.isActive && parsed.startedAt) {
      const id = generateId();
      data.currentCycleId = id;
      data.cycles.unshift({
        id,
        startDate: toDateStr(new Date(parsed.startedAt)),
        endDate: null,
        expectedDuration: parsed.cycleLengthDays ?? 7,
        actualDuration: null,
        bleedingType: 'haidh',
        logs: [],
        madhab: 'hanafi',
        notes: '',
      });
    }
    return saveHaidhData(data);
  } catch {
    return DEFAULT_DATA;
  }
};

// ─── Public API ───────────────────────────────────────────────
export const startCycle = (
  startDate: Date = new Date(),
  bleedingType: BleedingType = 'haidh',
  expectedDuration?: number
): HaidhTrackerData => {
  const data = getHaidhData();
  // Pregnancy guard: no ḥaidh/nifās cycle can start while pregnancy mode is
  // active. Pregnancy bleeding is treated as istiḥāḍah (prayer continues);
  // nifās tracking begins only after birth via endPregnancy().
  if (data.pregnancy?.active) return data;
  const id = generateId();
  const newCycle: CycleEntry = {
    id,
    startDate: toDateStr(startDate),
    endDate: null,
    expectedDuration: expectedDuration ?? data.averagePeriodLength,
    actualDuration: null,
    bleedingType,
    logs: [],
    madhab: data.madhab,
    notes: '',
  };

  const updated: HaidhTrackerData = {
    ...data,
    isActive: true,
    currentCycleId: id,
    cycles: [newCycle, ...data.cycles],
  };

  return saveHaidhData(updated);
};

export const endCycle = (endDate: Date = new Date()): HaidhTrackerData => {
  const data = getHaidhData();
  if (!data.currentCycleId) return data;

  const endStr = toDateStr(endDate);
  const updatedCycles = data.cycles.map(c => {
    if (c.id !== data.currentCycleId) return c;
    const duration = diffDays(c.startDate, endStr) + 1;
    return { ...c, endDate: endStr, actualDuration: Math.max(1, duration) };
  });

  return saveHaidhData({
    ...data,
    isActive: false,
    currentCycleId: null,
    cycles: updatedCycles,
  });
};

// ─── Pregnancy Mode ──────────────────────────────────────────
export const startPregnancy = (opts: {
  startDate: string;        // YYYY-MM-DD — LMP or tracking start
  dueDate?: string | null;  // optional explicit due date; else computed
  notes?: string;
}): HaidhTrackerData => {
  const data = getHaidhData();
  const startDate = opts.startDate || toDateStr(new Date());
  const pregnancy: PregnancyInfo = {
    active: true,
    startDate,
    dueDate: opts.dueDate || computeDueDate(startDate),
    notes: opts.notes ?? '',
    endedDate: null,
  };

  // Pregnancy supersedes any running cycle — auto-close it so states never
  // conflict (its fiqh rulings end with the pregnancy switch).
  let cycles = data.cycles;
  if (data.isActive && data.currentCycleId) {
    const today = toDateStr(new Date());
    cycles = cycles.map(c =>
      c.id === data.currentCycleId
        ? { ...c, endDate: today, actualDuration: Math.max(1, diffDays(c.startDate, today) + 1) }
        : c
    );
  }

  return saveHaidhData({
    ...data,
    pregnancy,
    isActive: false,
    currentCycleId: null,
    cycles,
  });
};

/** End pregnancy tracking. Pass startDate of a nifās cycle separately via startCycle(). */
export const endPregnancy = (endDate: Date | string = new Date()): HaidhTrackerData => {
  const data = getHaidhData();
  if (!data.pregnancy?.active) return data;
  const ended = typeof endDate === 'string' ? endDate : toDateStr(endDate);
  return saveHaidhData({
    ...data,
    pregnancy: { ...data.pregnancy, active: false, endedDate: ended },
  });
};

export const logDay = (date: Date, log: Partial<DailyLog>): HaidhTrackerData => {
  const data = getHaidhData();
  const dateStr = toDateStr(date);
  const defaultLog: DailyLog = {
    date: dateStr,
    flow: 'medium',
    symptoms: [],
    mood: null,
    energyLevel: null,
    painLevel: 0,
    notes: '',
    isIstihadhah: false,
    ghusulCompleted: false,
    missedFast: false,
    committed: false,
    ...log,
  };

  const updatedCycles = data.cycles.map(c => {
    if (c.id !== data.currentCycleId) return c;
    const existingIdx = c.logs.findIndex(l => l.date === dateStr);
    const updatedLogs = [...c.logs];
    if (existingIdx >= 0) {
      updatedLogs[existingIdx] = { ...updatedLogs[existingIdx], ...log, date: dateStr };
    } else {
      updatedLogs.push(defaultLog);
    }
    return { ...c, logs: updatedLogs };
  });

  return saveHaidhData({ ...data, cycles: updatedCycles });
};

export const getTodayLog = (data: HaidhTrackerData): DailyLog | null => {
  const cycle = getCurrentCycle(data);
  if (!cycle) return null;
  const today = toDateStr(new Date());
  return cycle.logs.find(l => l.date === today) ?? null;
};

export const getLogForDate = (data: HaidhTrackerData, dateStr: string): DailyLog | null => {
  for (const cycle of data.cycles) {
    const log = cycle.logs.find(l => l.date === dateStr);
    if (log) return log;
  }
  return null;
};

export const updateSettings = (patch: Partial<HaidhTrackerData>): HaidhTrackerData => {
  return saveHaidhData({ ...getHaidhData(), ...patch });
};

export const markGhusulComplete = (date: Date = new Date()): HaidhTrackerData => {
  return logDay(date, { ghusulCompleted: true });
};

export const incrementMissedFast = (): HaidhTrackerData => {
  const data = getHaidhData();
  return saveHaidhData({ ...data, missedRamadanFasts: data.missedRamadanFasts + 1 });
};

export const decrementMissedFast = (): HaidhTrackerData => {
  const data = getHaidhData();
  if (data.missedRamadanFasts <= 0) return data;
  return saveHaidhData({ ...data, missedRamadanFasts: data.missedRamadanFasts - 1 });
};

export const markFastMadeUp = (): HaidhTrackerData => {
  const data = getHaidhData();
  if (data.madeUpRamadanFasts >= data.missedRamadanFasts) return data;
  return saveHaidhData({ ...data, madeUpRamadanFasts: data.madeUpRamadanFasts + 1 });
};

// ─── Backup / Restore / Wipe ─────────────────────────────────
// Encapsulated here so callers never touch the storage key directly.

export const exportData = (): string => JSON.stringify(getHaidhData(), null, 2);

export const importData = (json: string): boolean => {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cycles)) {
      return false;
    }
    // Merge over defaults to tolerate older exports missing new fields.
    const merged: HaidhTrackerData = { ...DEFAULT_DATA, ...parsed, pregnancy: normalizePregnancy(parsed.pregnancy) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('haidh-tracker-updated', { detail: merged }));
    window.dispatchEvent(new CustomEvent('menstrual-mode-updated', { detail: merged }));
    return true;
  } catch {
    return false;
  }
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  const empty = { ...DEFAULT_DATA };
  window.dispatchEvent(new CustomEvent('haidh-tracker-updated', { detail: empty }));
  window.dispatchEvent(new CustomEvent('menstrual-mode-updated', { detail: empty }));
};

// ─── Calendar helpers ────────────────────────────────────────
export type DayStatus = 'haidh' | 'tuhr' | 'predicted' | 'today' | 'future' | 'fertile' | 'ovulation';

export const getDayStatus = (data: HaidhTrackerData, dateStr: string): DayStatus => {
  const today = toDateStr(new Date());

  // Was it a logged period day?
  for (const cycle of data.cycles) {
    const start = cycle.startDate;
    const end = cycle.endDate ?? today;
    if (dateStr >= start && dateStr <= end) {
      return 'haidh';
    }
  }

  // Is it the predicted next start?
  if (data.nextPredictedStart) {
    const pred = new Date(data.nextPredictedStart);
    const range = 2; // ±2 days window
    for (let d = -range; d <= range; d++) {
      const check = new Date(pred);
      check.setDate(check.getDate() + d);
      if (toDateStr(check) === dateStr) return 'predicted';
    }
  }

  // Ovulation day + fertile window: ovulation ~14 days before next period
  if (data.nextPredictedStart) {
    const nextPeriod = new Date(data.nextPredictedStart);
    const check = new Date(dateStr);
    const daysUntilNext = Math.round((nextPeriod.getTime() - check.getTime()) / 86400000);
    if (daysUntilNext === 14 && dateStr <= today) {
      return 'ovulation';
    }
    if (daysUntilNext >= 15 && daysUntilNext <= 19 && dateStr <= today) {
      return 'fertile';
    }
  }

  if (dateStr > today) return 'future';
  return 'tuhr';
};

// ─── Prediction confidence label ─────────────────────────────
export const getPredictionConfidence = (data: HaidhTrackerData): string => {
  const completed = data.cycles.filter(c => c.endDate);
  if (completed.length < 2) return 'insufficient data';
  if (completed.length < 4) return 'estimated (±5 days)';
  if (completed.length < 6) return 'likely (±3 days)';
  return 'predicted (±2 days)';
};

// ─── Phase-specific Islamic content ─────────────────────────
export const PHASE_DUAS = {
  haidh: {
    title: 'Duʿā During Ḥaidh',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
    transliteration: 'Allahumma inni as\'aluka al-\'afiyata fi-d-dunya wa-l-akhirah',
    translation: 'O Allah, I ask You for well-being in this life and the next.',
    dhikr: [
      { text: 'SubḥānAllāh', arabic: 'سُبْحَانَ اللَّهِ', count: 33 },
      { text: 'Alḥamdulillāh', arabic: 'اَلْحَمْدُ لِلَّهِ', count: 33 },
      { text: 'Allāhu Akbar', arabic: 'اَللَّهُ أَكْبَرُ', count: 34 },
      { text: 'Astaghfirullāh', arabic: 'أَسْتَغْفِرُ اللَّهَ', count: 100 },
    ],
    wellness: [
      'Focus on Dhikr, Duʿā, and listening to Quran.',
      'Rest is encouraged — the Prophet ﷺ emphasised kindness to the body.',
      'You are still in the remembrance of Allah.',
    ],
  },
  afterGhusl: {
    title: 'Duʿā After Ghusl (Entering Ṭuhr)',
    arabic: 'أَشْهَدُ أَن لَّا إِلَٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration: 'Ash-hadu an la ilaha ill-Allah wa ash-hadu anna Muhammadan \'abduhu wa rasuluh',
    translation: 'I bear witness that there is no god but Allah and that Muhammad is His servant and messenger.',
    wellness: [
      'Your ʿibādah is at full strength — make the most of Ṣalāh & Quran.',
      'Your prayers now count — resume Fajr today.',
      'A new cycle of worship begins.',
    ],
    dhikr: [],
  },
  tuhr: {
    title: 'During Ṭuhr (Purity)',
    arabic: 'رَبِّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: 'Rabbi a\'inni \'ala dhikrika wa shukrika wa husni \'ibadatik',
    translation: 'My Lord, help me to remember You, to be grateful to You, and to worship You well.',
    wellness: [
      'This is your optimal time for deep Quran recitation.',
      'Voluntary fasting (Monday/Thursday) is recommended.',
      'Track your Tahajjud this week.',
    ],
    dhikr: [],
  },
};

// ─── Pregnancy duas (Qur'anic only — clearly referenced) ─────
export interface PregnancyDua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
}

export const PREGNANCY_DUAS: { title: string; note: string; duas: PregnancyDua[] } = {
  title: 'Duas of Pregnancy & Birth',
  note: 'Words from the Qur\'an for this blessed wait — said by prophets and righteous mothers.',
  duas: [
    {
      id: 'zakariyya',
      title: 'The Dua of Zakariyyā (for righteous offspring)',
      arabic: 'رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً ۖ إِنَّكَ سَمِيعُ الدُّعَاءِ',
      transliteration: 'Rabbi hab lī min ladunka dhurriyyatan ṭayyibah, innaka samīʿu ad-duʿāʾ',
      translation: 'My Lord, grant me from Yourself a good offspring. Indeed, You hear all supplication.',
      reference: "Qur'an 3:38",
    },
    {
      id: 'qurrata-ayun',
      title: 'Comfort of the eyes',
      arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
      transliteration: 'Rabbanā hab lanā min azwājinā wa dhurriyyātinā qurrata aʿyunin wajʿalnā lil-muttaqīna imāmā',
      translation: 'Our Lord, grant us from our spouses and offspring comfort to our eyes, and make us leaders of the righteous.',
      reference: "Qur'an 25:74",
    },
    {
      id: 'mother-of-maryam',
      title: 'The Dua of the mother of Maryam',
      arabic: 'رَبِّ إِنِّي نَذَرْتُ لَكَ مَا فِي بَطْنِي مُحَرَّرًا فَتَقَبَّلْ مِنِّي ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ',
      transliteration: 'Rabbi innī nadhartu laka mā fī baṭnī muḥarraran fataqabbal minnī, innaka anta as-samīʿu al-ʿalīm',
      translation: 'My Lord, I have vowed to You what is in my womb, consecrated, so accept it from me. Indeed, You are the Hearing, the Knowing.',
      reference: "Qur'an 3:35",
    },
  ],
};

// ─── Phase-based self-care tips (wellness, not medical advice) ─
export interface SelfCareTip {
  key: string;
  icon: string; // resolved to a lucide icon in the component layer
  label: string;
  detail: string;
}

export const SELF_CARE_BY_PHASE: Record<CyclePhase | 'pregnant', { title: string; tips: SelfCareTip[] }> = {
  haidh: {
    title: 'Caring for yourself during Ḥaidh',
    tips: [
      { key: 'warm-compress', icon: 'thermometer', label: 'Warm compress', detail: 'A warm compress on your lower belly relaxes the muscles and can soften cramps.' },
      { key: 'hydrate', icon: 'water', label: 'Stay hydrated', detail: 'Sip water through the day — good hydration eases bloating and tiredness.' },
      { key: 'iron-foods', icon: 'leaf', label: 'Iron-rich foods', detail: 'Dates, spinach and lentils help replenish the iron your body loses during bleeding.' },
      { key: 'gentle-walk', icon: 'footprints', label: 'Gentle walk', detail: 'A short, unhurried walk supports circulation and can lift a heavy mood.' },
      { key: 'rest', icon: 'moon', label: 'Rest well', detail: 'Rest is a mercy for the body — sleep without guilt; dhikr before sleep soothes the heart.' },
      { key: 'less-caffeine', icon: 'coffee', label: 'Ease off caffeine', detail: 'Cutting back coffee and strong tea during cramps may help them feel milder.' },
    ],
  },
  tuhr: {
    title: 'Building strength in Ṭuhr',
    tips: [
      { key: 'sunnah-foods', icon: 'sprout', label: 'Sunnah foods', detail: 'Honey ("in it is healing for people" — Qur\'an 16:69) and black seed ("a cure for every disease" — Sahih al-Bukhari 5688) are lovely daily additions.' },
      { key: 'nourish', icon: 'apple', label: 'Nourish & rebuild', detail: 'Iron- and vitamin-rich meals in Ṭuhr help your body rebuild before the next cycle.' },
      { key: 'move', icon: 'footprints', label: 'Keep moving', detail: 'Walking or light stretching now keeps your energy steady for the days ahead.' },
      { key: 'sleep', icon: 'moon', label: 'Protect your sleep', detail: 'A consistent bedtime supports hormones, mood and worship energy.' },
      { key: 'quran-time', icon: 'book', label: 'Quran & gratitude time', detail: 'Ṭuhr is your window for full recitation — a few pages a day feeds the soul too.' },
    ],
  },
  premenstrual: {
    title: 'Gentle days before your cycle',
    tips: [
      { key: 'compassion', icon: 'heart', label: 'Self-compassion', detail: 'Hormonal shifts can stir real emotions — speak gently to yourself; you are held in Allah\'s care.' },
      { key: 'warm-drink', icon: 'coffee', label: 'Warm, calm drinks', detail: 'Warm caffeine-free drinks can be soothing when you feel tense or tender.' },
      { key: 'light-move', icon: 'footprints', label: 'Light movement', detail: 'Easy stretching or a slow walk can ease premenstrual tension and heaviness.' },
      { key: 'early-night', icon: 'moon', label: 'Early night', detail: 'Sleep tends to be harder right before a period — an early bedtime softens the edge.' },
      { key: 'nourish-pms', icon: 'apple', label: 'Balanced bites', detail: 'Regular, balanced meals (nuts, seeds, fruit) help steady your energy and mood.' },
    ],
  },
  fertile: {
    title: 'Caring for yourself this week',
    tips: [
      { key: 'hydrate-fertile', icon: 'water', label: 'Keep hydrating', detail: 'Steady water intake supports your energy and overall comfort this week.' },
      { key: 'balanced', icon: 'apple', label: 'Balanced meals', detail: 'Colourful, varied meals give your body what it needs for the cycle ahead.' },
      { key: 'walk', icon: 'footprints', label: 'Gentle walk', detail: 'Movement you enjoy — a walk, fresh air — is enough; consistency beats intensity.' },
      { key: 'sleep-fertile', icon: 'moon', label: 'Rest & sleep', detail: 'Good sleep keeps hormones — and mood — on an even keel.' },
      { key: 'notice', icon: 'note', label: 'Notice your body', detail: 'A quick note on how you feel each day makes your own patterns easier to see.' },
    ],
  },
  pregnant: {
    title: 'Gentle care while expecting',
    tips: [
      { key: 'hydrate-preg', icon: 'water', label: 'Hydrate often', detail: 'Small sips through the day support you and your baby — keep a bottle nearby.' },
      { key: 'iron-folate', icon: 'leaf', label: 'Iron & folate foods', detail: 'Dates, spinach, lentils and eggs are gentle, nourishing staples in pregnancy.' },
      { key: 'walk-preg', icon: 'footprints', label: 'Gentle walk', detail: 'A calm daily walk helps with energy, sleep and mood — go at your own pace.' },
      { key: 'rest-preg', icon: 'moon', label: 'Rest your body', detail: 'Tiredness is normal — lie down when you can and accept help when it is offered.' },
      { key: 'small-meals', icon: 'apple', label: 'Small, frequent meals', detail: 'Little portions through the day can ease nausea better than three big meals.' },
    ],
  },
  unknown: {
    title: 'Daily self-care',
    tips: [
      { key: 'hydrate-unknown', icon: 'water', label: 'Stay hydrated', detail: 'Sip water through the day — the simplest habit with the biggest effect.' },
      { key: 'sleep-unknown', icon: 'moon', label: 'Protect your sleep', detail: 'A steady bedtime supports hormones, mood and worship energy.' },
      { key: 'walk-unknown', icon: 'footprints', label: 'Gentle movement', detail: 'A short walk most days keeps body and mood steady.' },
      { key: 'nourish-unknown', icon: 'apple', label: 'Nourishing meals', detail: 'Balanced meals with iron-rich foods (dates, spinach, lentils) support your cycle.' },
    ],
  },
};

// ─── Ovulation day ────────────────────────────────────────────
export const calculateOvulationDay = (data: HaidhTrackerData): string | null => {
  if (!data.nextPredictedStart) return null;
  const nextPeriod = new Date(data.nextPredictedStart);
  const ovulation = new Date(nextPeriod);
  ovulation.setDate(ovulation.getDate() - 14);
  return toDateStr(ovulation);
};

// ─── Cycle regularity & trend ─────────────────────────────────
export interface RegularityInfo {
  score: 'regular' | 'slightly-irregular' | 'irregular';
  variation: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  averageCycle: number;
  minCycle: number;
  maxCycle: number;
}

export const getRegularityInfo = (data: HaidhTrackerData): RegularityInfo => {
  const gaps: number[] = [];
  const sorted = [...data.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].startDate).getTime();
    const curr = new Date(sorted[i].startDate).getTime();
    const gap = Math.round((curr - prev) / 86400000);
    if (gap > 0 && gap < 100) gaps.push(gap);
  }

  if (gaps.length < 2) {
    return { score: 'regular', variation: 0, trend: 'stable', averageCycle: data.averageCycleLength, minCycle: data.averageCycleLength, maxCycle: data.averageCycleLength };
  }

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const stdDev = Math.sqrt(gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length);
  const cv = stdDev / mean;
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);

  let score: RegularityInfo['score'];
  if (cv < 0.08) score = 'regular';
  else if (cv < 0.18) score = 'slightly-irregular';
  else score = 'irregular';

  const mid = Math.floor(gaps.length / 2);
  const firstHalf = gaps.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalf = gaps.slice(mid).reduce((a, b) => a + b, 0) / (gaps.length - mid);
  const diff = secondHalf - firstHalf;
  const trend: RegularityInfo['trend'] = diff > 2 ? 'increasing' : diff < -2 ? 'decreasing' : 'stable';

  return { score, variation: Math.round(stdDev), trend, averageCycle: Math.round(mean), minCycle: min, maxCycle: max };
};

// ─── Education content ────────────────────────────────────────
export interface EducationTopic {
  question: string;
  answer: string;
  source?: string;
}

export const HAIDH_EDUCATION: EducationTopic[] = [
  {
    question: 'What is the difference between Ḥaidh and Istiḥāḍah?',
    answer: 'Ḥaidh (menstruation) is the natural monthly bleeding that girls and women experience. Istiḥāḍah (irregular/continuous bleeding) is bleeding outside the normal menstrual cycle — it can be caused by illness, injury, or hormonal imbalance. The key difference: during Ḥaidh, salah and fasting are prohibited; during Istiḥāḍah, you must still pray and fast after performing wuḍū for each prayer time.',
    source: 'Sahih al-Bukhari 228, Sahih Muslim 333',
  },
  {
    question: 'How long does Ḥaidh last according to the madhāhib?',
    answer: 'The minimum and maximum durations differ by madhab:\n• Ḥanafī: minimum 3 days, maximum 10 days\n• Mālikī: minimum 1 day, maximum 15 days\n• Shāfiʿī: minimum 1 day, maximum 15 days\n• Ḥanbalī: minimum 1 day, maximum 15 days\nIf bleeding exceeds your madhab\'s maximum, it is considered Istiḥāḍah.',
  },
  {
    question: 'What is the minimum period of purity (Ṭuhr) between cycles?',
    answer: 'The minimum period of purity (tuhr) between two menstrual cycles is 15 days according to the Ḥanafī and Ḥanbalī schools, and 15 days according to the Mālikī and Shāfiʿī schools as well. If bleeding starts again within this period, it may be considered Istiḥāḍah.',
  },
  {
    question: 'Can I read or touch the Quran during Ḥaidh?',
    answer: 'There is a scholarly difference of opinion:\n• Reciting from memory: Permitted by most scholars.\n• Touching the Muṣḥaf (physical Quran): Most scholars say it is not permitted until after ghusl. You may read from a phone/tablet as these are not considered a Muṣḥaf.\n• Listening to Quran: Always permitted and rewarded.',
    source: 'The Majority (Ḥanafī, Shāfiʿī, Ḥanbalī) prohibit touching the Muṣḥaf; Mālikīs allow it with wuḍū.',
  },
  {
    question: 'Do I need to make up missed prayers after Ḥaidh?',
    answer: 'No. According to the consensus of scholars, a woman does not need to make up the prayers she missed during her menstrual period. The Prophet ﷺ said: "Is it not the case that when she menstruates, she does not pray or fast?" (Sahih al-Bukhari 304). However, missed fasts during Ramadan must be made up.',
    source: 'Sahih al-Bukhari 304',
  },
  {
    question: 'What is Nifās (postpartum bleeding)?',
    answer: 'Nifās is the bleeding that occurs after childbirth. The maximum duration is 40 days according to the Ḥanafī and Ḥanbalī schools, and 60 days according to the Mālikī and Shāfiʿī schools. If bleeding stops before the maximum, you should perform ghusl and resume prayers. If it continues beyond the maximum, it is considered Istiḥāḍah.',
    source: 'Sunan al-Tirmidhi 139',
  },
  {
    question: 'Can I fast voluntarily during Ḥaidh?',
    answer: 'No. Voluntary fasts are not valid during Ḥaidh just as obligatory fasts are not. However, unlike Ramadan fasts, voluntary fasts do not need to be made up.',
  },
  {
    question: 'What acts of worship can I do during Ḥaidh?',
    answer: 'You can still earn immense reward:\n• Dhikr (remembrance of Allah): سبحان الله، الحمد لله، الله أكبر، etc.\n• Duʿā (supplication) — this is a great time to make duʿā.\n• Listening to the Quran.\n• Learning Islamic knowledge.\n• Giving charity.\n• Sending salutations upon the Prophet ﷺ.\n• Making istighfār (seeking forgiveness).',
  },
];

export interface WellnessArticle {
  title: string;
  category: 'nutrition' | 'exercise' | 'mental-health' | 'hygiene';
  content: string;
}

export const WELLNESS_ARTICLES: WellnessArticle[] = [
  {
    title: 'Nutrition During Your Cycle',
    category: 'nutrition',
    content: 'Iron-rich foods (spinach, lentils, red meat) help replenish iron lost during your period. Pair them with Vitamin C (citrus, bell peppers) to boost absorption. Avoid excess salt and caffeine which can worsen bloating and cramping.',
  },
  {
    title: 'Managing Cramps & Pain',
    category: 'exercise',
    content: 'Gentle exercises like walking, light stretching, or yoga can increase blood flow and release endorphins, acting as natural painkillers. Applying a heating pad to your lower abdomen also relaxes uterine muscles.',
  },
  {
    title: 'Emotional Well-being',
    category: 'mental-health',
    content: 'Hormonal shifts can cause mood swings or fatigue. Since you are exempt from obligatory prayers, the sudden change in routine can sometimes feel spiritually isolating. Replace prayer times with dedicated Dhikr, listening to the Quran, or simply resting without guilt.',
  },
  {
    title: 'Hydration & Bloating',
    category: 'nutrition',
    content: 'It sounds counterintuitive, but drinking more water helps your body retain less water, reducing bloating. Aim for at least 8 glasses a day. Herbal teas like peppermint or ginger can also soothe nausea and stomach cramps.',
  },
];

// ─── Legacy compat shims ──────────────────────────────────────
// These allow Dashboard.tsx to keep working without modification

/** @deprecated use startCycle() */
export const activateMenstrualMode = (startedAt?: Date) => {
  const d = startCycle(startedAt ?? new Date());
  const fiqh = getFiqhStatus(d);
  // Return legacy shape
  return {
    isActive: fiqh.salahExempt,
    startedAt: d.cycles[0]?.startDate ?? null,
    cycleLengthDays: d.averagePeriodLength,
    pausePrayerNotifications: d.pausePrayerNotifications,
    pauseQazaAutoSync: d.pauseQazaAutoSync,
    history: d.cycles.filter(c => c.endDate).map(c => ({
      startedAt: c.startDate,
      endedAt: c.endDate!,
      durationDays: c.actualDuration ?? 0,
    })),
  };
};

/** @deprecated use endCycle() */
export const deactivateMenstrualMode = (endedAt?: Date) => {
  const d = endCycle(endedAt ?? new Date());
  return {
    isActive: d.isActive,
    startedAt: null,
    cycleLengthDays: d.averagePeriodLength,
    pausePrayerNotifications: d.pausePrayerNotifications,
    pauseQazaAutoSync: d.pauseQazaAutoSync,
    history: d.cycles.filter(c => c.endDate).map(c => ({
      startedAt: c.startDate,
      endedAt: c.endDate!,
      durationDays: c.actualDuration ?? 0,
    })),
  };
};

/** @deprecated use getHaidhData() */
export const getMenstrualModeData = () => {
  const d = getHaidhData();
  const fiqh = getFiqhStatus(d);
  const active = d.cycles.find(c => c.id === d.currentCycleId);
  return {
    isActive: fiqh.salahExempt,
    startedAt: active?.startDate ? `${active.startDate}T00:00:00.000Z` : null,
    cycleLengthDays: d.averagePeriodLength,
    pausePrayerNotifications: d.pausePrayerNotifications,
    pauseQazaAutoSync: d.pauseQazaAutoSync,
    history: d.cycles.filter(c => c.endDate).map(c => ({
      startedAt: c.startDate,
      endedAt: c.endDate!,
      durationDays: c.actualDuration ?? 0,
    })),
  };
};

/** @deprecated use updateSettings() */
export const updateMenstrualModeSettings = (s: { pausePrayerNotifications?: boolean; pauseQazaAutoSync?: boolean }) => {
  return updateSettings(s);
};

/** @deprecated use updateSettings() */
export const updateCycleLengthDays = (n: number) => {
  return updateSettings({ averagePeriodLength: Math.min(15, Math.max(3, n)) });
};

export const isMenstrualModeActive = () => {
  const d = getHaidhData();
  const fiqh = getFiqhStatus(d);
  return fiqh.salahExempt;
};
