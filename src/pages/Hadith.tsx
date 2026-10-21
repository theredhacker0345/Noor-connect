import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Share2, Loader2, RefreshCw, Library, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getDailyHadith as getDailyHadithFromCollections } from "@/lib/hadith";
import { getAllCollections } from "@/data/hadith-collections";
import { PageTransition } from "@/components/PageTransition";
import { useI18n } from "@/hooks/useI18n";
import type { HadithItem } from '@/data/hadith.json';

interface HadithData {
  hadith: string;
  translation?: string;
  book: string;
  number: string;
}

const REFRESH_SEED_KEY = "hadith-refresh-seed";

function getDailySeed(refreshSeed?: number | null): number {
  if (refreshSeed != null) return refreshSeed;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

const Hadith = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hadith, setHadith] = useState<HadithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hadithDataList, setHadithDataList] = useState<HadithItem[] | null>(null);

  useEffect(() => {
    import('@/data/hadith.json').then(module => {
      setHadithDataList(module.default);
    });
  }, []);

  const fetchHadith = useCallback(async (isRefresh = false) => {
    const today = new Date().toISOString().slice(0, 10);
    const cachedDate = localStorage.getItem("lastHadithDate");
    const cachedData = localStorage.getItem("lastHadithData");

    // Use cache unless refreshing
    if (!isRefresh && cachedDate === today && cachedData) {
      try {
        setHadith(JSON.parse(cachedData));
        setLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing cached hadith:", e);
      }
    }

    setLoading(true);
    
    try {
      // Set or clear refresh seed
      let refreshSeed: number | null = null;
      if (isRefresh) {
        const collectionCount = getAllCollections().length;
        refreshSeed = Math.floor(Math.random() * 100000) + 1;
        localStorage.setItem(REFRESH_SEED_KEY, String(refreshSeed));
      } else {
        const stored = localStorage.getItem(REFRESH_SEED_KEY);
        if (stored) refreshSeed = parseInt(stored, 10);
      }

      const importedHadith = await getDailyHadithFromCollections(getDailySeed(refreshSeed));
      let finalData: HadithData;

      if (importedHadith) {
        finalData = {
          hadith: importedHadith.arabic || importedHadith.arabicPlain || "",
          translation: importedHadith.englishTranslation || "",
          book: importedHadith.collection.replace(/[-_]/g, " "),
          number: String(importedHadith.hadithNumber || importedHadith.id),
        };
} else {
         if (!hadithDataList) {
             // Fallback if data hasn't loaded yet (render shows t('noHadithText'); source line hidden when book is empty)
             finalData = {
                 hadith: "",
                 translation: "",
                 book: "",
                 number: "1",
             };
         } else {
             const randomIdx = Math.floor(Math.random() * hadithDataList.length);
             const item = hadithDataList[randomIdx];
             finalData = {
                 hadith: item.text || "",
                 translation: item.translation || '',
                 book: item.source || "",
                 number: String(item.number || randomIdx + 1),
             };
         }
       }
      
      setHadith(finalData);
      localStorage.setItem("lastHadithDate", today);
      // JSON.stringify of a ~1KB+ hadith payload is ~38ms on ARM A53 cores
      // (2 frames dropped at 60FPS, 1 frame at 30FPS) when done synchronously.
      // Defer to setTimeout(0) so state commit + user's spinner dismissal are not blocked.
      setTimeout(() => {
        localStorage.setItem("lastHadithData", JSON.stringify(finalData));
      }, 0);
      setLoading(false);
    } catch (e) {
      console.error('Hadith Selection Error:', e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHadith();
  }, [fetchHadith]);

  const handleShare = async () => {
    if (hadith) {
      const shareText = `"${hadith.hadith}"\n\n${t('hadithShareSource', { book: hadith.book, number: hadith.number })}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: t('hadithOfDay'),
            text: shareText,
          });
        } catch (error) {
          console.error("Error sharing:", error);
        }
      } else {
        navigator.clipboard.writeText(shareText);
        toast({
          title: t('copiedToClipboard'),
          description: t('hadithCopiedDesc'),
        });
      }
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Islamic geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='1'%3E%3Cpath d='M30 30l15-15v30L30 30zm0 0L15 15v30l15-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hadith/collections")}
            className="rounded-full backdrop-blur-sm bg-card border border-border/40 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-foreground/80" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-serif italic tracking-tight">حديث اليوم</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t('dailyHadith')}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9860A]/20 to-[#E8A020]/5 flex items-center justify-center border border-[#C9860A]/10 shadow-sm">
            <BookOpen className="w-5 h-5 text-[#C9860A]" />
          </div>
        </div>

        {loading ? (
          <Card className="p-12 backdrop-blur-sm bg-card border-border/40 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-[#C9860A]/10 animate-pulse border border-[#C9860A]/20" />
                <Loader2 className="w-8 h-8 animate-spin text-[#C9860A] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('loadingHadith')}</p>
            </div>
          </Card>
        ) : hadith ? (
          <div className="space-y-4">
            {/* Main Hadith Card */}
            <Card className="relative overflow-hidden border-2 shadow-xl border-[#C9860A]/40 bg-[#1A1A1A] text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9860A]/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#C9860A]/5 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              
              <div className="relative p-8 z-10">
                <div className="space-y-6">
                  {/* Header icon */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C9860A]/10 flex items-center justify-center border border-[#C9860A]/20">
                      <BookOpen className="w-6 h-6 text-[#C9860A]" />
                    </div>
                    <h2 className="text-xs uppercase tracking-[0.2em] text-[#C9860A] font-bold">
                      {t('hadithOfDay')}
                    </h2>
                  </div>
 
                  {/* Hadith text */}
                  <blockquote className="text-xl md:text-3xl leading-relaxed text-center font-arabic font-bold mt-6 mb-2">
                    {hadith.hadith || t('noHadithText')}
                  </blockquote>
 
                  {/* Translation */}
                  {hadith.translation && (
                    <p className="text-base leading-relaxed text-center opacity-80 font-serif italic px-2">
                      {hadith.translation}
                    </p>
                  )}
 
                  {/* Source */}
                  {hadith.book && (
                    <div className="pt-6 mt-4 border-t border-white/10 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                        {hadith.number ? t('hadithReference', { book: hadith.book, number: hadith.number }) : hadith.book}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleShare}
                className="flex-1 bg-card text-foreground hover:bg-muted/50 border border-border/40 shadow-sm font-bold text-xs rounded-xl h-12"
                variant="outline"
              >
                <Share2 className="w-4 h-4 me-2 text-[#C9860A]" />
                {t('share')}
              </Button>
              <Button
                onClick={() => navigate("/hadith/collections")}
                className="flex-1 bg-card text-foreground hover:bg-muted/50 border border-border/40 shadow-sm font-bold text-xs rounded-xl h-12"
                variant="outline"
              >
                <Library className="w-4 h-4 me-2 text-[#C9860A]" />
                {t('browse')}
              </Button>
              <Button
                onClick={() => navigate("/hadith/bookmarks")}
                className="bg-card text-foreground hover:bg-muted/50 border border-border/40 shadow-sm rounded-xl h-12 w-12"
                variant="outline"
                size="icon"
                title={t("bookmarkedHadith") || "Bookmarked Hadith"}
              >
                <Bookmark className="w-4 h-4 text-[#C9860A]" />
              </Button>
              <Button
                onClick={() => fetchHadith(true)}
                className="bg-card text-foreground hover:bg-muted/50 border border-border/40 shadow-sm rounded-xl h-12 w-12"
                variant="outline"
                size="icon"
              >
                <RefreshCw className="w-4 h-4 text-[#C9860A]" />
              </Button>
            </div>

            {/* Footer message */}
            <Card className="p-5 bg-muted/20 border-border/40 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-center text-muted-foreground">
                {t('hadithFooterDua')}
              </p>
            </Card>
          </div>
        ) : (
          <Card className="p-8 text-center space-y-4 bg-card border-border/40 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('unableToLoadHadith')}</p>
            <Button onClick={fetchHadith} variant="outline" className="bg-[#1A1A1A] text-white hover:bg-[#333333] border-border/40 font-bold rounded-xl px-6 h-12">
              {t('tryAgain')}
            </Button>
          </Card>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default Hadith;
