import { useState, useMemo, useEffect, memo, useRef, startTransition, Children, cloneElement, isValidElement, type CSSProperties, type ReactNode, type ReactElement, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronLeft, Sparkles, BookOpen, History, Filter, MapPin, Moon } from "lucide-react";
import { quranService, type SurahInfo } from "@/lib/quran-service";
import { useSettings } from "@/contexts/SettingsContext";
import { getDailyAyah } from "@/lib/daily-content";
import { Badge } from "@/components/ui/badge";
import { goBackOrFallback } from "@/lib/navigation";

// Local, dependency-free equivalent of AdaptiveMotion's CSSOnlyTransition
// (hover/tap scale driven by JS mouse handlers). Inlined on purpose: importing
// AdaptiveMotion.tsx here kept this route chunk transitively importing
// framer-motion (its forwardRef component bodies are not tree-shakeable),
// which failed the "SurahList chunk must not pull framer-motion" requirement —
// verified by grepping the built chunk's static imports.
interface TapScaleProps {
  className?: string;
  hoverScale?: number;
  tapScale?: number;
  duration?: number;
  children: ReactNode;
}

function TapScale({ className = '', hoverScale = 1.02, tapScale = 0.98, duration = 100, children }: TapScaleProps) {
  return (
    <div
      className={className}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: 1000,
        transition: `transform ${duration}ms ease-out`,
      }}
    >
      {Children.map(children, child => {
        if (!isValidElement(child)) return child;
        return cloneElement(child as ReactElement, {
          className: `${(child.props as any).className || ''} transition-transform ease-out`,
          style: {
            ...((child.props as any).style || {}),
            transitionDuration: `${duration}ms`,
          },
          onMouseEnter: (e: ReactMouseEvent<HTMLElement>) => {
            (e.currentTarget as HTMLElement).style.transform = `scale(${hoverScale})`;
          },
          onMouseLeave: (e: ReactMouseEvent<HTMLElement>) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          },
          onMouseDown: (e: ReactMouseEvent<HTMLElement>) => {
            (e.currentTarget as HTMLElement).style.transform = `scale(${tapScale})`;
          },
          onMouseUp: (e: ReactMouseEvent<HTMLElement>) => {
            (e.currentTarget as HTMLElement).style.transform = `scale(${hoverScale})`;
          },
        });
      })}
    </div>
  );
}

interface SurahCardProps {
  surah: SurahInfo;
  index: number;
  isDark: boolean;
  onClick: (number: number) => void;
}

