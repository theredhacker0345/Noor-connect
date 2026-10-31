import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, HardDriveDownload, Loader2, Trash2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { TAFSIR_EDITIONS } from "@/lib/tafsir";
import {
  listTafsirDownloads,
  deleteTafsirDownload,
  downloadWholeTafsir,
  cancelTafsirDownload,
  isTafsirDownloading,
  subscribeTafsirDownloadEvents,
  TOTAL_SURAHS,
  type TafsirDownloadSummary,
} from "@/lib/tafsir-download";

/** Format bytes the way the storage page does (KB/MB/GB). */
function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/**
 * Tafsir downloads manager — designed for Settings → Storage.
 * Lists every tafsir edition with its state:
 *   • not downloaded → "Download" button (real progress: surah n/114 + MB)
 *   • downloading    → live progress + cancel
 *   • downloaded     → true size + Delete (per author)
 * Fully self-contained (no props) so it can be dropped into any settings page.
 */
export function TafsirStorageCard() {
  const { t } = useI18n();
  const [downloads, setDownloads] = useState<Record<string, TafsirDownloadSummary>>({});
  const [progress, setProgress] = useState<Record<string, { done: number; bytes: number }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const list = await listTafsirDownloads();
    if (!mountedRef.current) return;
    const map: Record<string, TafsirDownloadSummary> = {};
    for (const d of list) map[d.editionId] = d;
    setDownloads(map);
    // A download may be running from a previous mount (user navigated away and
    // back). Seed progress from stored meta so the row shows busy immediately —
    // without this it briefly renders as "Downloaded" mid-download.
    setProgress(prev => {
      const next = { ...prev };
      for (const d of list) {
        if (isTafsirDownloading(d.editionId) && !next[d.editionId]) {
          next[d.editionId] = { done: d.surahsStored, bytes: d.sizeBytes };
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    // Self-heal: an app kill mid-download can leave an ongoing notification
    // behind — clear it for editions that are not actually downloading.
    void (async () => {
      const { hideTafsirNotification } = await import("@/lib/tafsir-download");
      const list = await listTafsirDownloads();
      for (const d of list) {
        if (!isTafsirDownloading(d.editionId)) void hideTafsirNotification(d.editionId);
      }
    })();
    const unsub = subscribeTafsirDownloadEvents((p) => {
      if (!mountedRef.current) return;
      if (p.finished || p.cancelled) {
        setProgress(prev => { const n = { ...prev }; delete n[p.editionId]; return n; });
        refresh();
      } else {
        setProgress(prev => ({ ...prev, [p.editionId]: { done: p.done, bytes: p.bytesSoFar } }));
      }
    });
    return () => { mountedRef.current = false; unsub(); };
  }, [refresh]);

  const start = async (editionId: string) => {
    if (isTafsirDownloading(editionId)) return;
    setProgress(prev => ({ ...prev, [editionId]: { done: 0, bytes: 0 } }));
    await downloadWholeTafsir(editionId, (p) => {
      if (!mountedRef.current || p.finished || p.cancelled) return;
      setProgress(prev => ({ ...prev, [p.editionId]: { done: p.done, bytes: p.bytesSoFar } }));
    });
    refresh();
  };

  const [deleting, setDeleting] = useState<string | null>(null);
  const remove = async (editionId: string) => {
    if (deleting) return;
    setDeleting(editionId);
    try {
      await deleteTafsirDownload(editionId);
      setProgress(prev => { const n = { ...prev }; delete n[editionId]; return n; });
      setConfirmDelete(null);
      await refresh();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-emerald-600" />
        <div>
          <h4 className="font-bold text-sm text-foreground">{t("tafsirDl.title")}</h4>
          <p className="text-[11px] text-muted-foreground">{t("tafsirDl.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-2">
        {TAFSIR_EDITIONS.map((e) => {
          const dl = downloads[e.id];
          const pg = progress[e.id];
          // Busy is a property of the download manager, not local state — it
          // must survive unmount/remount mid-download.
          const busy = isTafsirDownloading(e.id);
          const shown = busy && pg ? pg : dl ? { done: dl.surahsStored, bytes: dl.sizeBytes } : null;
          const partial = Boolean(dl && dl.surahsStored < TOTAL_SURAHS);
          const pct = shown ? Math.round((shown.done / TOTAL_SURAHS) * 100) : 0;
          return (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground truncate" dir="auto">{e.name}</p>
                <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                  {e.author || e.name} · {e.language}
                  {shown ? ` · ${t("tafsirDl.downloaded")} ${fmtBytes(shown.bytes)}${partial && !busy ? ` · ${shown.done}/${TOTAL_SURAHS}` : ""}` : ""}
                </p>
                {busy && (
                  <div className="mt-1.5">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums" dir="auto">
                      {t("tafsirDl.progress", { done: String(shown?.done ?? 0), total: String(TOTAL_SURAHS), size: fmtBytes(shown?.bytes ?? 0) })}
                    </p>
                  </div>
                )}
                {!busy && partial && (
                  <div className="mt-1.5">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
              {busy ? (
                <button
                  type="button"
                  onClick={() => cancelTafsirDownload(e.id)}
                  className="shrink-0 h-8 px-3 rounded-full text-[11px] font-bold border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("tafsirDl.cancel")}
                </button>
              ) : confirmDelete === e.id ? (
                <div className="shrink-0 flex items-center gap-1.5">
                  {deleting === e.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        className="h-8 px-3 rounded-full text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        {t("tafsirDl.delete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="h-8 px-3 rounded-full text-[11px] font-bold border border-border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t("tafsirDl.cancel")}
                      </button>
                    </>
                  )}
                </div>
              ) : dl ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(e.id)}
                  title={t("tafsirDl.confirmDelete")}
                  aria-label={`${t("tafsirDl.delete")} ${e.name}`}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => start(e.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <HardDriveDownload className="w-3 h-3" />
                  {t("tafsirDl.download")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
