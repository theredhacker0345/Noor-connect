import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar as CalIcon, Droplets, BookOpen,
  Settings as SettingsIcon, HeartPulse, TrendingUp, ChevronLeft, Baby,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { goBackOrFallback } from "@/lib/navigation";
import { PRAYER_ALARM_CONTROL_EVENT, PRAYER_ALARM_TOGGLE_EVENT } from "@/lib/prayer-alarm-events";

import {
  getHaidhData,
  getFiqhStatus,
  startCycle,
  endCycle,
  endPregnancy,
  weeksDaysPregnant,
  logDay,
  updateSettings,
  type HaidhTrackerData,
  type DailyLog,
} from "@/lib/haidh-tracker";
import { syncHaidhNotifications } from "@/lib/haidh-notifications";

import { HaidhTodayTab as TodayTab } from "@/components/haidh/HaidhTodayTab";
import { HaidhCalendarTab as CalendarTab } from "@/components/haidh/HaidhCalendarTab";
import { HaidhLogTab as LogTab } from "@/components/haidh/HaidhLogTab";
import { HaidhIslamicTab as IslamicTab } from "@/components/haidh/HaidhIslamicTab";
import { HaidhSettingsTab as SettingsTab } from "@/components/haidh/HaidhSettingsTab";
import { HaidhAnalyticsTab as AnalyticsTab } from "@/components/haidh/HaidhAnalyticsTab";

