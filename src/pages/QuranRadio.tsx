import { memo, useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Radio, Play, Pause, BarChart3, Search, X,
  Pin, PinOff, Landmark, Moon, BookOpen, BookMarked, Headphones,
  Globe, Sparkles, Scale, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { radioStations, type RadioStation } from "@/data/radio-stations";
import { extraRadioStations, type RadioCategory } from "@/data/radio-stations-extra";
import { useGlobalRadio } from "@/lib/global-radio";

// A unified station view: base stations + extra API stations.
interface StationView {
  id: number;
  name: string;   // Arabic display name
  nameEn: string; // English subtitle
  url: string;
  img: string;
  category: RadioCategory;
}

const PINNED_KEY = "pinned-radio-stations";

const toView = (s: RadioStation | { id: number; nameAr: string; nameEn: string; url: string; img: string; category: RadioCategory }): StationView => {
  const base = "nameAr" in s;
  return {
    id: s.id,
    name: base ? (s as { nameAr: string }).nameAr : s.name,
    nameEn: base ? (s as { nameEn: string }).nameEn : "",
    url: s.url,
    img: s.img,
    category: base ? (s as { category: RadioCategory }).category : "reciter",
  };
};

const allStations: StationView[] = [
  ...radioStations.map(toView),
  ...extraRadioStations.map(toView),
];

const FEATURED_SLUGS = new Set([
  "mishary_alafasi", "shaik_abu_bakr_al_shatri", "maher",
  "saad_alghamdi", "abdulrahman_alsudaes",
]);

const featuredStations = allStations.filter((s) =>
  FEATURED_SLUGS.has(s.url.split("/").filter(Boolean).pop() ?? "")
);

const CATEGORY_LABELS: Record<RadioCategory, string> = {
  reciter: "Reciters",
  translation: "Translations",
  tafsir: "Tafsir",
  hadith: "Hadith",
  surah: "Surahs",
  adhkar: "Adhkar",
  stories: "Stories",
  mosque: "Main / Mix",
  fatwa: "Fatwa",
};

const loadPinned = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
};

