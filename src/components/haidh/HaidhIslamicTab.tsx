import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, BookOpen, AlertTriangle, CheckCircle, Moon, Wind, BookHeart, Droplets, ChevronDown, RotateCcw, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HaidhGhuslChecklist as GhuslChecklist } from "@/components/haidh/HaidhGhuslChecklist";
import {
  PHASE_DUAS,
  MADHAB_RULES,
  markFastMadeUp,
  getCurrentCycle,
  HAIDH_EDUCATION,
  WELLNESS_ARTICLES,
  type HaidhTrackerData,
  type FiqhStatus,
} from "@/lib/haidh-tracker";

interface Props {
  data: HaidhTrackerData;
  fiqh: FiqhStatus;
}

const MADHAB_LABEL: Record<string, string> = {
  hanafi: "Hanafi", maliki: "Maliki", shafii: "Shafiʿi", hanbali: "Hanbali",
};

// ─── Interactive dhikr counter (persisted per day, separate key) ──
const DHIKR_COUNTS_KEY = "haidh-dhikr-counts-v1";

type DhikrCounts = Record<string, Record<string, number>>; // YYYY-MM-DD → dhikr text → count

const toDayKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const loadDhikrCounts = (): DhikrCounts => {
  try {
    const raw = localStorage.getItem(DHIKR_COUNTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DhikrCounts) : {};
  } catch {
    return {};
  }
};

