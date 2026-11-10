import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ClipboardPaste,
  X,
  Loader2,
  WifiOff,
  ChevronRight,
  BadgeCheck,
  HelpCircle,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import { verifyHadithText, type HadithVerifyResult } from "@/lib/hadith-verify";
import { getAllCollections } from "@/data/hadith-collections";
import { getGradeBadgeClass } from "@/lib/hadith-utils";
import { goBackOrFallback } from "@/lib/navigation";

const MIN_CHARS = 15;
const STRONG = 0.55;
const LIKELY = 0.3;

/** Rough Arabic detection so pasted matn gets the right direction + font. */
function looksArabic(text: string): boolean {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin;
}

export default function HadithVerify() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<HadithVerifyResult | null>(null);
  const [error, setError] = useState(false);

  const collections = useMemo(() => {
    const map = new Map<string, { title: string; author: string }>();
    for (const c of getAllCollections()) map.set(c.name, { title: c.title, author: c.author });
    return map;
  }, []);

  const rtl = looksArabic(text);
  const canVerify = text.trim().length >= MIN_CHARS && !verifying;

  const handleVerify = async () => {
    if (!canVerify) return;
    setVerifying(true);
    setError(false);
    setResult(null);
    try {
      const r = await verifyHadithText(text);
      setResult(r);
    } catch (e) {
      console.warn("[hadith-verify] failed:", e);
      setError(true);
      toast({
        title: t("verifyErrorTitle"),
        description: t("verifyErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) {
        setText(clip);
        toast({ title: t("verifyPasted") });
      }
    } catch {
      toast({ title: t("verifyPasteBlocked"), variant: "destructive" });
    }
  };

  const reset = () => {
    setText("");
    setResult(null);
    setError(false);
  };

  const strengthLabel = (sim: number) =>
    sim >= STRONG ? t("verifyMatchStrong") : sim >= LIKELY ? t("verifyMatchLikely") : t("verifyMatchPossible");
  const strengthColor = (sim: number) =>
    sim >= STRONG ? "text-emerald-600 dark:text-emerald-400" : sim >= LIKELY ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  const strengthBar = (sim: number) =>
    sim >= STRONG ? "bg-emerald-500" : sim >= LIKELY ? "bg-amber-500" : "bg-slate-400";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goBackOrFallback(navigate, "/hadith")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              {t("verifyTitle")}
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {t("verifySubtitle")}
            </p>
          </div>
        </div>

        {/* Input card */}
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("verifyPlaceholder")}
                dir={rtl ? "rtl" : "ltr"}
                rows={6}
                maxLength={5000}
                className={`w-full rounded-xl border border-border/50 bg-muted/30 p-4 text-base leading-loose resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 ${
                  rtl ? "font-arabic text-right text-lg" : ""
                }`}
              />
              {text.length > 0 && (
                <button
                  onClick={reset}
                  className="absolute top-2 end-2 w-7 h-7 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                  aria-label={t("verifyClear")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {text.length.toLocaleString()} / 5,000
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaste}
                className="rounded-xl h-8 text-xs gap-1.5"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                {t("verifyPaste")}
              </Button>
            </div>

            <Button
              onClick={handleVerify}
              disabled={!canVerify}
              className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base gap-2"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("verifyScanning")}
                </>
              ) : (
                <>
                  <ScanSearch className="w-5 h-5" />
                  {t("verifyButton")}
                </>
              )}
            </Button>
            {text.trim().length > 0 && text.trim().length < MIN_CHARS && (
              <p className="text-xs text-muted-foreground text-center">
                {t("verifyTooShort", { count: MIN_CHARS })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading index (one-time) */}
        {verifying && !result && (
          <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-5 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{t("verifyIndexLoading")}</p>
                <p className="text-xs text-muted-foreground">{t("verifyIndexLoadingDesc")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && result.matches.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">
              {t("verifyResultSummary", {
                count: result.matches.length,
                ms: result.matchMs || result.indexLoadMs,
              })}
            </p>
            {result.matches.map((match, idx) => {
              const col = collections.get(match.collection);
              const pct = Math.round(match.similarity * 100);
              return (
                <Card
                  key={`${match.collection}-${match.bookNumber}-${match.hadithNumber}-${idx}`}
                  className="rounded-2xl border-border/50 overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <CardContent className="p-0">
                    {/* Similarity meter header */}
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <BadgeCheck className={`w-5 h-5 shrink-0 ${strengthColor(match.similarity)}`} />
                        <span className={`text-sm font-bold ${strengthColor(match.similarity)}`}>
                          {strengthLabel(match.similarity)}
                        </span>
                      </div>
                      <span className={`text-lg font-black ${strengthColor(match.similarity)}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="px-4 pb-3">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${strengthBar(match.similarity)}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Source line */}
                    <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {col?.title ?? match.collection}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("verifyBookNum", { book: match.bookNumber })} · #{match.hadithNumber}
                      </span>
                      {match.grade && (
                        <Badge variant="outline" className={`text-xs ${getGradeBadgeClass(match.grade)}`}>
                          {match.grade}
                        </Badge>
                      )}
                    </div>

                    <button
                      className="w-full text-start border-t border-border/40 hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/hadith/collections/${match.collection}/${match.bookNumber}/${match.hadithNumber}`)}
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">{t("verifyOpenReader")}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-primary truncate">
                            {col?.author ?? match.collection}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 rtl:rotate-180" />
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No match — honest outcome */}
        {result && result.matches.length === 0 && (
          <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-bold text-foreground">{t("verifyNoMatchTitle")}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("verifyNoMatchDesc")}</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="rounded-2xl border-red-500/20 bg-red-500/5">
            <CardContent className="p-5 flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("verifyErrorTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("verifyErrorDesc")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleVerify} className="rounded-xl">
                {t("verifyRetry")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* How it works + disclaimer */}
        {!result && !verifying && !error && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: ClipboardPaste, label: t("verifyStep1") },
              { icon: ScanSearch, label: t("verifyStep2") },
              { icon: BadgeCheck, label: t("verifyStep3") },
            ].map(({ icon: Icon, label }, i) => (
              <Card key={i} className="rounded-2xl border-border/50">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <Icon className="w-5 h-5 text-emerald-500" />
                  <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-2xl bg-muted/30 border border-border/40">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">{t("verifyPrivacyNote")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("verifyDisclaimer")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
