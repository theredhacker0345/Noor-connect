import { useState, useEffect, memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, BookHeart, Search, Volume2, Plus, Minus, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";
import { duasData, duaCategories } from "@/data/duas";

// Category values come from @/data/duas (data keys stay English); map them to i18n keys for display.
const CATEGORY_KEYS: Record<string, string> = {
  "All": "all",
  "Morning": "morning",
  "Evening": "evening",
  "Travel": "duaCatTravel",
  "Eating": "duaCatEating",
  "Sleeping": "duaCatSleeping",
  "Illness": "duaCatIllness",
  "Distress": "duaCatDistress",
  "Gratitude": "duaCatGratitude",
  "Forgiveness": "duaCatForgiveness",
  "Protection": "duaCatProtection",
  "Weather": "duaCatWeather",
  "After Prayer": "duaCatAfterPrayer",
  "Home": "duaCatHome",
  "Mosque": "duaCatMosque",
  "Daily": "duaCatDaily",
  "Special Days": "duaCatSpecialDays",
  "Knowledge": "duaCatKnowledge",
  "Character": "duaCatCharacter",
  "Marriage": "duaCatMarriage",
  "Family": "duaCatFamily",
  "Financial": "duaCatFinancial",
  "Afterlife": "duaCatAfterlife",
  "Repentance": "duaCatRepentance",
  "Parents": "duaCatParents",
  "Fasting": "duaCatFasting",
  "Hajj & Umrah": "duaCatHajjUmrah",
  "New Moon": "duaCatNewMoon",
};

interface DuaCardProps {
  dua: typeof duasData[0];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShare: (dua: typeof duasData[0]) => void;
  isDuaOfDay?: boolean;
}

const DuaCard = memo(function DuaCard({ dua, isFavorite, onToggleFavorite, onShare, isDuaOfDay }: DuaCardProps) {
  const { t } = useI18n();
  const [playCounter, setPlayCounter] = useState(false);
  const [counter, setCounter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const synth = useMemo(() => typeof window !== 'undefined' ? window.speechSynthesis : null, []);

  const playAudio = (text: string) => {
    if (!synth) return;
    if (synth.speaking) {
      synth.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar';
    utterance.rate = 0.8;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    synth.speak(utterance);
  };

  return (
    <div className="active:scale-[0.99] transition-transform duration-100">
      <Card className={`p-5 relative overflow-hidden border-border/40 shadow-sm ${isDuaOfDay ? 'border-[#C9860A]/30 bg-gradient-to-br from-[#C9860A]/5 to-transparent' : 'bg-card'}`}>
        {isDuaOfDay && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-[#C9860A] text-white text-xs font-bold uppercase tracking-[0.2em] gap-1 px-2 py-0.5">
              <Sparkles className="w-3 h-3" />
              {t('duaOfDayLabel')}
            </Badge>
          </div>
        )}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isDuaOfDay && <Star className="w-3 h-3 text-[#C9860A] fill-[#C9860A]" />}
              <span className="px-2 py-0.5 bg-[#C9860A]/10 text-[#C9860A] text-xs font-bold uppercase tracking-[0.2em] rounded-full">
                {(() => { const k = CATEGORY_KEYS[dua.category]; return k ? t(k) : dua.category; })()}
              </span>
              {dua.repeatCount && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Plus className="w-2.5 h-2.5" />
                  {dua.repeatCount}x
                </Badge>
              )}
            </div>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#C9860A]/10" onClick={() => playAudio(dua.arabic)}>
                <Volume2 className={`w-4 h-4 ${isPlaying ? 'text-[#C9860A]' : 'text-muted-foreground'}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => onToggleFavorite(dua.id)}>
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onShare(dua)}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-2xl font-arabic font-bold text-foreground text-right leading-[2] tracking-wide mt-2">{dua.arabic}</p>
          <p className="text-base font-serif italic text-[#C9860A] leading-relaxed">{dua.transliteration}</p>
          <p className="text-sm text-foreground/80 leading-relaxed font-medium">{dua.translation}</p>
          {dua.reference && (
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{dua.reference}</p>
          )}
          {dua.repeatCount && (
            <div className="pt-2 border-t border-border/30">
              {playCounter ? (
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-border/50" onClick={() => { setCounter(c => Math.max(0, c - 1)); }}>
                    <Minus className="w-3 h-3 mr-1" />1
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold text-[#C9860A] font-serif italic">{counter}</p>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">/ {dua.repeatCount}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-border/50" onClick={() => { setCounter(c => Math.min(dua.repeatCount!, c + 1)); }}>
                    <Plus className="w-3 h-3 mr-1" />1
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setPlayCounter(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  {t('trackRepetition', { count: dua.repeatCount })}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.dua.id === nextProps.dua.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isDuaOfDay === nextProps.isDuaOfDay
  );
});

const Duas = memo(function Duas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const duaOfDay = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return duasData[dayOfYear % duasData.length];
  }, []);

  const filteredDuas = useMemo(() => {
    return duasData.filter((dua) => {
      if (selectedCategory !== "All" && dua.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          dua.translation.toLowerCase().includes(q) ||
          dua.transliteration.toLowerCase().includes(q) ||
          dua.arabic.includes(q) ||
          (dua.reference && dua.reference.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const handleToggleFavorite = (duaId: string) => {
    const isFavorite = toggleFavorite(duaId);
    setFavorites(getFavorites());
    toast({
      title: isFavorite ? t('addedToFavorites') : t('removedFromFavorites'),
    });
  };

  const shareDua = async (dua: typeof duasData[0]) => {
    const catKey = CATEGORY_KEYS[dua.category];
    const shareText = `"${dua.arabic}"\n\n${dua.transliteration}\n\n${t('translation')}: ${dua.translation}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: t('duaShareTitle', { category: catKey ? t(catKey) : dua.category }), text: shareText });
      } catch {
        // Error is non-critical, silently ignored
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: t('copiedToClipboard') });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full hover:bg-muted/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-serif italic tracking-tight">{t('duasTitle')}</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t('supplicationsCount', { count: duasData.length })}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9860A]/20 to-[#E8A020]/5 flex items-center justify-center border border-[#C9860A]/10 shadow-sm">
            <BookHeart className="w-5 h-5 text-[#C9860A]" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchDuas')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-card border-border/40 shadow-sm focus-visible:ring-[#C9860A]/50"
          />
        </div>

        {/* Dua of the Day */}
        {selectedCategory === "All" && !searchQuery && (
          <DuaCard
            dua={duaOfDay}
            isFavorite={favorites.includes(duaOfDay.id)}
            onToggleFavorite={handleToggleFavorite}
            onShare={shareDua}
            isDuaOfDay
          />
        )}

        {/* Categories — native horizontal scroll (touch-friendly; the Radix
            ScrollArea used here is vertical-only, which clipped the chips and
            blocked scrolling entirely) */}
        <div
          className="overflow-x-auto -mx-4 px-4 py-1"
          role="tablist"
          aria-label="Dua categories"
        >
          <div className="flex gap-2 w-max items-center pb-1">
            {duaCategories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`shrink-0 whitespace-nowrap text-xs rounded-full font-bold shadow-sm ${selectedCategory === cat ? 'bg-[#C9860A] text-white hover:bg-[#C9860A]/90' : 'bg-card text-muted-foreground hover:text-foreground border-border/40'}`}
              >
                {(() => { const k = CATEGORY_KEYS[cat]; return k ? t(k) : cat; })()}
              </Button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {filteredDuas.length === 1 ? t('oneDua') : t('duasFound', { count: filteredDuas.length })}
            {searchQuery ? ` ${t('matchingQuery', { query: searchQuery })}` : ''}
          </p>
          {favorites.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedCategory("All")}>
              <Heart className="w-3 h-3 fill-destructive text-destructive" />
              {favorites.length}
            </Button>
          )}
        </div>

        {/* Duas List */}
        <div className="space-y-4 pb-20">
          {filteredDuas.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border/40 shadow-sm">
              <BookHeart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t('noDuasFound')}</p>
              <Button variant="outline" size="sm" className="font-bold border-border/40 hover:bg-muted/50" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
                {t('clearFilters')}
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredDuas.map((dua) => (
                <div key={dua.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 260px' }}>
                  <DuaCard
                    dua={dua}
                    isFavorite={favorites.includes(dua.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onShare={shareDua}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Duas;