const QuranRadio = () => {
  const navigate = useNavigate();
  const globalRadio = useGlobalRadio();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<RadioCategory | "all">("all");
  const [pinned, setPinned] = useState<Set<string>>(loadPinned);

  // Optimistic tap feedback: the station the user just started, cleared once
  // playback begins (or after a timeout so it never sticks on failure).
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  // Clear pending indicator as soon as the tapped station actually plays…
  useEffect(() => {
    if (pendingUrl && globalRadio.isPlaying && globalRadio.currentStation?.url === pendingUrl) {
      setPendingUrl(null);
    }
  }, [globalRadio.isPlaying, globalRadio.currentStation?.url, pendingUrl]);

  const togglePin = useCallback((station: StationView) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(station.url)) next.delete(station.url);
      else next.add(station.url);
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStations.filter((s) => {
      const matchesCat = activeCategory === "all" || s.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const pinnedStations = useMemo(
    () => allStations.filter((s) => pinned.has(s.url)),
    [pinned]
  );
  const categories = useMemo(
    () =>
      Object.keys(CATEGORY_LABELS) as RadioCategory[],
    []
  );

  const handleStationSelect = useCallback((station: StationView) => {
    // If clicking on the currently playing station, toggle play/pause
    if (globalRadio.currentStation?.url === station.url) {
      if (globalRadio.isPlaying) {
        globalRadio.pauseRadio();
      } else {
        setPendingUrl(station.url);
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = setTimeout(() => setPendingUrl(null), 6000);
        globalRadio.playRadio({
          id: station.id,
          name: station.name,
          url: station.url
        });
      }
      return;
    }

    // Play new station using global radio
    setPendingUrl(station.url);
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => setPendingUrl(null), 6000);
    globalRadio.playRadio({
      id: station.id,
      name: station.name,
      url: station.url
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalRadio.currentStation?.url, globalRadio.isPlaying, globalRadio.playRadio, globalRadio.pauseRadio]);

  const isCurrentStation = useCallback(
    (station: StationView) => globalRadio.currentStation?.url === station.url,
    [globalRadio.currentStation?.url]
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Quran Radio</h1>
              <p className="text-sm text-muted-foreground">Live Quran recitation 24/7</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/radio-stats")} className="rounded-full">
              <BarChart3 className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reciter or station…"
              className="ps-9 pe-9"
              aria-label="Search reciter or station"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute end-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" role="tablist" aria-label="Station categories">
            <button
              onClick={() => setActiveCategory("all")}
              role="tab"
              aria-selected={activeCategory === "all"}
              className={`shrink-0 min-h-[40px] px-4 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary/10"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                role="tab"
                aria-selected={activeCategory === cat}
                className={`shrink-0 min-h-[40px] px-4 rounded-full text-xs font-semibold transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-primary/10"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <GridSkeleton />
        ) : (
          <>
            {/* Featured */}
            <section className="mb-8">
              <SectionTitle icon={<Star className="w-5 h-5 text-primary" />} title="Featured Reciters" />
              <StationGrid
                stations={featuredStations}
                pinned={pinned}
                pendingUrl={pendingUrl}
                isCurrentStation={isCurrentStation}
                isPlaying={globalRadio.isPlaying}
                onSelect={handleStationSelect}
                onTogglePin={togglePin}
              />
            </section>

            {/* Pinned */}
            {pinnedStations.length > 0 && (
              <section className="mb-8">
                <SectionTitle icon={<Pin className="w-5 h-5 text-primary" />} title={`Pinned Stations (${pinnedStations.length})`} />
                <StationGrid
                  stations={pinnedStations}
                  pinned={pinned}
                  pendingUrl={pendingUrl}
                  isCurrentStation={isCurrentStation}
                  isPlaying={globalRadio.isPlaying}
                  onSelect={handleStationSelect}
                  onTogglePin={togglePin}
                />
              </section>
            )}

            {/* All Stations */}
            <section>
              <SectionTitle
                icon={<Radio className="w-5 h-5 text-primary" />}
                title={`All Stations (${filtered.length})`}
              />
              {filtered.length === 0 ? (
                <EmptyState />
              ) : (
                <StationGrid
                  stations={filtered}
                  pinned={pinned}
                  pendingUrl={pendingUrl}
                  isCurrentStation={isCurrentStation}
                  isPlaying={globalRadio.isPlaying}
                  onSelect={handleStationSelect}
                  onTogglePin={togglePin}
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
    {icon}
    {title}
  </h2>
);

const EmptyState = () => (
  <div className="text-center py-12 text-muted-foreground">
    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
      <Radio className="w-6 h-6 text-muted-foreground/70" />
    </div>
    <p className="text-lg font-semibold">No stations found</p>
    <p className="text-sm mt-1">Try a different search or category.</p>
  </div>
);

const GridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="aspect-square relative overflow-hidden rounded-2xl bg-muted animate-pulse">
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/30 to-transparent">
          <div className="h-4 w-3/4 bg-muted-foreground/30 rounded mb-1" />
          <div className="h-3 w-1/2 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    ))}
  </div>
);

interface StationGridProps {
  stations: StationView[];
  pinned: Set<string>;
  pendingUrl: string | null;
  isCurrentStation: (s: StationView) => boolean;
  isPlaying: boolean;
  onSelect: (s: StationView) => void;
  onTogglePin: (s: StationView) => void;
}

const StationGrid: React.FC<StationGridProps> = ({ stations, pinned, pendingUrl, isCurrentStation, isPlaying, onSelect, onTogglePin }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {stations.map((station) => (
      <StationCard
        key={station.url}
        station={station}
        isPinned={pinned.has(station.url)}
        isPlaying={isCurrentStation(station) && isPlaying}
        isPending={isCurrentStation(station) ? !isPlaying && pendingUrl === station.url : pendingUrl === station.url}
        onSelect={onSelect}
        onTogglePin={onTogglePin}
      />
    ))}
  </div>
);

interface StationCardProps {
  station: StationView;
  isPinned: boolean;
  isPlaying: boolean;
  isPending: boolean;
  onSelect: (station: StationView) => void;
  onTogglePin: (station: StationView) => void;
}

// Themed icon per category (non-reciter stations).
const CategoryArt: React.FC<{ category: RadioCategory; id: number }> = ({ category, id }) => {
  const styles: Record<string, string> = {
    mosque: "from-emerald-500 to-teal-700",
    eid: "from-amber-400 to-orange-600",
    ruqyah: "from-sky-400 to-blue-700",
    tafsir: "from-violet-400 to-purple-700",
    hadith: "from-rose-400 to-pink-700",
    translation: "from-cyan-400 to-sky-700",
    surah: "from-indigo-400 to-blue-700",
    stories: "from-fuchsia-400 to-purple-700",
    adhkar: "from-lime-400 to-green-700",
    fatwa: "from-slate-400 to-slate-700",
    biography: "from-teal-400 to-emerald-700",
  };
  const iconMap: Record<string, React.ReactNode> = {
    mosque: <Landmark className="w-10 h-10 text-white/90" />,
    eid: <Moon className="w-10 h-10 text-white/90" />,
    ruqyah: <BookOpen className="w-10 h-10 text-white/90" />,
    tafsir: <BookMarked className="w-10 h-10 text-white/90" />,
    hadith: <Headphones className="w-10 h-10 text-white/90" />,
    translation: <Globe className="w-10 h-10 text-white/90" />,
    stories: <Sparkles className="w-10 h-10 text-white/90" />,
    fatwa: <Scale className="w-10 h-10 text-white/90" />,
    adhkar: <Sparkles className="w-10 h-10 text-white/90" />,
  };

  // Surah-specific: show Arabic-Indic surah number in calligraphic style.
  if (category === "surah") {
    const surahNum = id === 115 ? "٢" : id === 109060 ? "٦٧" : "۩";
    return (
      <div className={`w-full h-full bg-gradient-to-br ${styles.surah} flex items-center justify-center`}>
        <span className="text-5xl font-bold text-white/95 leading-none" style={{ fontFamily: "serif" }}>
          {surahNum}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${styles[category] || styles.mosque} flex items-center justify-center`}>
      {iconMap[category] || <Radio className="w-10 h-10 text-white/90" />}
    </div>
  );
};

const initialsOf = (name: string, nameEn: string): string => {
  const en = nameEn.trim();
  if (en) {
    const parts = en.split(/\s+/).filter(Boolean).slice(0, 2);
    const letters = parts.map((p) => p[0]).join("");
    if (letters) return letters.toUpperCase();
  }
  const cleaned = name.replace(/إذاعة|أذاعة|راديو|إسلامي/gi, "").trim();
  return cleaned ? Array.from(cleaned).slice(0, 2).join(" ") : "?";
};

const avatarPalette = [
  "bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-rose-600",
  "bg-amber-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
];

const avatarColor = (url: string): string => {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};

const StationCard = memo<StationCardProps>(({ station, isPinned, isPlaying, isPending, onSelect, onTogglePin }) => {
  const [imageError, setImageError] = useState(false);

  const showPhoto = station.category === "reciter" && !!station.img && !imageError;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(station);
    }
  }, [onSelect, station]);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${isPlaying ? "Pause" : "Play"} ${station.nameEn || station.name}`}
      className={`group relative overflow-hidden rounded-2xl shadow-md hover:shadow-lg cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 ${isPlaying
        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        : ''
        }`}
      onClick={() => onSelect(station)}
      onKeyDown={handleKeyDown}
    >
      {/* Station Image / Art */}
      <div className="aspect-square relative overflow-hidden">
        {showPhoto ? (
          <img
            src={station.img}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : station.category === "reciter" ? (
          <InitialsAvatar name={station.name} nameEn={station.nameEn} url={station.url} />
        ) : (
          <CategoryArt category={station.category} id={station.id} />
        )}

        {/* Subtle desktop hover scrim only (never blocks the art on touch) */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none max-md:hidden" />

        {/* Pin button — 36px visual, ~48px hit area via inset span */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(station);
          }}
          aria-label={isPinned ? "Unpin station" : "Pin station"}
          className="absolute top-2 start-2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 active:scale-95 transition-colors"
        >
          <span className="absolute -inset-1.5" aria-hidden="true" />
          {isPinned ? (
            <Pin className="w-4 h-4 text-primary fill-primary" />
          ) : (
            <PinOff className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Play / Pause / Loading badge — always visible (touch has no hover),
            bottom-end corner like standard audio list rows. Opacity-only motion. */}
        <div
          className={`absolute bottom-2 end-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border transition-opacity duration-200 ${
            isPlaying
              ? 'bg-primary text-primary-foreground border-primary/60 opacity-100'
              : 'bg-black/55 border-white/20 text-white opacity-80 group-hover:opacity-100'
            }`}
        >
          {isPending ? (
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
          ) : (
            <Play className="w-4 h-4 fill-current ms-0.5" aria-hidden="true" />
          )}
        </div>

        {/* Now Playing Indicator */}
        {isPlaying && (
          <div className="absolute top-2 end-2">
            <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
              <div className="flex gap-0.5" aria-hidden="true">
                <div className="w-1 h-3 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-3 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-3 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
              Playing
            </div>
          </div>
        )}
      </div>

      {/* Station Name */}
      <div className="p-3 text-center">
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight" lang="ar">{station.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {station.nameEn || "Islamic Radio"}
        </p>
      </div>
    </Card>
  );
});

const InitialsAvatar: React.FC<{ name: string; nameEn: string; url: string }> = ({ name, nameEn, url }) => (
  <div className={`w-full h-full ${avatarColor(url)} flex items-center justify-center`}>
    <span className="text-3xl font-bold text-white/95">{initialsOf(name, nameEn)}</span>
  </div>
);

export default QuranRadio;
