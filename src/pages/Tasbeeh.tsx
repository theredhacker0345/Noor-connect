import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Sparkles, History, ChevronRight, Volume2, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTasbeehTotal, getTasbeehHistory, addTasbeehEntry, setTasbeehTotal } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AppBar } from "@/components/AppBar";
import { useI18n } from "@/hooks/useI18n";

const DHIKR_OPTIONS = [
  { value: "subhanallah", label: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", translation: "Glory be to Allah" },
  { value: "alhamdulillah", label: "ٱلْحَمْدُ لِلَّٰهِ", transliteration: "Alhamdulillah", translation: "Praise be to Allah" },
  { value: "allahuakbar", label: "اللَّٰهُ أَكْبَرُ", transliteration: "Allahu Akbar", translation: "Allah is the Greatest" },
  { value: "lailahaillallah", label: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah", translation: "None has the right to be worshipped but Allah" },
  { value: "astagfirullah", label: "أَسْتَغْفِرُ ٱللَّٰهَ", transliteration: "Astagfirullah", translation: "I seek forgiveness from Allah" },
];

const dhikrMeaningKey = (value: string) =>
  `dhikrMeaning${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const Tasbeeh = () => {
  const navigate = useNavigate();
  const { t, formatNumber } = useI18n();
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState(DHIKR_OPTIONS[0].value);
  const [dailyHistory, setDailyHistory] = useState<{ date: string; count: number; label: string }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDhikr = DHIKR_OPTIONS.find(d => d.value === selectedDhikr) || DHIKR_OPTIONS[0];
  const label = currentDhikr.transliteration;

  useEffect(() => {
    setTotalCount(getTasbeehTotal());
    setDailyHistory(getTasbeehHistory());
  }, []);

  // Enhanced haptic feedback patterns
  const triggerHapticFeedback = (type: 'increment' | 'milestone' | 'reset' | 'select' = 'increment') => {
    if (!('vibrate' in navigator)) return;

    switch (type) {
      case 'increment':
        // Single tap for normal increment
        navigator.vibrate(8);
        break;
      case 'milestone':
        // Double pulse for milestone achievements
        navigator.vibrate([10, 50, 10]);
        break;
      case 'reset':
        // Long vibration for reset confirmation
        navigator.vibrate([15, 30, 15, 30, 15]);
        break;
      case 'select':
        // Short pulse for selection changes
        navigator.vibrate(5);
        break;
    }
  };

  const handleIncrement = () => {
    const newCount = count + 1;
    const previousCount = count;
    setCount(newCount);
    addTasbeehEntry(label);
    setTotalCount(getTasbeehTotal());
    setDailyHistory(getTasbeehHistory());
    setIsAnimating(true);

    // Enhanced haptic feedback with milestone detection
    if (newCount === 33 || newCount === 99 || newCount === 100 || (newCount % 100 === 0 && newCount > 0)) {
      triggerHapticFeedback('milestone');
    } else {
      triggerHapticFeedback('increment');
    }

    setTimeout(() => setIsAnimating(false), 100);
  };

  const handleReset = () => {
    if (confirm(t('resetCurrentCounter'))) {
      setCount(0);
      triggerHapticFeedback('reset');
    }
  };

  const handleDhikrChange = (value: string) => {
    setSelectedDhikr(value);
    setCount(0);
    triggerHapticFeedback('select');
  };

  const toggleZenMode = () => {
    setZenMode(!zenMode);
    triggerHapticFeedback('select');
  };

  const handleZenTouchStart = () => {
    longPressRef.current = setTimeout(() => {
      setZenMode(false);
      triggerHapticFeedback('reset');
      longPressRef.current = null;
    }, 800);
  };

  const handleZenTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const nextMilestone = count < 33 ? 33 : count < 99 ? 99 : count < 100 ? 100 : Math.ceil((count + 1) / 100) * 100;
  const progress = (count / nextMilestone) * 100;

  // Zen Mode overlay
  if (zenMode) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none"
        onClick={handleIncrement}
        onTouchStart={handleZenTouchStart}
        onTouchEnd={handleZenTouchEnd}
        onMouseDown={handleZenTouchStart}
        onMouseUp={handleZenTouchEnd}
        onMouseLeave={handleZenTouchEnd}
      >
        {/* Dhikr label */}
        <div className="absolute top-12 left-0 right-0 text-center">
          <p className="text-white/40 text-sm font-medium tracking-wide">{currentDhikr.transliteration}</p>
        </div>

        {/* Count */}
        <span className="text-[15rem] font-black text-white leading-none select-none">{formatNumber(count)}</span>

        {/* Next goal */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <p className="text-white/30 text-xs font-bold uppercase tracking-[0.3em] mb-2">{t('nextGoal')}</p>
          <p className="text-[#C9860A] text-2xl font-bold font-serif italic">{formatNumber(nextMilestone)}</p>
        </div>

        {/* Exit hint */}
        <div className="absolute top-4 left-4">
          <p className="text-white/15 text-xs tracking-wide">{t('holdToExit')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <AppBar title={t('digitalTasbeeh')} showBack />

        <div className="max-w-lg mx-auto px-5 pt-4 space-y-6">

          {/* Dhikr Selector Hero */}
          <Card className="overflow-hidden border-border/30 shadow-lg bg-card/50 backdrop-blur-xl">
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('selectDhikr')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleZenMode}
                    className="p-1.5 rounded-full text-[#C9860A] hover:bg-[#C9860A]/10 transition-colors"
                    title={t("zenMode") || "Zen Mode"}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#C9860A]/10 rounded-full text-xs font-bold tracking-widest uppercase text-[#C9860A]">
                    <History className="w-3 h-3" />
                    {t('total')}: <span className="font-serif italic ml-1 text-sm tracking-normal">{formatNumber(totalCount)}</span>
                  </div>
                </div>
              </div>

              <Select value={selectedDhikr} onValueChange={handleDhikrChange}>
                <SelectTrigger className="h-16 rounded-2xl bg-card border-border/40 text-left px-5">
                  <div className="flex flex-col">
                    <span className="font-arabic text-lg text-primary leading-tight">{currentDhikr.label}</span>
                    <span className="text-xs text-muted-foreground font-medium">{currentDhikr.transliteration}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {DHIKR_OPTIONS.map((dhikr) => (
                    <SelectItem key={dhikr.value} value={dhikr.value} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-arabic text-base">{dhikr.label}</span>
                        <span className="text-xs text-muted-foreground">{dhikr.transliteration}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Main Visual Counter */}
          <div className="flex flex-col items-center justify-center py-6 space-y-8">

            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* Background Ring - Outer */}
              <div className="absolute inset-0 rounded-full border-[10px] border-muted/20" />

              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="144"
                  cy="144"
                  r="134"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={842}
                  strokeDashoffset={842 - (842 * progress) / 100}
                  className="text-primary transition-all duration-300 ease-out"
                  strokeLinecap="round"
                />
              </svg>

              {/* Animated Inner Aura */}
              <AnimatePresence>
                {isAnimating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.2, scale: 1.1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="absolute inset-4 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>

              {/* Main Counter Hub */}
              <button
                onClick={handleIncrement}
                onTouchStart={() => triggerHapticFeedback('increment')}
                className="relative w-[210px] h-[210px] rounded-full bg-card shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-border/10 flex flex-col items-center justify-center group active:scale-[0.9] transition-all duration-150"
              >
                {/* Background reflection */}
                <div className="absolute inset-4 border border-white/5 rounded-full" />

                <span className="text-xs font-bold text-[#C9860A] uppercase tracking-[0.2em] mb-1">{t('count')}</span>
                <motion.span
                  key={count}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-7xl font-bold text-foreground font-serif italic tracking-tight"
                >
                  {formatNumber(count)}
                </motion.span>

                <div className="absolute bottom-10 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-muted-foreground opacity-50" />
                  <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tighter">{t('tapToDhikr')}</span>
                </div>
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center gap-4 w-full px-4">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl gap-3 text-xs font-bold border-border/40 bg-card/40 hover:bg-muted/50 transition-all"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
                {t('resetCount')}
              </Button>

              <div className="flex-1 h-14 bg-muted/20 border border-border/40 rounded-2xl flex flex-col items-center justify-center px-4 shadow-sm">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-[0.2em]">{t('nextGoal')}</span>
                <span className="text-base font-bold text-[#C9860A] font-serif italic">{formatNumber(nextMilestone)}</span>
              </div>
            </div>
          </div>

          {/* Translation Card */}
          <Card className="p-6 bg-primary/5 border-primary/20 rounded-3xl relative overflow-hidden">
            <div className="absolute -end-4 -bottom-4 opacity-5">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <p className="text-center text-sm font-medium italic text-primary leading-relaxed">
              "{t(dhikrMeaningKey(currentDhikr.value))}"
            </p>
          </Card>

          {/* Today's History Tab */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9860A] ms-2 mb-2">{t('todaysProgress')}</h3>
            <Card className="p-5 border-border/40 bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9860A]/20 to-[#E8A020]/5 flex items-center justify-center border border-[#C9860A]/10">
                    <History className="w-5 h-5 text-[#C9860A]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t('sessionsCompleted')}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{t('basedOnActivityToday')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#C9860A] font-serif italic">
                    {formatNumber(dailyHistory.find(h => h.date === new Date().toLocaleDateString() && h.label === label)?.count || 0)}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">{t('dhikr')}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Tasbeeh;
