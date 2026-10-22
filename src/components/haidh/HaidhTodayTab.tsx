import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Baby, ChevronDown, Droplets, CheckCircle, Moon, AlertTriangle, Sparkles, Wind, BookOpen, Star, CalendarClock, GlassWater, Thermometer, Heart } from "lucide-react";
import { PRAYER_ALARM_TOGGLE_EVENT } from "@/lib/prayer-alarm-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HaidhGhuslChecklist as GhuslChecklist } from "@/components/haidh/HaidhGhuslChecklist";
import { HaidhSelfCareCard } from "@/components/haidh/HaidhSelfCareCard";
import {
  getCurrentCycle,
  getPredictionConfidence,
  calculateOvulationDay,
  getRegularityInfo,
  logDay,
  getLogForDate,
  startPregnancy,
  weeksDaysPregnant,
  trimesterFor,
  daysUntilDue,
  PREGNANCY_DUAS,
  PREGNANCY_DURATION_DAYS,
  type HaidhTrackerData,
  type FiqhStatus,
  type CyclePhase,
} from "@/lib/haidh-tracker";

interface Props {
  data: HaidhTrackerData;
  fiqh: FiqhStatus;
  onStart: (type: 'haidh' | 'nifas') => void;
  onEnd: () => void;
  onBabyArrived: () => void;
  onTabChange: (t: string) => void;
  /** Controlled visibility of the "Pregnancy Mode" start card (idle state). */
  pregEntryOpen: boolean;
  onPregEntryOpenChange: (open: boolean) => void;
}

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function HaidhTodayTab({ data, fiqh, onStart, onEnd, onBabyArrived, onTabChange, pregEntryOpen, onPregEntryOpenChange }: Props) {
  const cycle = getCurrentCycle(data);
  const today = toDateStr(new Date());
  const pregnancy = data.pregnancy?.active ? data.pregnancy : null;
  const [waterGlasses, setWaterGlasses] = useState(() => {
    const stored = localStorage.getItem(`noor-water-${today}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [painLevel, setPainLevel] = useState(() => getLogForDate(data, today)?.painLevel ?? 0);

  // Pregnancy start card visibility is controlled by the page (header button +
  // the card itself both toggle it) so it can be opened from anywhere.
  const setPregEntryOpen = onPregEntryOpenChange;
  const [pregLmp, setPregLmp] = useState(today);
  const [pregDue, setPregDue] = useState("");
  const [duasOpen, setDuasOpen] = useState(false);

  const activeDays = useMemo(() => {
    if (!cycle) return 0;
    const diff = Math.round((new Date(today).getTime() - new Date(cycle.startDate).getTime()) / 86400000);
    return Math.max(1, diff + 1);
  }, [cycle, today]);

  const progress = cycle ? Math.min((activeDays / cycle.expectedDuration) * 100, 100) : 0;
  const dashOffset = 283 - (283 * progress) / 100;

  const expectedEnd = useMemo(() => {
    if (!cycle) return null;
    const d = new Date(cycle.startDate);
    d.setDate(d.getDate() + cycle.expectedDuration - 1);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, [cycle]);

  const nextPredictedDate = data.nextPredictedStart ? new Date(data.nextPredictedStart) : null;
  const nextPredicted = nextPredictedDate
    ? nextPredictedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const daysToNext = nextPredictedDate
    ? Math.round((nextPredictedDate.getTime() - new Date(today).getTime()) / 86400000)
    : null;

  // Predict phase relative to the current cycle (only meaningful while pure).
  // Ovulation ~14 days before next period; fertile window is ~5 days before ovulation.
  let currentPhase: "tuhr" | "premenstrual" | "fertile" = "tuhr";
  if (!data.isActive && !pregnancy && daysToNext !== null) {
    if (daysToNext <= 7 && daysToNext > 0) currentPhase = "premenstrual";
    else if (daysToNext >= 14 && daysToNext <= 19) currentPhase = "fertile";
  }

  // Self-care phase: pregnancy first, then active bleeding, then cycle phase.
  const selfCarePhase: CyclePhase | "pregnant" = pregnancy
    ? "pregnant"
    : data.isActive
      ? "haidh"
      : currentPhase;

  // Has the most recent cycle just ended (and ghusl not yet logged today)?
  const lastCycle = data.cycles[0];
  const justEnded = !data.isActive && lastCycle?.endDate && daysToNext !== null && daysToNext < 2;

  // Cycle insights
  const regularity = useMemo(() => getRegularityInfo(data), [data]);
  const ovulationDay = useMemo(() => calculateOvulationDay(data), [data]);
  const daysToOvulation = ovulationDay
    ? Math.round((new Date(ovulationDay).getTime() - new Date(today).getTime()) / 86400000)
    : null;

  // ── Pregnancy-derived values ────────────────────────────────
  const pregWeeks = pregnancy ? weeksDaysPregnant(pregnancy.startDate, today) : null;
  const pregTrimester = pregnancy ? trimesterFor(pregnancy.startDate, today) : null;
  const pregDaysTotal = pregnancy
    ? Math.max(0, Math.round((new Date(today).getTime() - new Date(pregnancy.startDate).getTime()) / 86400000))
    : 0;
  const pregProgress = pregnancy ? Math.min((pregDaysTotal / PREGNANCY_DURATION_DAYS) * 100, 100) : 0;
  const pregDashOffset = 283 - (283 * pregProgress) / 100;
  const pregDueDate = pregnancy?.dueDate ? new Date(pregnancy.dueDate) : null;
  const pregDueStr = pregDueDate
    ? pregDueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : null;
  const pregDaysLeft = pregnancy ? daysUntilDue(pregnancy.dueDate, today) : null;
  const madhabLabel = data.madhab.charAt(0).toUpperCase() + data.madhab.slice(1);

  const handleStartPregnancy = () => {
    if (!pregLmp) return;
    // If pregnancy supersedes an active ḥaidh/nifās cycle, restore prayer
    // alarms — they are only ever paused for ḥaidh/nifās, never pregnancy.
    if (data.isActive) {
      localStorage.setItem("prayer-alarm-enabled", "true");
      window.dispatchEvent(new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: true } }));
    }
    startPregnancy({ startDate: pregLmp, dueDate: pregDue || null });
    onPregEntryOpenChange(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[32px] bg-card border border-border p-6 shadow-lg"
      >
        {/* Glow effects — phase-tinted, theme-safe */}
        {data.isActive ? (
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 dark:bg-rose-700/20 rounded-full blur-[20px] pointer-events-none" />
        ) : pregnancy ? (
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 dark:bg-sky-700/20 rounded-full blur-[20px] pointer-events-none" />
        ) : (
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[20px] pointer-events-none" />
        )}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-[20px] pointer-events-none" />

        {data.isActive && cycle ? (
          <div className="relative z-10 flex flex-col items-center">
            {/* Phase strip */}
            <div className="flex items-center gap-2 mb-6 w-full justify-center">
              <div className="h-1.5 w-1/4 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
            </div>

            {/* Circular progress ring */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                <motion.circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="url(#gradient-rose)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="gradient-rose" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9f1239" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500 mb-1">Day</span>
                <span className="text-[5rem] font-bold text-foreground font-serif italic tracking-tight leading-none">{activeDays}</span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2">of {cycle.expectedDuration}</span>
              </div>
            </div>

            <div className="text-center w-full mb-6 overflow-hidden">
              <h2 className="text-2xl font-bold font-serif italic text-foreground tracking-tight truncate">{fiqh.label}</h2>
              {expectedEnd && (
                <p className="text-sm text-muted-foreground mt-1.5 font-medium truncate">
                  Expected end: {expectedEnd}
                </p>
              )}
            </div>

            {fiqh.istihadhahDetected && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 text-sm text-amber-600 dark:text-amber-400 w-full text-left">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Bleeding exceeds the {data.madhab} limit. This may be Istiḥāḍah — please perform Ghusl and resume prayers.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => onTabChange("log")}
                className="h-12 rounded-2xl border-rose-500/30 font-bold"
              >
                <Droplets className="w-4 h-4 mr-2" /> Log Today
              </Button>
              <Button
                onClick={onEnd}
                className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-lg shadow-emerald-900/20 whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4 mr-2 shrink-0" /> End Period
              </Button>
            </div>
          </div>
        ) : pregnancy ? (
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Trimester strip */}
            <div className="flex items-center gap-2 mb-6 w-full justify-center" aria-hidden="true">
              <div className={cn("h-1.5 w-1/3 rounded-full", (pregTrimester ?? 1) >= 1 ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-border")} />
              <div className={cn("h-1.5 w-1/3 rounded-full", (pregTrimester ?? 1) >= 2 ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-border")} />
              <div className={cn("h-1.5 w-1/3 rounded-full", (pregTrimester ?? 1) >= 3 ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-border")} />
            </div>

            {/* Circular progress ring */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                <motion.circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="url(#gradient-sky)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: pregDashOffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="gradient-sky" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0369a1" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Baby className="w-5 h-5 text-sky-500 mb-1" />
                <span className="text-4xl font-bold text-foreground font-serif italic tracking-tight leading-none">
                  {pregWeeks?.weeks ?? 0}<span className="text-xl">w</span>{" "}
                  {pregWeeks?.days ?? 0}<span className="text-xl">d</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-500 mt-2">
                  Trimester {pregTrimester ?? 1}
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold font-serif italic text-foreground tracking-tight mb-1">Pregnancy</h2>
            <p className="text-sm text-muted-foreground font-medium mb-6">
              {pregDueStr ? (
                <>Baby due {pregDueStr}
                  {pregDaysLeft !== null && (
                    <> · <span className="font-bold text-sky-600 dark:text-sky-400">
                      {pregDaysLeft > 0
                        ? `in ${pregDaysLeft} day${pregDaysLeft === 1 ? "" : "s"}`
                        : pregDaysLeft === 0
                          ? "due today"
                          : `${Math.abs(pregDaysLeft)} day${Math.abs(pregDaysLeft) === 1 ? "" : "s"} past`}
                    </span></>
                  )}
                </>
              ) : (
                "May Allah make it easy for you"
              )}
            </p>

            {/* Gentle fiqh note — pregnancy bleeding is istiḥāḍah */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400 w-full text-left mb-4">
              <BookOpen className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Pregnancy bleeding is treated as Istiḥāḍah: pray as normal, with fresh wuḍū for each prayer time ({madhabLabel} practice). After birth, Nifās tracking begins.
              </p>
            </div>
            <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Prayer alerts stay on — pregnant women pray as normal.
            </p>

            <Button
              onClick={onBabyArrived}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-500 hover:from-rose-600 hover:to-rose-400 font-bold text-base shadow-xl"
              aria-label="Baby has arrived — end pregnancy and start Nifas tracking"
            >
              <Baby className="w-5 h-5 mr-2" /> Baby arrived — start Nifās
            </Button>

            {/* Duas of pregnancy & birth (Qur'anic only) */}
            <div className="w-full mt-6 rounded-2xl border border-border bg-background/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setDuasOpen(o => !o)}
                aria-expanded={duasOpen}
                aria-label="Show duas of pregnancy and birth"
                className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" /> {PREGNANCY_DUAS.title}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", duasOpen && "rotate-180")} />
              </button>
              {duasOpen && (
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-xs text-muted-foreground text-left">{PREGNANCY_DUAS.note}</p>
                  {PREGNANCY_DUAS.duas.map(dua => (
                    <div key={dua.id} className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                      <p className="text-xs font-bold text-primary text-left mb-2">{dua.title}</p>
                      <p className="font-arabic text-primary text-xl leading-loose text-center" dir="rtl">{dua.arabic}</p>
                      <p className="text-center text-xs font-medium text-foreground/80 italic mt-2">"{dua.transliteration}"</p>
                      <p className="text-center text-xs text-muted-foreground mt-1">{dua.translation}</p>
                      <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mt-2">{dua.reference}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Phase strip */}
            <div className="flex items-center gap-2 mb-8 w-full justify-center">
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
              <div className={cn("h-1.5 w-1/4 rounded-full", currentPhase === "tuhr" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", currentPhase !== "tuhr" && "bg-border")} />
              <div className={cn("h-1.5 w-1/4 rounded-full", currentPhase === "fertile" && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", currentPhase !== "fertile" && "bg-border")} />
              <div className={cn("h-1.5 w-1/4 rounded-full", currentPhase === "premenstrual" && "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]", currentPhase !== "premenstrual" && "bg-border")} />
            </div>

            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/15" />
              <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Moon className="w-10 h-10 text-emerald-500" />
              </div>
            </div>

            <h2 className="text-4xl font-bold font-serif italic tracking-tight mb-2 text-foreground">Ṭuhr</h2>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs tracking-[0.2em] uppercase mb-6">Purity Phase</p>

            <div className="bg-card border border-border rounded-2xl p-4 w-full mb-6 shadow-sm">
              {nextPredicted ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground/80 font-medium">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  Next cycle ~{nextPredicted}
                  {daysToNext !== null && daysToNext > 0 && (
                    <span className="text-muted-foreground">· in {daysToNext}d</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-medium">
                  Log more cycles to enable predictions
                </p>
              )}
              {nextPredicted && (
                <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mt-2">
                  {getPredictionConfidence(data)}
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <Button
                onClick={() => onStart('haidh')}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-500 hover:from-rose-600 hover:to-rose-400 font-bold text-base shadow-xl"
              >
                <Droplets className="w-5 h-5 mr-2" /> Start Ḥaidh
              </Button>
              <Button
                onClick={() => onStart('nifas')}
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-bold"
              >
                Start Nifās
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Pregnancy Mode entry — prominent, directly under the hero (idle only).
          Visibility is controlled from the page so the header button can open it. */}
      {!data.isActive && !pregnancy && (
        <div
          className="rounded-2xl border bg-card shadow-sm overflow-hidden"
          style={{
            borderColor: pregEntryOpen ? "rgba(14,165,233,0.45)" : "rgba(14,165,233,0.25)",
            background: "linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(14,165,233,0.02) 100%), oklch(var(--card))",
          }}
        >
          <button
            type="button"
            onClick={() => onPregEntryOpenChange(!pregEntryOpen)}
            aria-expanded={pregEntryOpen}
            aria-label="Pregnancy Mode — track your pregnancy"
            className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
          >
            <span className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
              <Baby className="w-5 h-5 text-sky-500" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-black text-foreground tracking-tight">Pregnancy Mode</span>
              <span className="block text-xs text-muted-foreground">Expecting? Track week by week — prayers continue as normal</span>
            </span>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {pregEntryOpen ? "Close" : "Start"}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", pregEntryOpen && "rotate-180")} />
          </button>
          {pregEntryOpen && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label htmlFor="preg-lmp" className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">First day of last period</label>
                <input
                  id="preg-lmp"
                  type="date"
                  value={pregLmp}
                  onChange={e => setPregLmp(e.target.value)}
                  className="w-full h-11 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="preg-due" className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Due date (optional)</label>
                <input
                  id="preg-due"
                  type="date"
                  value={pregDue}
                  onChange={e => setPregDue(e.target.value)}
                  className="w-full h-11 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
                />
              </div>
              <Button
                onClick={handleStartPregnancy}
                disabled={!pregLmp}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-400 hover:from-sky-500 hover:to-sky-300 font-bold text-white shadow-lg"
                aria-label="Start pregnancy mode"
              >
                <Baby className="w-4 h-4 mr-2" /> Start Pregnancy Mode
              </Button>
              <p className="text-[10px] text-muted-foreground/70 text-center">
                Due date is estimated from LMP (+280 days) unless you enter one.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ghusl checklist — appears right after a period ends */}
      {justEnded && <GhuslChecklist data={data} />}

      {/* Islamic Status Banner */}
      <div className="bg-card border border-primary/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-primary/5">
          <BookOpen className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Fiqh Exemption Status</span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            {[
              { label: "Ṣalāh", exempt: fiqh.salahExempt, icon: Sparkles },
              { label: "Fasting", exempt: fiqh.fastingExempt, icon: Moon },
              { label: "Ṭawāf", exempt: !fiqh.tawafPermitted, icon: Wind },
              { label: "Dhikr", exempt: false, icon: Star },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  item.exempt ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-500"
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium truncate">{item.label}</p>
                  <p className={cn("font-bold text-sm truncate", item.exempt ? "text-rose-500" : "text-emerald-500")}>
                    {item.exempt ? "Exempt" : "Active"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase-based self-care card */}
      <HaidhSelfCareCard phase={selfCarePhase} />

      {/* Fertile window info */}
      {currentPhase === "fertile" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌱</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              Fertile Window
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            You may be in your fertile window.
            {daysToOvulation !== null && daysToOvulation >= 0
              ? ` Ovulation predicted in ~${daysToOvulation} day${daysToOvulation !== 1 ? "s" : ""}.`
              : ` Ovulation typically occurs around ${daysToNext !== null ? daysToNext - 14 : "~14"} days before your next cycle.`}
          </p>
        </div>
      )}

      {/* Cycle insights */}
      {regularity.variation > 0 && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📊</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Cycle Insights</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              regularity.score === "regular" && "bg-emerald-500/15 text-emerald-500",
              regularity.score === "slightly-irregular" && "bg-amber-500/15 text-amber-500",
              regularity.score === "irregular" && "bg-rose-500/15 text-rose-500",
            )}>
              {regularity.score === "regular" ? "Regular" : regularity.score === "slightly-irregular" ? "Slightly Irregular" : "Irregular"}
            </span>
            <span className="text-xs text-muted-foreground">
              ±{regularity.variation}d variation
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {regularity.trend === "increasing" ? "📈" : regularity.trend === "decreasing" ? "📉" : "➡️"} {regularity.trend}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Avg {regularity.averageCycle}d · Range {regularity.minCycle}–{regularity.maxCycle}d · Based on last {data.cycles.filter(c => c.endDate).length} cycles
          </p>
        </div>
      )}

      {/* ── Water intake tracker ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-[28px] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GlassWater className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-black uppercase tracking-widest text-blue-500">Daily Water</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">{waterGlasses}/8 glasses</span>
        </div>
        <div className="flex gap-1.5 mb-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const next = i < waterGlasses ? i : i + 1;
                setWaterGlasses(next);
                localStorage.setItem(`noor-water-${today}`, String(next));
              }}
              className={`flex-1 h-8 rounded-lg transition-all border ${
                i < waterGlasses
                  ? 'bg-blue-500/20 border-blue-500/40'
                  : 'bg-muted/40 border-border'
              }`}
            >
              <GlassWater className={`w-3 h-3 mx-auto transition-colors ${
                i < waterGlasses ? 'text-blue-500' : 'text-muted-foreground/30'
              }`} />
            </button>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${(waterGlasses / 8) * 100}%` }}
          />
        </div>
        {data.isActive && (
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            Staying hydrated helps reduce cramping and fatigue.
          </p>
        )}
      </div>

      {/* ── Pain level quick-log ──────────────────────────────────────── */}
      {data.isActive && (
        <div className="bg-card border border-border rounded-[28px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">Pain Level</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{painLevel === 0 ? 'None' : painLevel <= 3 ? 'Mild' : painLevel <= 6 ? 'Moderate' : 'Severe'}</span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => {
              const lvl = i + 1;
              const active = lvl <= painLevel;
              return (
                <button
                  key={i}
                  onClick={() => {
                    const next = lvl === painLevel ? 0 : lvl;
                    setPainLevel(next);
                    logDay(new Date(), { painLevel: next });
                  }}
                  className={`flex-1 h-7 rounded-md transition-all ${
                    active
                      ? lvl <= 3 ? 'bg-emerald-500/60' : lvl <= 6 ? 'bg-amber-500/60' : 'bg-rose-500/60'
                      : 'bg-muted/40'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg Cycle", value: `${data.averageCycleLength}d`, icon: "🔄", highlight: false },
          { label: "Avg Period", value: `${data.averagePeriodLength}d`, icon: "📅", highlight: false },
          { label: "Fasts Owed", value: `${Math.max(0, data.missedRamadanFasts - data.madeUpRamadanFasts)}`, icon: "🌙", highlight: (data.missedRamadanFasts - data.madeUpRamadanFasts) > 0 },
        ].map(s => (
          <div key={s.label} className={cn(
            "bg-card border rounded-2xl p-4 text-center shadow-sm",
            s.highlight ? "border-amber-500/30" : "border-border"
          )}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className={cn("text-2xl font-bold font-serif italic", s.highlight ? "text-amber-500" : "text-foreground")}>{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
