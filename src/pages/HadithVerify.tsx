import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Share2,
  Copy,
  History,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import i18n from "@/lib/i18n-new";
import {
  verifyHadithText,
  getHadithExcerpt,
  loadVerifierIndex,
  type HadithVerifyResult,
  type HadithVerifyMatch,
} from "@/lib/hadith-verify";
import { getAllCollections } from "@/data/hadith-collections";
import { getGradeBadgeClass } from "@/lib/hadith-utils";
import { goBackOrFallback } from "@/lib/navigation";

const MIN_CHARS = 15;
const STRONG = 0.55;
const LIKELY = 0.3;
const HISTORY_KEY = "hadith-verify-history";
const LIVE_DEBOUNCE_MS = 600;

/** Rough Arabic detection so pasted matn gets the right direction + font. */
function looksArabic(text: string): boolean {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin;
}

interface Excerpt {
  arabic: string;
  englishTranslation: string;
  narrator: string;
}

function loadHistory(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushHistory(text: string): string[] {
  const trimmed = text.trim().slice(0, 160);
  const next = [trimmed, ...loadHistory().filter(h => h !== trimmed)].slice(0, 5);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch { /* private mode */ }
  return next;
}

export default function HadithVerify() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [indexProgress, setIndexProgress] = useState<number | null>(null);
  const [result, setResult] = useState<HadithVerifyResult | null>(null);
  const [error, setError] = useState(false);
  const [excerpts, setExcerpts] = useState<Record<string, Excerpt | null>>({});
  const [history, setHistory] = useState<string[]>(loadHistory);
  const verifySeq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collections = useMemo(() => {
    const map = new Map<string, { title: string; author: string }>();
    for (const c of getAllCollections()) map.set(c.name, { title: c.title, author: c.author });
    return map;
  }, []);

  const rtl = looksArabic(text);
  const canVerify = text.trim().length >= MIN_CHARS && !verifying;

  const loadExcerpts = useCallback(async (matches: HadithVerifyMatch[]) => {
    for (const m of matches.slice(0, 3)) {
      const key = `${m.collection}:${m.bookNumber}:${m.hadithNumber}`;
      const excerpt = await getHadithExcerpt(m.collection, m.bookNumber, m.hadithNumber);
      setExcerpts(prev => ({ ...prev, [key]: excerpt }));
    }
  }, []);

  const runVerify = useCallback(async (input: string, isLive: boolean) => {
    const trimmed = input.trim();
    if (trimmed.length < MIN_CHARS) return;
    const seq = ++verifySeq.current;
    setVerifying(true);
    setError(false);
    try {
      const r = await verifyHadithText(trimmed);
      if (verifySeq.current !== seq) return; // a newer check superseded this one
      setResult(r);
      if (!isLive && r.matches.length > 0) {
        setHistory(pushHistory(trimmed));
      }
      void loadExcerpts(r.matches);
    } catch (e) {
      if (verifySeq.current !== seq) return;
      console.warn("[hadith-verify] failed:", e);
      setError(true);
      if (!isLive) {
        toast({ title: t("verifyErrorTitle"), description: t("verifyErrorDesc"), variant: "destructive" });
      }
    } finally {
      if (verifySeq.current === seq) setVerifying(false);
    }
  }, [t, toast, loadExcerpts]);

  // Live verification: re-check (debounced) while the user types or edits.
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      setResult(null);
      setError(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Warm the index first so the progress bar can show on the very first run.
      loadVerifierIndex(pct => setIndexProgress(pct))
        .then(() => runVerify(trimmed, true))
        .catch(() => setError(true));
    }, LIVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, runVerify]);

  const handleManualVerify = async () => {
    if (!canVerify) return;
    // Keep the index-progress UX for the very first explicit tap.
    await loadVerifierIndex(pct => setIndexProgress(pct)).catch(() => {});
    await runVerify(text, false);
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
    setExcerpts({});
  };

  const citationFor = (m: HadithVerifyMatch) => {
    const col = collections.get(m.collection);
    return `${col?.title ?? m.collection} · ${t("verifyBookNum", { book: m.bookNumber })} · #${m.hadithNumber}${m.grade ? ` · ${m.grade}` : ""}`;
  };

  const shareMatch = async (m: HadithVerifyMatch) => {
    const excerptKey = `${m.collection}:${m.bookNumber}:${m.hadithNumber}`;
    const ex = excerpts[excerptKey];
    const payload = [ex?.arabic, ex?.englishTranslation, citationFor(m)].filter(Boolean).join("\n\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: t("verifyTitle"), text: payload });
      } else {
        await navigator.clipboard.writeText(payload);
        toast({ title: t("verifyCopied") });
      }
    } catch { /* user cancelled */ }
  };

  const copyCitation = async (m: HadithVerifyMatch) => {
    try {
      await navigator.clipboard.writeText(citationFor(m));
      toast({ title: t("verifyCopied") });
    } catch { /* ignore */ }
  };

  const strengthLabel = (sim: number) =>
    sim >= STRONG ? t("verifyMatchStrong") : sim >= LIKELY ? t("verifyMatchLikely") : t("verifyMatchPossible");
  const strengthColor = (sim: number) =>
    sim >= STRONG ? "text-emerald-600 dark:text-emerald-400" : sim >= LIKELY ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  const strengthBar = (sim: number) =>
    sim >= STRONG ? "bg-emerald-500" : sim >= LIKELY ? "bg-amber-500" : "bg-slate-400";

  const best = result?.matches[0];
  const others = result?.matches.slice(1) ?? [];

  const renderExcerpt = (m: HadithVerifyMatch) => {
    const key = `${m.collection}:${m.bookNumber}:${m.hadithNumber}`;
    const ex = excerpts[key];
    if (ex === undefined) {
      return (
        <div className="space-y-1.5 animate-pulse">
          <div className="h-4 rounded bg-muted/70 w-11/12 ms-auto" />
          <div className="h-4 rounded bg-muted/70 w-8/12 ms-auto" />
        </div>
      );
    }
    if (!ex) return null;
    const isArabicUi = i18n.language?.startsWith("ar");
    return (
      <div className="space-y-2">
        {ex.arabic && (
          <p className="font-arabic text-lg leading-loose text-foreground line-clamp-3" dir="rtl">
            {ex.arabic}
          </p>
        )}
        {!isArabicUi && ex.englishTranslation && (
          <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
            {ex.englishTranslation}
          </p>
        )}
        {ex.narrator && (
          <p className="text-xs font-semibold text-primary">{ex.narrator}</p>
        )}
      </div>
    );
  };

  const renderMatchActions = (m: HadithVerifyMatch) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg hover:bg-primary/10"
        title={t("verifyShare")}
        onClick={(e) => { e.stopPropagation(); shareMatch(m); }}
      >
        <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg hover:bg-primary/10"
        title={t("verifyCopy")}
        onClick={(e) => { e.stopPropagation(); copyCitation(m); }}
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
    </div>
  );

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
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                {verifying
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> {t("verifyScanning")}</>
                  : <><Sparkles className="w-3 h-3 text-emerald-500" /> {t("verifyAutoCheck")}</>}
              </span>
              <div className="flex items-center gap-2">
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
            </div>

            {/* Index download progress (first run only) */}
            {indexProgress !== null && indexProgress < 100 && (
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${indexProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("verifyIndexLoading")} · {indexProgress}%
                </p>
              </div>
            )}

            <Button
              onClick={handleManualVerify}
              disabled={!canVerify || verifying}
              className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base gap-2"
            >
              <ScanSearch className="w-5 h-5" />
              {t("verifyButton")}
            </Button>
            {text.trim().length > 0 && text.trim().length < MIN_CHARS && (
              <p className="text-xs text-muted-foreground text-center">
                {t("verifyTooShort", { count: MIN_CHARS })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent verifications */}
        {history.length > 0 && !result && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              {t("verifyRecent")}
            </p>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setText(h)}
                  className="max-w-full truncate text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {h.slice(0, 48)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && result.matches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-xs text-muted-foreground text-center">
                {t("verifyResultSummary", {
                  count: result.matches.length,
                  ms: result.matchMs || result.indexLoadMs,
                })}
              </p>

              {/* Hero: the best match */}
              {best && (
                <motion.div layout>
                  <Card className="rounded-2xl border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-transparent overflow-hidden">
                    <CardContent className="p-0">
                      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <BadgeCheck className={`w-5 h-5 shrink-0 ${strengthColor(best.similarity)}`} />
                          <span className={`text-sm font-bold ${strengthColor(best.similarity)}`}>
                            {best.similarity >= STRONG ? t("verifyBestMatch") : strengthLabel(best.similarity)}
                          </span>
                        </div>
                        <span className={`text-xl font-black ${strengthColor(best.similarity)}`}>
                          {Math.round(best.similarity * 100)}%
                        </span>
                      </div>
                      <div className="px-4 pb-3">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.round(best.similarity * 100))}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${strengthBar(best.similarity)}`}
                          />
                        </div>
                      </div>

                      <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {collections.get(best.collection)?.title ?? best.collection}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t("verifyBookNum", { book: best.bookNumber })} · #{best.hadithNumber}
                        </span>
                        {best.grade && (
                          <Badge variant="outline" className={`text-xs ${getGradeBadgeClass(best.grade)}`}>
                            {best.grade}
                          </Badge>
                        )}
                      </div>

                      <div className="px-4 pb-3 min-h-[3rem]">
                        {renderExcerpt(best)}
                      </div>

                      <div className="border-t border-border/40 px-2 py-1.5 flex items-center justify-between">
                        {renderMatchActions(best)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary text-xs font-semibold gap-1"
                          onClick={() => navigate(`/hadith/collections/${best.collection}/${best.bookNumber}/${best.hadithNumber}`)}
                        >
                          {t("verifyOpenReader")}
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Other matches: compact rows */}
              {others.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("verifyOtherMatches")}
                  </p>
                  {others.map((m, idx) => (
                    <motion.div
                      key={`${m.collection}-${m.bookNumber}-${m.hadithNumber}-${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * idx }}
                    >
                      <Card className="rounded-xl border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
                        <button
                          className="w-full text-start"
                          onClick={() => navigate(`/hadith/collections/${m.collection}/${m.bookNumber}/${m.hadithNumber}`)}
                        >
                          <div className="p-3 flex items-center gap-3">
                            <span className={`text-sm font-black shrink-0 w-10 ${strengthColor(m.similarity)}`}>
                              {Math.round(m.similarity * 100)}%
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {collections.get(m.collection)?.title ?? m.collection}
                                </span>
                                {m.grade && (
                                  <Badge variant="outline" className={`text-xs ${getGradeBadgeClass(m.grade)}`}>
                                    {m.grade}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t("verifyBookNum", { book: m.bookNumber })} · #{m.hadithNumber} · {strengthLabel(m.similarity)}
                              </p>
                            </div>
                            {renderMatchActions(m)}
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 rtl:rotate-180" />
                          </div>
                        </button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No match — honest outcome */}
        {result && result.matches.length === 0 && !verifying && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-500" />
                  <p className="text-sm font-bold text-foreground">{t("verifyNoMatchTitle")}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("verifyNoMatchDesc")}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {error && !verifying && (
          <Card className="rounded-2xl border-red-500/20 bg-red-500/5">
            <CardContent className="p-5 flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("verifyErrorTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("verifyErrorDesc")}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runVerify(text, false)}
                className="rounded-xl"
              >
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
