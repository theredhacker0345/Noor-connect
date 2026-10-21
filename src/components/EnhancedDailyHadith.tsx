/**
 * Enhanced Daily Hadith Widget
 * Features real-time updates, beautiful animations, and daily rotation
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, Share2, Copy, BookOpen, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDailyHadith as getDailyHadithFromCollections } from "@/lib/hadith";
import type { EnhancedHadith } from "@/data/hadith-collections";
import { getGradeBadgeClass } from "@/lib/hadith-utils";
import { useHadithBookmarks } from "@/hooks/useHadithBookmarks";
import { useI18n } from "@/hooks/useI18n";

interface Hadith {
  id: string;
  arabic: string;
  englishTranslation: string;
  narrator: string;
  source: string;
  grade: string;
  category: string;
  reflection?: string;
  reflectionKey?: string;
  _collection?: string;
  _bookNumber?: string;
  _hadithNumber?: string;
}

function formatCollectionName(collection: string): string {
  return collection
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapEnhancedHadithToWidget(entry: EnhancedHadith): Hadith {
  return {
    id: entry.id,
    arabic: entry.arabic,
    englishTranslation: entry.englishTranslation || "Translation not available.",
    narrator: entry.narrator || "Unknown narrator",
    source: `${formatCollectionName(entry.collection)} ${entry.bookNumber}:${entry.hadithNumber}`,
    grade: entry.grade || "Unspecified",
    category: entry.category || "Hadith",
    _collection: entry.collection,
    _bookNumber: entry.bookNumber,
    _hadithNumber: entry.hadithNumber,
  };
}

const hadithCollection: Hadith[] = [
  {
    id: "bukhari-1-1",
    arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    englishTranslation: "Actions are judged by intentions, and each person will have what they intended.",
    narrator: "Umar ibn al-Khattab (may Allah be pleased with him)",
    source: "Sahih Bukhari 1",
    grade: "Sahih",
    category: "Intentions",
    reflectionKey: "hadithReflection1"
  },
  {
    id: "muslim-1-1",
    arabic: "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ",
    englishTranslation: "Whoever Allah wants good for, He grants them understanding of the religion.",
    narrator: "Mu'awiyah ibn Abi Sufyan (may Allah be pleased with him)",
    source: "Sahih Muslim 1037",
    grade: "Sahih",
    category: "Knowledge",
    reflectionKey: "hadithReflection2"
  },
  {
    id: "tirmidhi-1-1",
    arabic: "الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ",
    englishTranslation: "A good word is charity.",
    narrator: "Abu Dharr (may Allah be pleased with him)",
    source: "Jami` at-Tirmidhi 1976",
    grade: "Hasan",
    category: "Good Deeds",
    reflectionKey: "hadithReflection3"
  },
  {
    id: "abu-dawud-1-1",
    arabic: "سَدِّدُوا وَقَارِبُوا وَأَبْشِرُوا",
    englishTranslation: "Be deliberate and strive for excellence, and be of good cheer.",
    narrator: "Abu Hurairah (may Allah be pleased with him)",
    source: "Sunan Abi Dawud 1090",
    grade: "Sahih",
    category: "Excellence",
    reflectionKey: "hadithReflection4"
  },
  {
    id: "ibn-majah-1-1",
    arabic: "الْمُؤْمِنُ الَّذِي يُؤْمِنُ النَّاسُ عَلَى أَمْوَالِهِمْ وَأَنْفُسِهِمْ",
    englishTranslation: "The believer is the one from whose tongue and hands the people are safe.",
    narrator: "Abdullah ibn Amr (may Allah be pleased with him)",
    source: "Sunan Ibn Majah 3933",
    grade: "Sahih",
    category: "Character",
    reflectionKey: "hadithReflection5"
  },
  {
    id: "riyad-1-1",
    arabic: "مَنْ قَالَ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    englishTranslation: "Whoever says 'La ilaha illallah' with sincerity will enter Paradise.",
    narrator: "Abu Hurairah (may Allah be pleased with him)",
    source: "Riyad as-Salihin 100",
    grade: "Sahih",
    category: "Tawhid",
    reflectionKey: "hadithReflection6"
  }
];

const HADITH_STORAGE_KEY = "enhanced-daily-hadith";
const LAST_UPDATE_KEY = "hadith-last-update";

let cachedCollectionsHadith: EnhancedHadith | null = null;

export function EnhancedDailyHadith() {
  const navigate = useNavigate();
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const { isBookmarked, toggleBookmark } = useHadithBookmarks();

  const loadHadith = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toDateString();
      const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
      const storedHadith = localStorage.getItem(HADITH_STORAGE_KEY);

      // Use cached hadith if available
      if (lastUpdate === today && storedHadith) {
        const storedHadithParsed = JSON.parse(storedHadith);
        // Migrate pre-i18n cache entries to the keyed-reflection shape
        const match = hadithCollection.find(h => h.id === storedHadithParsed.id);
        setHadith(match ?? storedHadithParsed);
        return;
      }

      // Pick from the hardcoded array first (instant, no network fetch)
      const dayOfYear = Math.floor(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const index = dayOfYear % hadithCollection.length;
      const selectedHadith = hadithCollection[index];

      localStorage.setItem(HADITH_STORAGE_KEY, JSON.stringify(selectedHadith));
      localStorage.setItem(LAST_UPDATE_KEY, today);
      setHadith(selectedHadith);

      // In the background, try to get a richer hadith from collections
      // (never blocks the UI — if it fails, the cached hardcoded one stays)
      if (cachedCollectionsHadith) {
        const enhanced = mapEnhancedHadithToWidget(cachedCollectionsHadith);
        localStorage.setItem(HADITH_STORAGE_KEY, JSON.stringify(enhanced));
        setHadith(enhanced);
      } else {
        getDailyHadithFromCollections().then((importedHadith) => {
          if (importedHadith) {
            cachedCollectionsHadith = importedHadith;
            const enhanced = mapEnhancedHadithToWidget(importedHadith);
            localStorage.setItem(HADITH_STORAGE_KEY, JSON.stringify(enhanced));
            setHadith(enhanced);
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error loading hadith:', error);
      setHadith(hadithCollection[0]); // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let idleId: number | null = null;
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => loadHadith(), { timeout: 3000 });
    } else {
      loadHadith();
    }

    // Listen for app visibility changes to refresh if needed
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadHadith();
      }
    };

    // Listen for custom refresh events
    const handleRefresh = () => {
      loadHadith();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('widget-refresh', handleRefresh);

    return () => {
      if (idleId !== null) {
        window.cancelIdleCallback(idleId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('widget-refresh', handleRefresh);
    };
  }, [loadHadith]);

  const refreshHadith = async () => {
    setIsAnimating(true);
    try {
      const randomSeed = Math.floor(Math.random() * 100000) + 1;
      const importedHadith = await getDailyHadithFromCollections(randomSeed);
      if (importedHadith) {
        cachedCollectionsHadith = importedHadith;
        setHadith(mapEnhancedHadithToWidget(importedHadith));
      } else {
        const randomIndex = Math.floor(Math.random() * hadithCollection.length);
        setHadith(hadithCollection[randomIndex]);
      }
    } catch {
      const randomIndex = Math.floor(Math.random() * hadithCollection.length);
      setHadith(hadithCollection[randomIndex]);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const shareHadith = async () => {
    if (!hadith) return;
    
    const text = `"${hadith.englishTranslation}"\n\n- ${hadith.source}\nNarrated by: ${hadith.narrator}\n\n#NoorConnect #Hadith`;
    
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({
          title: t('copiedToast'),
          description: t('hadithCopiedToClipboard'),
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyHadith = async () => {
    if (!hadith) return;
    
    try {
      await navigator.clipboard.writeText(hadith.englishTranslation);
      toast({
        title: t('copiedToast'),
        description: t('hadithCopiedToClipboard'),
      });
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent">
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hadith) return null;

  return (
    <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent transition-all duration-500 hover:shadow-lg hover:shadow-accent/10">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-foreground/50 to-transparent" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent/5 rounded-full blur-xl" />
      
      <CardContent className="p-6 space-y-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/30 shadow-sm">
                <MessageCircle className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('dailyHadith')}</h3>
              <p className="text-xs text-muted-foreground">
                {hadith.category}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${getGradeBadgeClass(hadith.grade)}`}>
              {hadith.grade === "Unspecified" ? t('unspecified') : hadith.grade}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-xl hover:bg-accent/10 transition-colors ${hadith._collection && isBookmarked(hadith._collection, hadith._hadithNumber!) ? "text-primary" : ""}`}
                onClick={() => {
                  if (hadith._collection && hadith._hadithNumber) {
                    toggleBookmark({
                      collection: hadith._collection,
                      bookNumber: hadith._bookNumber || hadith._hadithNumber,
                      hadithNumber: hadith._hadithNumber,
                      arabic: hadith.arabic,
                      englishTranslation: hadith.englishTranslation,
                    });
                    toast({
                      title: isBookmarked(hadith._collection, hadith._hadithNumber) ? t('bookmarkRemoved') : t('bookmarkedToast'),
                    });
                  }
                }}
                aria-label={t('bookmarkHadith')}
              >
                <Bookmark className={`w-4 h-4 ${hadith._collection && isBookmarked(hadith._collection, hadith._hadithNumber!) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-accent/10 transition-colors"
                onClick={copyHadith}
                aria-label={t('copyHadith')}
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-accent/10 transition-colors"
                onClick={refreshHadith}
                aria-label={t('showAnotherHadith')}
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground transition-transform ${isAnimating ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-accent/10 transition-colors"
                onClick={shareHadith}
                aria-label={t('shareHadith')}
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        {/* Arabic Text */}
        <div className={`text-right space-y-2 transition-all duration-500 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
          <p className="text-2xl font-arabic leading-relaxed text-foreground drop-shadow-sm">
            {hadith.arabic}
          </p>
        </div>

        {/* Translation */}
        <div className={`space-y-2 transition-all duration-500 delay-100 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
          <p className="text-base leading-relaxed text-foreground font-medium">
            {hadith.englishTranslation}
          </p>
        </div>

        {/* Reflection */}
        {(hadith.reflection || hadith.reflectionKey) && (
          <div className={`p-3 rounded-xl bg-accent/5 border border-accent/10 transition-all duration-500 delay-200 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
            <p className="text-sm text-muted-foreground italic">
              {hadith.reflectionKey ? t(hadith.reflectionKey) : hadith.reflection}
            </p>
          </div>
        )}

        {/* Source and Narrator */}
        <div className={`space-y-2 transition-all duration-500 delay-300 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
          <div className="flex items-center justify-between text-xs text-foreground">
            <span>
              <strong>{t('narratedBy')}</strong> {hadith.narrator === "Unknown narrator" ? t('unknownNarrator') : hadith.narrator}
            </span>
            <span className="font-medium">
              {hadith.source}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-accent/30 hover:bg-accent/10"
              onClick={() => navigate('/hadith/bookmarks')}
            >
              <Bookmark className="w-4 h-4" />
              {t('bookmarks')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-accent/30 hover:bg-accent/10"
              onClick={() => navigate('/hadith/collections')}
            >
              <BookOpen className="w-4 h-4" />
              {t('moreHadith')}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {t('updatedDaily')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedDailyHadith;