const TABS = [
  { id: "today",     icon: HeartPulse, label: "Today"     },
  { id: "calendar",  icon: CalIcon,    label: "Calendar"  },
  { id: "log",       icon: Droplets,   label: "Log"       },
  { id: "analytics", icon: TrendingUp, label: "Stats"     },
  { id: "islamic",   icon: BookOpen,   label: "Fiqh"      },
  { id: "settings",  icon: SettingsIcon, label: "Settings"},
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function HaidhTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [data, setData] = useState<HaidhTrackerData>(getHaidhData());
  const [fiqh, setFiqh] = useState(getFiqhStatus(getHaidhData()));
  const [isAuthenticated, setIsAuthenticated] = useState(!getHaidhData().pinCode);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  // "Pregnancy Mode" start card on the Today tab — openable from the header.
  const [pregEntryOpen, setPregEntryOpen] = useState(false);
  const canShowPregnancyEntry = !data.isActive && !data.pregnancy?.active;

  const openPregnancyMode = () => {
    setActiveTab("today");
    setPregEntryOpen(true);
  };

  useEffect(() => {
    const handleUpdate = () => {
      const newData = getHaidhData();
      setData(newData);
      setFiqh(getFiqhStatus(newData));
    };
    window.addEventListener("haidh-tracker-updated", handleUpdate);
    return () => window.removeEventListener("haidh-tracker-updated", handleUpdate);
  }, []);

  useEffect(() => {
    // Pregnancy mode: period-prediction / daily-log reminders make no sense
    // while expecting, so suppress them for the sync call (prayer notifications
    // are NOT paused — pregnant women pray normally).
    const effective = data.pregnancy?.active
      ? { ...data, periodPredictionReminderEnabled: false, dailyLogReminderEnabled: false }
      : data;
    void syncHaidhNotifications(effective);
  }, [data]);

  const handleStart = async (type: "haidh" | "nifas") => {
    const updated = startCycle(new Date(), type);
    localStorage.setItem("prayer-alarm-enabled", "false");
    window.dispatchEvent(new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: false } }));
    window.dispatchEvent(new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: "stop" } }));
    if (updated.pausePrayerNotifications) {
      try {
        const { localNotifications } = await import("@/lib/local-notifications");
        await localNotifications.clearPrayerNotifications();
      } catch (e) { console.error("Failed to clear prayer notifications", e); }
    }
  };

  const handleEnd = async () => {
    endCycle();
    const updated = getHaidhData();
    localStorage.setItem("prayer-alarm-enabled", "true");
    window.dispatchEvent(new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: true } }));
    if (updated.pausePrayerNotifications) {
      try {
        const { localNotifications } = await import("@/lib/local-notifications");
        await localNotifications.schedulePrayerNotificationsFromAPI();
      } catch (e) { console.error("Failed to reschedule prayer notifications", e); }
    }
  };

  const handleLog = (log: Partial<DailyLog>) => logDay(new Date(), log);
  const handleSettingsUpdate = (patch: Partial<HaidhTrackerData>) => updateSettings(patch);
  const goBack = () => goBackOrFallback(navigate, "/");

  // Ends pregnancy, then opens a Nifās cycle (pausing prayer alerts as with
  // any ḥaidh/nifās cycle) — pregnancy itself never pauses them.
  const handleBabyArrived = async () => {
    endPregnancy();
    await handleStart("nifas");
  };

  // ── PIN lock screen ────────────────────────────────────────────────────────
  const tryPin = (pin: string) => {
    if (pin === data.pinCode) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 800);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-5"
        style={{ background: "radial-gradient(ellipse at 60% 20%, rgba(244,63,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), oklch(var(--background))" }}
      >
        <button
          onClick={goBack}
          className="absolute top-6 left-5 w-10 h-10 rounded-full flex items-center justify-center bg-muted/60 border border-border hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-rose-500/15 border border-rose-500/30" />
          <HeartPulse className="w-9 h-9 text-rose-500 relative z-10" />
        </div>

        <h1 className="text-2xl font-black mb-1 tracking-tight">Noor Cycle</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">Enter your PIN to continue</p>

        {/* PIN dots */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                pinInput.length > i
                  ? "bg-rose-500 border-rose-500 scale-110"
                  : "border-border",
                pinError && "border-red-500 bg-red-500/20 animate-shake"
              )}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (pinInput.length < 4) {
                  const next = pinInput + num;
                  setPinInput(next);
                  if (next.length === 4) setTimeout(() => tryPin(next), 80);
                }
              }}
              className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-semibold bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          <div />
          {[0, "⌫"].map((val) => (
            <button
              key={String(val)}
              onClick={() => {
                if (val === "⌫") {
                  setPinInput((p) => p.slice(0, -1));
                } else {
                  if (pinInput.length < 4) {
                    const next = pinInput + "0";
                    setPinInput(next);
                    if (next.length === 4) setTimeout(() => tryPin(next), 80);
                  }
                }
              }}
              className="aspect-square rounded-2xl flex items-center justify-center text-xl font-medium bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              {val}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Main app ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-background text-foreground z-[100] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 relative overflow-hidden border-b border-border/60"
        style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.08) 0%, rgba(139,92,246,0.04) 100%)" }}
      >
        <div className="flex items-center px-4 h-14 gap-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/60 border border-border hover:bg-muted transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center border border-rose-500/20">
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-rose-600 to-rose-400 dark:from-rose-400 dark:to-rose-300 bg-clip-text text-transparent">
              Noor Cycle
            </h1>
            <div className="ml-auto flex items-center gap-2">
              {canShowPregnancyEntry && (
                <button
                  type="button"
                  onClick={openPregnancyMode}
                  aria-label="Open Pregnancy Mode"
                  className="h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/20 active:scale-95 transition-all"
                >
                  <Baby className="w-3.5 h-3.5" />
                  Pregnancy
                </button>
              )}
              {data.isActive && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Active
                </span>
              )}
              {!data.isActive && data.pregnancy?.active && (
                <span
                  className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full"
                  aria-label="Pregnancy mode active"
                >
                  <Baby className="w-3 h-3" />
                  {(() => {
                    const d = new Date();
                    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    return weeksDaysPregnant(data.pregnancy!.startDate, localToday).weeks;
                  })()}w Pregnant
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-5 pb-28">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === "today"     && <TodayTab data={data} fiqh={fiqh} onStart={handleStart} onEnd={handleEnd} onBabyArrived={handleBabyArrived} onTabChange={(t) => setActiveTab(t as TabId)} pregEntryOpen={pregEntryOpen} onPregEntryOpenChange={setPregEntryOpen} />}
              {activeTab === "calendar"  && <CalendarTab data={data} />}
              {activeTab === "log"       && <LogTab data={data} onLog={handleLog} />}
              {activeTab === "analytics" && <AnalyticsTab data={data} />}
              {activeTab === "islamic"   && <IslamicTab data={data} fiqh={fiqh} />}
              {activeTab === "settings"  && <SettingsTab data={data} onUpdate={handleSettingsUpdate} onBabyArrived={handleBabyArrived} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Bottom Tab Bar ─────────────────────────────────────────────────── */}
      <nav
        className="shrink-0 border-t border-border/60 bg-card/90 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-14 px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl mx-0.5 my-1 transition-all duration-200 relative",
                  isActive
                    ? "text-rose-500"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-rose-500/10 rounded-xl"
                  />
                )}
                <Icon className={cn("w-[18px] h-[18px] relative z-10 transition-transform", isActive && "scale-110")} />
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider relative z-10 transition-opacity",
                  isActive ? "opacity-100" : "opacity-60"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
