import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Download,
  Info,
  Loader2,
  Smartphone,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';
import i18n from '@/lib/i18n-new';
import { autoBackup, downloadBackup, getLastAutoBackupTime, importBackup } from '@/lib/backup';
import { downloadBook, isBookDownloaded } from '@/lib/ebooks-storage';

// H-2b i18n: relative time is produced by Intl.RelativeTimeFormat in the active
// app language (correct plurals for ar/ur/bn/ru/fr/ko without extra keys).
function formatRelativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const rtf = new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto' });
  if (diffMs < 45_000) return rtf.format(0, 'second');
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 7) return rtf.format(-days, 'day');
  return new Date(iso).toLocaleDateString(locale);
}

type BusyAction = 'none' | 'now' | 'export' | 'restore';

export function AutoBackupCard() {
  const { t } = useI18n();
  const locale = i18n.language || 'en';
  const { toast } = useToast();
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<BusyAction>('none');
  const busyRef = useRef<BusyAction>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successFlash, setSuccessFlash] = useState<'backup' | 'export' | null>(null);

  const refreshLastSaved = useCallback(async () => {
    const time = await getLastAutoBackupTime();
    setLastSavedAt(time);
  }, []);

  useEffect(() => {
    void refreshLastSaved();
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [refreshLastSaved]);

  const flashSuccess = useCallback((type: 'backup' | 'export') => {
    setSuccessFlash(type);
    setTimeout(() => setSuccessFlash(null), 1800);
  }, []);

  const runAction = useCallback(
    async (action: Exclude<BusyAction, 'none'>, fn: () => Promise<void>) => {
      if (busyRef.current !== 'none') return;
      busyRef.current = action;
      setBusy(action);
      try {
        await fn();
      } finally {
        busyRef.current = 'none';
        setBusy('none');
      }
    },
    []
  );

  const handleBackupNow = useCallback(() => {
    void runAction('now', async () => {
      try {
        await autoBackup();
        await refreshLastSaved();
        setNow(Date.now());
        flashSuccess('backup');
        toast({
          title: t('backupSavedToast'),
          description: t('backupSavedDesc'),
        });
      } catch {
        toast({
          title: t('backupFailed'),
          description: t('backupFailedDesc'),
          variant: 'destructive',
        });
      }
    });
  }, [runAction, refreshLastSaved, toast, flashSuccess]);

  const handleExport = useCallback(() => {
    void runAction('export', async () => {
      const { id: toastId, update } = toast({
        title: t('creatingBackup'),
        description: t('pleaseWaitBackup'),
      });
      try {
        const result = await downloadBackup();
        if (!result.success) {
          update({
            id: toastId,
            title: t('backupFailed'),
            description: result.error || t('backupCreationFailed'),
            variant: 'destructive',
          });
          return;
        }
        flashSuccess('export');
        if (result.data?.platform === 'native') {
          update({
            id: toastId,
            title: t('backupFileReady'),
            description: t('backupFileReadyDesc'),
          });
        } else {
          update({
            id: toastId,
            title: t('backupDownloadedToast'),
            description: t('backupDownloadedDesc'),
          });
        }
      } catch {
        update({
          id: toastId,
          title: t('backupFailed'),
          description: t('backupCreationFailed'),
          variant: 'destructive',
        });
      }
    });
  }, [runAction, toast, flashSuccess]);

  const handleRestore = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      void runAction('restore', async () => {
        const { id: toastId, update } = toast({
          title: t('restoringBackup'),
          description: t('pleaseWaitRestore'),
        });
        try {
          const result = await importBackup(file);
          if (!result.success || !result.data) {
            update({
              id: toastId,
              title: t('restoreFailed'),
              description:
                result.error || t('restoreFileCheckFailed'),
              variant: 'destructive',
            });
            return;
          }

          const summary = result.data;
          if (summary.warning) {
            update({
              id: toastId,
              title: t('restoreOlderBackup'),
              description: t('restoreOlderBackupDesc', { warning: summary.warning }),
              variant: 'destructive',
            });
          }

          if (summary.booksToDownload.length > 0) {
            update({
              id: toastId,
              title: t('downloadingLibrary'),
              description: t('restoringBooksDesc', { count: summary.booksToDownload.length }),
            });
            let downloadedCount = 0;
            for (const book of summary.booksToDownload) {
              try {
                if (!(await isBookDownloaded(book.url))) {
                  await downloadBook(book);
                }
                downloadedCount++;
                if (
                  downloadedCount %
                    Math.max(1, Math.floor(summary.booksToDownload.length / 5)) ===
                  0
                ) {
                  update({
                    id: toastId,
                    title: t('downloadingLibrary'),
                    description: t('restoreProgressDesc', { done: downloadedCount, total: summary.booksToDownload.length }),
                  });
                }
              } catch (err) {
                console.error(`Failed to download ${book.title}`, err);
              }
            }
            update({
              id: toastId,
              title: t('restoreComplete'),
              description: t('restoreCompleteBooksDesc', { done: downloadedCount, total: summary.booksToDownload.length }),
            });
          } else if (summary.failedKeys > 0) {
            update({
              id: toastId,
              title: t('restoredWithIssues'),
              description: t('restoredWithIssuesDesc', { count: summary.failedKeys }),
              variant: 'destructive',
            });
          } else {
            update({
              id: toastId,
              title: t('restoreComplete'),
              description: t('dataRestoredSuccessfully'),
            });
          }

          setTimeout(() => window.location.reload(), 2000);
        } catch {
          update({
            id: toastId,
            title: t('restoreFailed'),
            description: t('restoreFileCheckFailed'),
            variant: 'destructive',
          });
        }
      });
    },
    [runAction, toast]
  );

  const [showInfo, setShowInfo] = useState(false);
  const infoContentRef = useRef<HTMLDivElement>(null);
  const [infoHeight, setInfoHeight] = useState(0);

  const toggleInfo = useCallback(() => {
    setShowInfo(prev => !prev);
  }, []);

  useEffect(() => {
    if (infoContentRef.current) {
      setInfoHeight(infoContentRef.current.scrollHeight);
    }
  }, [showInfo]);

  const isBusy = busy !== 'none';
  const hasBackup = lastSavedAt !== null;
  const showBackupSuccess = successFlash === 'backup';
  const showExportSuccess = successFlash === 'export';

  return (
    <Card className="relative overflow-hidden rounded-[20px] border-border/30 shadow-sm p-0 [contain:content]">
      {/* Subtle gradient accent at top */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-5 space-y-4">
        {/* Header row: icon + status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`
                flex items-center justify-center w-11 h-11 rounded-2xl
                transition-all duration-300 ease-out
                ${
                  isBusy
                    ? 'bg-primary/10'
                    : hasBackup
                      ? 'bg-emerald-500/10'
                      : 'bg-amber-500/10'
                }
              `}
            >
              {busy === 'now' ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : showBackupSuccess ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : hasBackup ? (
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              ) : (
                <CloudOff className="w-5 h-5 text-amber-500" />
              )}
            </div>
            {hasBackup && !isBusy && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">{t('autoBackup') || 'Auto Backup'}</h3>
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                  transition-colors duration-300
                  ${
                    hasBackup
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-primary/10 text-primary'
                  }
                `}
              >
                {t('alwaysOn') || 'ALWAYS ON'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {hasBackup ? (
                <>
                  {t('lastSaved') || 'Last saved'}:{' '}
                  <span className="text-foreground/70 font-medium">
                    {formatRelativeTime(lastSavedAt, locale)}
                  </span>
                </>
              ) : (
                t('notSavedYet') || 'Not saved yet — your first backup runs automatically'
              )}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('backupStatusLine') ||
            'Saved on this device. Also save a file to Google Drive to protect against phone loss.'}
        </p>

        {/* Primary CTA */}
        <Button
          onClick={handleBackupNow}
          disabled={isBusy}
          className={`
            relative w-full h-11 rounded-xl font-semibold text-sm
            transition-all duration-200 ease-out
            active:scale-[0.98]
            shadow-[0_2px_8px_hsl(var(--primary)/0.25)]
            hover:shadow-[0_4px_16px_hsl(var(--primary)/0.35)]
            disabled:shadow-none disabled:active:scale-100
            ${showBackupSuccess ? 'bg-emerald-500 hover:bg-emerald-500/90' : ''}
          `}
        >
          {busy === 'now' ? (
            <>
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              {t('saving') || 'Saving...'}
            </>
          ) : showBackupSuccess ? (
            <>
              <Check className="w-4 h-4 me-2" />
              {t('saved')}
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 me-2" />
              {t('backupNow') || 'Back up now'}
            </>
          )}
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            disabled={isBusy}
            className={`
              group flex items-center justify-center gap-1.5 h-9 px-3
              rounded-lg border-2 text-xs font-medium
              transition-all duration-200 ease-out
              hover:border-primary/40 hover:bg-primary/5
              active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none
              text-foreground/80 hover:text-foreground
              ${showExportSuccess ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border-input'}
            `}
          >
            {busy === 'export' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : showExportSuccess ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" />
            )}
            <span className="truncate">{t('backupToDrive') || 'Save to Drive'}</span>
          </button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleRestore}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="
              group flex items-center justify-center gap-1.5 h-9 px-3
              rounded-lg border-2 border-input text-xs font-medium
              transition-all duration-200 ease-out
              hover:border-primary/40 hover:bg-primary/5
              active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none
              text-foreground/80 hover:text-foreground
            "
          >
            {busy === 'restore' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Upload className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5" />
            )}
            <span className="truncate">{t('restoreFromFile') || 'Restore file'}</span>
          </button>
        </div>

        {/* How it works toggle */}
        <button
          onClick={toggleInfo}
          className="
            flex items-center gap-2 w-full py-2 px-1
            text-xs text-muted-foreground hover:text-foreground
            transition-colors duration-200
          "
        >
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">{t('howItWorks') || 'How backup works'}</span>
          <ChevronDown
            className={`
              w-3.5 h-3.5 ms-auto shrink-0
              transition-transform duration-200 ease-out
              ${showInfo ? 'rotate-180' : ''}
            `}
          />
        </button>

        {/* Expandable info section — CSS max-height transition, no JS animation loop */}
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight: showInfo ? infoHeight : 0 }}
          aria-hidden={!showInfo}
        >
          <div ref={infoContentRef} className="space-y-4 pb-1">
            {/* 1. Auto Backup on Device */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <h4 className="text-xs font-bold text-foreground">
                  {t('infoAutoBackupTitle') || 'Automatic Device Backup'}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('infoAutoBackupDesc') ||
                  'Noor Connect automatically saves a snapshot of your data every 20 minutes while you use the app. This backup is stored locally on your phone inside the app\'s private storage. It includes everything — your salah tracker, qaza records, Quran bookmarks, reading progress, settings, habit tracker, quiz stats, and all preferences. The snapshot updates only when you\'re actively using the app, so it never wastes battery in the background.'}
              </p>
            </div>

            {/* 2. Google Drive Cloud Backup */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                  <Cloud className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-xs font-bold text-foreground">
                  {t('infoCloudBackupTitle') || 'Google Drive Cloud Backup'}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('infoCloudBackupDesc') ||
                  'On Android, if you have Google Drive backup enabled in your phone settings (Settings → Google → Backup), Noor Connect\'s data is automatically included in your Google cloud backup. This means if you get a new phone or reinstall the app, your data can be restored from Google Drive without you doing anything. Your backup stays under the 25 MB cloud limit — large downloadable content like audio and PDFs are excluded and re-downloaded after restore.'}
              </p>
            </div>

            {/* 3. Manual File Export */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10">
                  <Download className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="text-xs font-bold text-foreground">
                  {t('infoManualExportTitle') || 'Manual File Export'}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('infoManualExportDesc') ||
                  'The "Save to Drive" button creates a .json backup file and opens your phone\'s share menu — you can save it to Google Drive, Downloads, or any file manager. This is your extra safety net: even if cloud backup isn\'t enabled on your phone, you\'ll have a file you control. We recommend saving a copy every few months or before switching phones. The file contains the same data as the automatic backup.'}
              </p>
            </div>

            {/* 4. Restore */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/10">
                  <Smartphone className="w-4 h-4 text-violet-500" />
                </div>
                <h4 className="text-xs font-bold text-foreground">
                  {t('infoRestoreTitle') || 'Restoring Your Data'}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('infoRestoreDesc') ||
                  'When you reinstall Noor Connect, the app automatically detects your previous backup and asks if you want to restore it — no file selection needed. This works for both Google Drive cloud restore and local device restore. If you saved a manual backup file, you can also restore from it using the "Restore file" button. Your settings, prayer data, bookmarks, Quran progress, and all other data will come back exactly as you left them. Downloaded e-books and audio will be re-downloaded automatically during restore.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
