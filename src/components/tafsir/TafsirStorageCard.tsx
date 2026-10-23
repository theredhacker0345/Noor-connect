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
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
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

  const remove = async (editionId: string) => {
    await deleteTafsirDownload(editionId);
    setConfirmDelete(null);
    refresh();
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
          const busy = isTafsirDownloading(e.id) && Boolean(pg);
          const pct = pg ? Math.round((pg.done / TOTAL_SURAHS) * 100) : 0;
          return (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground truncate" dir="auto">{e.name}</p>
                <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                  {e.author || e.name} · {e.language}
                  {dl ? ` · ${t("tafsirDl.downloaded")} ${fmtBytes(dl.sizeBytes)}` : ""}
                </p>
                {busy && (
                  <div className="mt-1.5">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums" dir="auto">
                      {t("tafsirDl.progress", { done: String(pg.done), total: String(TOTAL_SURAHS), size: fmtBytes(pg.bytes) })}
                    </p>
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
              ) : dl ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(confirmDelete === e.id ? null : e.id)}
                    aria-label={`${t("tafsirDl.delete")} ${e.name}`}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => start(e.id)}
                  disabled={Boolean(pg)}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {pg ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDriveDownload className="w-3 h-3" />}
                  {t("tafsirDl.download")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirmDelete && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-xs text-foreground/80">
          <p className="mb-2">{t("tafsirDl.confirmDelete")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => remove(confirmDelete)}
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
          </div>
        </div>
      )}
    </div>
  );
}