const saveDhikrCounts = (counts: DhikrCounts): void => {
  // Keep only the last 30 days of tallies so the key stays small.
  const dates = Object.keys(counts).sort();
  const trimmed: DhikrCounts = {};
  for (const d of dates.slice(-30)) trimmed[d] = counts[d];
  try {
    localStorage.setItem(DHIKR_COUNTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — dhikr tallies are non-critical, fail silently.
  }
};

// Pick the right phase content for Duas & wellness.
function phaseContent(data: HaidhTrackerData, fiqh: FiqhStatus) {
  if (fiqh.istihadhahDetected) return PHASE_DUAS.haidh; // istiḥāḍah → resume normal ʿibādah
  if (fiqh.phase === "haidh") return PHASE_DUAS.haidh;
  return PHASE_DUAS.tuhr;
}

export function HaidhIslamicTab({ data, fiqh }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openArticle, setOpenArticle] = useState<number | null>(null);
  const cycle = getCurrentCycle(data);
  const isNifas = cycle?.bleedingType === "nifas";
  const content = phaseContent(data, fiqh);

  // ── Dhikr counter state (counts reset daily by date key) ──
  const todayKey = toDayKey(new Date());
  const [countsToday, setCountsToday] = useState<Record<string, number>>(() => {
    const all = loadDhikrCounts();
    return { ...(all[todayKey] ?? {}) };
  });

  const handleCount = (text: string) => {
    const next = { ...countsToday, [text]: (countsToday[text] ?? 0) + 1 };
    setCountsToday(next);
    const all = loadDhikrCounts();
    all[todayKey] = next;
    saveDhikrCounts(all);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(10); } catch { /* haptics unavailable */ }
    }
  };

  const handleResetDhikr = () => {
    setCountsToday({});
    const all = loadDhikrCounts();
    delete all[todayKey];
    saveDhikrCounts(all);
    toast.success("Today's dhikr counts cleared");
  };

  // Fall back to the daily tasbīḥ set when the phase has no curated dhikr.
  const dhikrItems = content.dhikr.length > 0 ? content.dhikr : PHASE_DUAS.haidh.dhikr;
  const dhikrTitle = content.dhikr.length > 0 ? "Recommended Dhikr — tap to count" : "Daily Dhikr — tap to count";
  const dhikrTotal = Object.values(countsToday).reduce<number>((sum, n) => sum + (typeof n === "number" ? n : 0), 0);

  const owed = Math.max(0, data.missedRamadanFasts - data.madeUpRamadanFasts);
  const rules = MADHAB_RULES[data.madhab];

  const handleMadeUp = () => {
    markFastMadeUp();
    toast.success("Fast marked as made up");
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hero header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-primary">Fiqh & Wellness</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-[260px] mx-auto">
          Islamic guidance tailored to your current cycle phase.
        </p>
      </div>

      {/* Istihadhah alert */}
      {fiqh.istihadhahDetected && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-3xl p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-amber-600 dark:text-amber-400 font-black text-lg">Istiḥāḍah Alert</h3>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                Your bleeding has exceeded the maximum duration for the {MADHAB_LABEL[data.madhab]} madhab.
                This may be classified as Istiḥāḍah (irregular bleeding).
              </p>
              <div className="mt-4 bg-background/60 rounded-2xl p-4 text-sm text-foreground/70">
                <p className="font-bold text-foreground mb-2">Required Actions:</p>
                <ul className="space-y-2">
                  <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Perform Ghusl (ritual bath).</li>
                  <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Resume Salah with fresh Wudu for each prayer time.</li>
                  <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Resume fasting if in Ramadan.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pregnancy mode note — praying continues as normal */}
      {fiqh.isPregnant && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
              <Baby className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h3 className="font-black text-sky-600 dark:text-sky-400">Pregnancy — Praying Normally</h3>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                You are in Pregnancy Mode. Prayer alerts stay on — pregnant women pray as normal.
                Any bleeding during pregnancy is treated as Istiḥāḍah: perform wuḍū for each prayer
                time ({MADHAB_LABEL[data.madhab]} practice) and pray. When the baby arrives, Nifās
                tracking begins — tap "Baby arrived" on the Today tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nifas explainer + postpartum wellness */}
      {isNifas && !fiqh.istihadhahDetected && (
        <div className="space-y-4">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-rose-600 dark:text-rose-400">Nifās (Postpartum)</h3>
                <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                  You are logging postpartum bleeding. The same exemptions as Ḥaidh apply. The {MADHAB_LABEL[data.madhab]} limit is up to {rules.maxNifas} days; bleeding beyond that is treated as Istiḥāḍah.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5">
            <h3 className="font-black text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" /> Postpartum Wellness
            </h3>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex gap-2 items-start"><Moon className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Rest as much as possible — your body is recovering.</li>
              <li className="flex gap-2 items-start"><BookHeart className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Make duʿā for your newborn: <span dir="rtl" className="font-arabic">بارك الله لك في الموهوب</span> (Bārak Allāhu laka fī al-mawhūb).</li>
              <li className="flex gap-2 items-start"><Wind className="w-4 h-4 text-primary shrink-0 mt-0.5" /> During Nifās, the same exemptions as Ḥaidh apply — focus on dhikr and duʿā.</li>
              <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> When bleeding stops, perform Ghusl and resume prayers even if before {rules.maxNifas} days.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Fiqh status */}
      <div className="bg-card border border-border rounded-[32px] overflow-hidden shadow-lg">
        <div className={cn(
          "p-6 border-b border-border relative overflow-hidden",
          fiqh.phase === "haidh" ? "bg-rose-500/10" : "bg-emerald-500/10"
        )}>
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Current Status</h3>
          <div className="flex justify-between items-center relative z-10">
            <p className={cn(
              "text-2xl font-black",
              fiqh.phase === "haidh" ? "text-rose-500" : "text-emerald-500"
            )}>
              {fiqh.label}
            </p>
            <span className="px-3 py-1 bg-background/60 rounded-full text-xs font-bold text-foreground/70 border border-border">
              {MADHAB_LABEL[data.madhab]} Fiqh
            </span>
          </div>
        </div>
        <div className="p-2">
          {[
            { label: "Ṣalāh (Prayer)", exempt: fiqh.salahExempt, icon: Heart },
            { label: "Ṣawm (Fasting)", exempt: fiqh.fastingExempt, icon: Moon },
            { label: "Ṭawāf (Kaaba)", exempt: !fiqh.tawafPermitted, icon: Wind },
            { label: "Dhikr & Duʿā", exempt: false, icon: BookOpen },
          ].map((rule) => (
            <div key={rule.label} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  rule.exempt ? "bg-rose-500/15" : "bg-emerald-500/15"
                )}>
                  <rule.icon className={cn("w-4 h-4", rule.exempt ? "text-rose-500" : "text-emerald-500")} />
                </div>
                <span className="font-bold text-foreground">{rule.label}</span>
              </div>
              <span className={cn(
                "text-sm font-black tracking-wider uppercase",
                rule.exempt ? "text-rose-500" : "text-emerald-500"
              )}>
                {rule.exempt ? "Exempt" : "Active"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Madhab info (selector lives in Settings) */}
      <div className="bg-card border border-border rounded-[32px] p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
          <BookOpen className="w-3 h-3" /> Your Madhab
        </h3>
        <p className="font-bold text-foreground">{MADHAB_LABEL[data.madhab]}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ḥaidh {rules.minHaidh}–{rules.maxHaidh} days · min Ṭuhr {rules.minTuhr}d · Nifās up to {rules.maxNifas}d.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Change your school of thought in Settings to adjust Istiḥāḍah detection.
        </p>
      </div>

      {/* Ghusl checklist (always available to complete purification steps) */}
      {!data.isActive && <GhuslChecklist data={data} />}

      {/* Missed Ramadan fast tracker */}
      <div className="bg-card border border-border rounded-[32px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookHeart className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-primary">Missed Ramadan Fasts</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-black text-foreground">
              {owed}
              <span className="text-sm font-medium text-muted-foreground ml-2">to make up</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.madeUpRamadanFasts} of {data.missedRamadanFasts} completed
            </p>
          </div>
          <Button
            onClick={handleMadeUp}
            disabled={owed === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Made up one
          </Button>
        </div>
        {data.missedRamadanFasts > 0 && (
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(data.madeUpRamadanFasts / data.missedRamadanFasts) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Phase-specific Duas & Dhikr (data-driven) */}
      <div className="bg-card border border-border rounded-[32px] p-6 shadow-lg">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-5 flex items-center gap-2">
          <Heart className="w-4 h-4" /> {content.title}
        </h3>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-5">
          <p className={cn("font-arabic text-center text-primary leading-loose mb-3 text-2xl")} dir="rtl">
            {content.arabic}
          </p>
          <p className="text-center text-sm font-medium text-foreground/80 italic mb-1">
            "{content.transliteration}"
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {content.translation}
          </p>
        </div>

        {/* Interactive dhikr counter — tap to count, resets daily */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-foreground text-sm">{dhikrTitle}</h4>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium" aria-live="polite">
                Today: <span className="font-black text-primary tabular-nums">{dhikrTotal}</span>
              </span>
              <button
                type="button"
                onClick={handleResetDhikr}
                aria-label="Reset today's dhikr counts"
                title="Reset today's counts"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-3">
            Tap a card each time you say it — counts reset each day.
          </p>
          <div className="space-y-2">
            {dhikrItems.map(d => {
              const count = countsToday[d.text] ?? 0;
              const goal = d.count ?? 0;
              const done = goal > 0 && count >= goal;
              const pct = goal > 0 ? Math.min(100, (count / goal) * 100) : 0;
              return (
                <motion.button
                  key={d.text}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCount(d.text)}
                  aria-label={`Count ${d.text} — currently ${count}${goal > 0 ? ` of ${goal}` : ""}`}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-center transition-colors select-none",
                    done
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-background border-border hover:bg-muted/40 active:bg-muted/60"
                  )}
                >
                  <span className="flex items-center justify-between gap-3 w-full">
                    <span className="min-w-0 text-left">
                      <span className="block font-arabic text-primary text-lg leading-snug" dir="rtl">{d.arabic}</span>
                      <span className="block font-bold text-foreground text-sm mt-1">{d.text}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 flex items-center justify-center min-w-[44px] h-9 px-2 rounded-xl text-sm font-black tabular-nums",
                        done ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"
                      )}
                    >
                      {goal > 0 ? `${count}/${goal}` : `×${count}`}
                    </span>
                  </span>
                  {goal > 0 && (
                    <span className="block mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
                      <span
                        className={cn("block h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wellness tips */}
      <div className="bg-card border border-border rounded-[32px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Wellness Tips</h3>
        </div>
        <ul className="space-y-3">
          {content.wellness.map((tip, i) => (
            <li key={i} className="flex gap-3 items-start text-sm text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Education FAQ */}
      <div className="bg-card border border-border rounded-[32px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Islamic Knowledge</h3>
        </div>
        <div className="space-y-2">
          {HAIDH_EDUCATION.map((item, i) => (
            <div key={i} className="border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left text-sm font-bold text-foreground hover:bg-muted/30 transition-colors"
              >
                {item.question}
                <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform ml-2", openFaq === i && "rotate-180")} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-foreground/80 leading-relaxed space-y-2">
                  {item.answer.split('\n').map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                  {item.source && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{item.source}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Women's Health & Wellness Articles */}
      <div className="bg-card border border-border rounded-[32px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-rose-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Health & Wellness</h3>
        </div>
        <div className="space-y-2">
          {WELLNESS_ARTICLES.map((item, i) => (
            <div key={i} className="border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenArticle(openArticle === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left text-sm font-bold text-foreground hover:bg-muted/30 transition-colors"
              >
                {item.title}
                <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform ml-2", openArticle === i && "rotate-180")} />
              </button>
              {openArticle === i && (
                <div className="px-4 pb-4 text-sm text-foreground/80 leading-relaxed bg-muted/10 rounded-b-2xl">
                  <p>{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Verified Islamic Resources */}
      <div className="bg-card border border-border rounded-[32px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verified Islamic Resources</h3>
        </div>
        <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
          For detailed Fiqh questions regarding your specific situation, please refer to these verified resources or consult a local scholar.
        </p>
        <div className="space-y-3">
          <a href="https://seekersguidance.org/answers/" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors bg-muted/20 group">
            <h4 className="font-bold text-primary mb-1 group-hover:underline">SeekersGuidance</h4>
            <p className="text-xs text-muted-foreground">Reliable answers based on the 4 Madhabs</p>
          </a>
          <a href="https://islamqa.org/" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors bg-muted/20 group">
            <h4 className="font-bold text-primary mb-1 group-hover:underline">IslamQA.org</h4>
            <p className="text-xs text-muted-foreground">Hanafi, Shafi'i, Maliki & Hanbali fatwas</p>
          </a>
          <a href="https://islamqa.info/en" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors bg-muted/20 group">
            <h4 className="font-bold text-primary mb-1 group-hover:underline">IslamQA.info</h4>
            <p className="text-xs text-muted-foreground">Comprehensive fatwa database</p>
          </a>
        </div>
      </div>
    </div>
  );
}