const SurahCard = memo(function SurahCard({ surah, index, isDark, onClick }: SurahCardProps) {
  return (
    <button
      onClick={() => onClick(surah.number)}
      className="w-full text-left group outline-none active:scale-[0.98] transition-transform duration-150"
    >
      <div className={`rounded-[24px] p-5 border transition-all duration-300 hover:scale-[1.02] ${
        isDark
          ? 'bg-[#111111] border-white/5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
          : 'bg-white border-gray-100 hover:border-primary/30 shadow-sm hover:shadow-md'
      }`}>
          <div className="flex items-center gap-4">
            {/* Surah Number - Premium Octagonal Style */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-primary/10 rotate-45 rounded-xl" />
              <div className="absolute inset-1 bg-primary/5 rotate-12 rounded-lg" />
              <span className="relative z-10 font-black text-primary text-xs tracking-tighter">{surah.number}</span>
            </div>

            {/* Center: Arabic + English */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-arabic text-2xl text-primary drop-shadow-sm leading-none">
                    {surah.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {surah.revelationType}
                    </span>
                    <span className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">
                      {surah.numberOfAyahs} Ayahs
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-base tracking-tight group-hover:text-primary transition-colors">{surah.englishName}</p>
                  <p className="text-xs text-muted-foreground/40 font-bold uppercase tracking-tighter mt-1">{surah.englishNameTranslation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.surah.number === nextProps.surah.number &&
    prevProps.surah.name === nextProps.surah.name &&
    prevProps.surah.englishName === nextProps.surah.englishName &&
    prevProps.isDark === nextProps.isDark
  );
});

export default function SurahList() {
  const { theme, effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'meccan' | 'madinah'>('all');
  const [lastRead, setLastRead] = useState<{ number: number; name: string; englishName: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dailyAyah = useMemo(() => getDailyAyah(), []);
  const allSurahs = useMemo(() => quranService.getAllSurahs(), []);

  useEffect(() => {
    const saved = localStorage.getItem('quran-last-read');
    if (saved) setLastRead(JSON.parse(saved));
  }, []);

  const filteredSurahs = useMemo(() => {
    let surahs = allSurahs;

    // Apply revelation type filter
    if (filter === 'meccan') {
      surahs = surahs.filter(s => s.revelationType === 'Meccan');
    } else if (filter === 'madinah') {
      surahs = surahs.filter(s => s.revelationType === 'Medinan');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      surahs = surahs.filter(
        (s) =>
          s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.includes(searchQuery) ||
          s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.number.toString() === searchQuery
      );
    }

    return surahs;
  }, [allSurahs, filter, searchQuery]);

  const handleSurahClick = (surahNumber: number) => {
    if ('vibrate' in navigator) navigator.vibrate(15);
    startTransition(() => {
      navigate(`/quran/surah-${surahNumber}`);
    });
  };

  // Plain wrapper (no framer-motion): the old PageTransition was a 0.05s
  // opacity fade — imperceptible, but it made this route chunk statically
  // depend on the framer-motion runtime. Keeping the same w-full h-full box.
  return (
    <div className="w-full h-full">
      <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-[#0D0D0D]' : 'bg-[#F5F5F5]'}`}>
        {/* Subtle Islamic geometric pattern on header */}
        <div className="absolute top-0 left-0 right-0 h-48 opacity-[0.03] bg-[radial-gradient(circle_at_2px_2px,_#C9A84C_1px,_transparent_0)] bg-[length:32px_32px] pointer-events-none" />

        {/* Premium Hero Section */}
        <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/20 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a4a] via-[#245a5a] to-[#2c6e6e]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 p-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-4 mb-6 w-full">
              <button
                onClick={() => goBackOrFallback(navigate, '/dashboard')}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-4xl sm:text-5xl font-arabic font-bold text-white flex-1">Al-Quran Al-Kareem</h1>
            </div>

            <p className="text-white/60 text-xs font-medium max-w-[240px] leading-relaxed mb-8">
              Read, listen, and contemplate the divine guidance
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {[
                { label: 'Surahs', value: '114' },
                { label: 'Ayahs', value: '6,236' },
                { label: 'Juz', value: '30' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <p className="text-primary text-lg font-black tracking-tighter">{stat.value}</p>
                  <p className="text-white/40 text-xs uppercase font-black tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-2xl mx-auto px-4 space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search surah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-primary/50 transition-colors ${
                isDark
                  ? 'bg-[#111111] border-white/10 text-white placeholder:text-white/30'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                  isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'All', icon: Filter },
              { key: 'meccan', label: 'Meccan', icon: Moon },
              { key: 'madinah', label: 'Madinah', icon: MapPin }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as 'all' | 'meccan' | 'madinah')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === item.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : isDark
                      ? 'bg-white/5 text-white/60 hover:bg-white/10'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Last Read Card */}
        {lastRead && (
          <div className="max-w-2xl mx-auto px-4 mb-6">
            <TapScale hoverScale={1.02} tapScale={0.98} duration={150}>
              <button
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate(15);
                  startTransition(() => {
                    navigate(`/quran/surah-${lastRead.number}`);
                  });
                }}
                className="w-full flex items-center p-4 bg-primary/10 border border-primary/20 rounded-2xl gap-4 hover:bg-primary/15 transition-all group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Continue Reading</p>
                  <h3 className="text-lg font-black">{lastRead.name}</h3>
                  <p className="text-xs text-primary/60">{lastRead.englishName}</p>
                </div>
              </button>
            </TapScale>
          </div>
        )}

        {/* Daily Ayah Card */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <TapScale hoverScale={0.98} tapScale={0.96} duration={150}>
            <div
              className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/20 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(15);
                startTransition(() => {
                  navigate('/quran');
                });
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#e0c097]" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                    {dailyAyah?.title || 'Verse of the Day'}
                  </span>
                </div>

                <div className="bg-black/30 rounded-2xl p-6 border border-white/5 mb-4">
                  <p className="text-white/90 text-base font-medium leading-relaxed mb-4">
                    {dailyAyah?.content || 'Loading...'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/10 text-white/80 border-white/10 text-xs">
                      {dailyAyah?.subtitle || 'Al-Baqarah 2:45'}
                    </Badge>
                    <span className="text-white/50 text-xs font-medium">{dailyAyah?.reference || ''}</span>
                  </div>
                </div>

                <p className="text-white/60 text-sm italic">
                  {dailyAyah?.reflection || ''}
                </p>
              </div>
            </div>
          </TapScale>
        </div>

        {/* Surah List */}
        <div className="max-w-2xl mx-auto px-4 py-6" ref={listRef}>
          {filteredSurahs.length > 0 ? (
            <div className="flex flex-col gap-2 pb-8">
              {filteredSurahs.map((surah, index) => (
                <div key={surah.number} style={{ contentVisibility: 'auto', containIntrinsicSize: '88px' }}>
                  <SurahCard 
                    surah={surah} 
                    index={index} 
                    isDark={isDark} 
                    onClick={handleSurahClick} 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No surahs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
