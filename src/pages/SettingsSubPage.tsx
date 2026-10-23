import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Palette,
  Vibrate,
  User,
  Clock,
  Bell,
  Volume2,
  Database,
  HardDrive,
  ShieldCheck,
  Info,
  Heart,
  Mail,
  Globe,
  DollarSign,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Briefcase,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { useI18n } from '@/hooks/useI18n';
import { ContactPage } from '@/components/settings/ContactPage';
import { TafsirStorageCard } from '@/components/tafsir/TafsirStorageCard';
import { LANGUAGES, SUPPORTED_CODES } from '@/lib/language-config';

import { getMadhab, setMadhab, type MadhabType } from '@/lib/storage';
import { AladhanAPI } from '@/lib/aladhan-api';
import { getStorageStats, clearAllBooks, formatFileSize } from '@/lib/ebooks-storage';
import { downloadManager } from '@/lib/download-manager';
import { clearCache } from '@/lib/backup';
import { notificationManager, PRE_PRAYER_MINUTES_OPTIONS, POST_PRAYER_MINUTES_OPTIONS, type NotificationPreferences } from '@/lib/notification-manager';
import { unifiedNotifications } from '@/lib/unified-notifications';
import { getGenderSettings, setGender, type Gender } from '@/lib/gender-settings';
import { usePrayerAlarm } from '@/hooks/usePrayerAlarm';
import { CURRENT_APP_VERSION } from '@/lib/constants';

import { HapticSettings } from '@/components/HapticSettings';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { AdhanSelector } from '@/components/AdhanSelector';
import { CustomAdhanUpload } from '@/components/CustomAdhanUpload';
import { PrayerMethodSelector } from '@/components/PrayerMethodSelector';
import PermissionManager from '@/components/PermissionManager';
import { Changelog } from '@/components/Changelog';
import { AutoBackupCard } from '@/components/AutoBackupCard';

// H-2b i18n retrofit: titles/subtitles are translation KEYS, resolved via t() at
// render time so switching languages updates the header instantly.
// NOTE: the 'personal' subtitle previously claimed "Gender, language & preferred
// currency" but the language control actually lives in the 'appearance' section.
const SECTION_TITLES: Record<string, { titleKey: string; subtitleKey: string; icon: any }> = {
  appearance: { titleKey: 'sectionAppearanceTitle', subtitleKey: 'sectionAppearanceSubtitle', icon: Palette },
  haptics: { titleKey: 'sectionHapticsTitle', subtitleKey: 'sectionHapticsSubtitle', icon: Vibrate },
  personal: { titleKey: 'personalInformation', subtitleKey: 'sectionPersonalSubtitle', icon: User },
  prayer: { titleKey: 'sectionPrayerTitle', subtitleKey: 'sectionPrayerSubtitle', icon: Clock },
  notifications: { titleKey: 'prayerNotifications', subtitleKey: 'sectionNotificationsSubtitle', icon: Bell },
  adhan: { titleKey: 'sectionAdhanTitle', subtitleKey: 'sectionAdhanSubtitle', icon: Volume2 },
  backup: { titleKey: 'sectionBackupTitle', subtitleKey: 'sectionBackupSubtitle', icon: Database },
  storage: { titleKey: 'sectionStorageTitle', subtitleKey: 'sectionStorageSubtitle', icon: HardDrive },
  privacy: { titleKey: 'sectionPrivacyTitle', subtitleKey: 'sectionPrivacySubtitle', icon: ShieldCheck },
  about: { titleKey: 'sectionAboutTitle', subtitleKey: 'sectionAboutSubtitle', icon: Info },
  support: { titleKey: 'sectionSupportTitle', subtitleKey: 'sectionSupportSubtitle', icon: Heart },
  contact: { titleKey: 'sectionContactTitle', subtitleKey: 'sectionContactSubtitle', icon: Mail },
};

const DEFAULT_SECTION = { titleKey: 'settings', subtitleKey: 'settingsSubtitle', icon: Palette };


/**
 * 12/24-hour time format toggle — used in both the Appearance and Prayer
 * settings sections. Persisting happens through time-formatter.setTimeFormat,
 * which dispatches `time-format-changed` so the whole app re-renders instantly.
 */
const TimeFormatControl = ({ withBorder = false }: { withBorder?: boolean }) => {
  const [timeFormat, setTimeFormat] = useTimeFormat();
  const { toast } = useToast();
  const { t } = useI18n();

  return (
    <div className={`flex items-center justify-between py-1 ${withBorder ? 'border-t border-slate-100 dark:border-slate-800 pt-3' : ''}`}>
      <div>
        <Label className="text-sm font-bold">{t('timeFormat')}</Label>
        <p className="text-xs text-slate-400">{t('timeFormatDescription')}</p>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => {
            setTimeFormat('12');
            toast({ title: t('timeFormat12Toast') });
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeFormat === '12' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
        >
          12H
        </button>
        <button
          onClick={() => {
            setTimeFormat('24');
            toast({ title: t('timeFormat24Toast') });
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeFormat === '24' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
        >
          24H
        </button>
      </div>
    </div>
  );
};


const SettingsSubPage: React.FC = () => {
  const { sectionId = 'appearance' } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { t } = useI18n();
  const {
    theme,
    setTheme,
    animationEnabled,
    setAnimationEnabled,
    greetingEnabled,
    setGreetingEnabled,
    splashGreetingEnabled,
    setSplashGreetingEnabled,
    splashEnabled,
    setSplashEnabled,
  } = useSettings();

  const [madhab, setMadhabState] = useState<MadhabType>('shafi');
  const [storageStats, setStorageStats] = useState({ totalBooks: 0, totalSize: 0 });
  const [quranDownloads, setQuranDownloads] = useState({ count: 0, size: 0, reciters: 0 });
  const [genderSettings, setGenderSettingsState] = useState(getGenderSettings());
  const [preferredCurrency, setPreferredCurrency] = useState(() => localStorage.getItem('preferred-currency') || 'USD');
  const [hijriOffset, setHijriOffset] = useState('0');
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showClearQuranDialog, setShowClearQuranDialog] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    ramadanCountdowns: true,
    eidGreetings: true,
    fridayKahfReminders: true,
    dailyHadithNotifications: false,
    morningReminders: false,
    eveningReminders: false,
    quranicVerses: true,
    dhikrReminders: true,
    islamicKnowledge: true,
    motivationalMessages: true,
    tahajjudReminders: false,
    duhaReminders: false,
    fastingDaysReminders: false,
    quranTrackerReminders: false,
    bedtimeDuaReminders: false,
    prePrayerReminder: true,
    prePrayerMinutes: 15,
    postPrayerReminder: false,
    postPrayerMinutes: 15,
    maxDailyNotifications: 5,
  });

  const { isEnabled: isAlarmEnabled, testAdhan, enableAlarm, disableAlarm } = usePrayerAlarm();

  useEffect(() => {
    setMadhabState(getMadhab());
    setGenderSettingsState(getGenderSettings());
    setNotificationPrefs(notificationManager.getPreferences());

    const savedOffset = localStorage.getItem('hijri-date-offset');
    if (savedOffset) setHijriOffset(savedOffset);

    getStorageStats().then(setStorageStats);

    downloadManager.listDownloaded()
      .then((items) => {
        const reciterIds = new Set(items.map((it) => it.reciterId));
        setQuranDownloads({
          count: items.length,
          size: items.reduce((acc, it) => acc + it.size, 0),
          reciters: reciterIds.size,
        });
      })
      .catch(() => {});
  }, []);

  const meta = SECTION_TITLES[sectionId] || DEFAULT_SECTION;
  const IconComponent = meta.icon;


  const handleClearCache = async () => {
    await clearCache();
    setStorageStats({ totalBooks: 0, totalSize: 0 });
    toast({ title: t('cacheCleared') });
    setShowClearCacheDialog(false);
  };

  const handleClearQuranDownloads = async () => {
    try {
      await downloadManager.clearAll();
      setQuranDownloads({ count: 0, size: 0, reciters: 0 });
      toast({ title: t('offlineSurahsDeleted'), description: t('offlineSurahsDeletedDesc') });
    } catch {
      toast({ title: t('couldNotDeleteDownloads'), variant: 'destructive' });
    }
    setShowClearQuranDialog(false);
  };

  const handleClearBooks = async () => {
    await clearAllBooks();
    const stats = await getStorageStats();
    setStorageStats(stats);
    toast({ title: t('ebooksDeleted') });
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences, checked: boolean) => {
    const updated = { ...notificationPrefs, [key]: checked };
    setNotificationPrefs(updated);
    notificationManager.updatePreferences({ [key]: checked });
    // Task 21-d: pre/post reminder toggles change the scheduled notification set.
    if (key === 'prePrayerReminder' || key === 'postPrayerReminder') {
      window.dispatchEvent(new Event('prayer-notification-prefs-changed'));
    }
    toast({ title: t(checked ? 'notificationEnabledToast' : 'notificationDisabledToast') });
  };

  // Task 21-d: persist pre/post reminder minute values and reschedule.
  const handleNotificationMinutes = (key: 'prePrayerMinutes' | 'postPrayerMinutes', minutes: number) => {
    setNotificationPrefs({ ...notificationPrefs, [key]: minutes });
    notificationManager.updatePreferences({ [key]: minutes });
    window.dispatchEvent(new Event('prayer-notification-prefs-changed'));
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            aria-label={t('goBackToProfile')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {t(meta.titleKey)}
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              {t(meta.subtitleKey)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <IconComponent className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* APPEARANCE SECTION */}
        {sectionId === 'appearance' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-4 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {t('language')}
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {SUPPORTED_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {LANGUAGES[code].nativeLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-4 rounded-2xl">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-bold">{t('appTheme')}</Label>
                  <p className="text-xs text-slate-400">{t('switchLightDark')}</p>
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
                  >
                    {t('themeLight')}
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
                  >
                    {t('themeSystem')}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow text-amber-400' : 'text-slate-400'}`}
                  >
                    {t('themeDark')}
                  </button>
                </div>
              </div>

              <TimeFormatControl withBorder />

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">{t('fluidAnimations')}</Label>
                  <p className="text-xs text-slate-400">{t('fluidAnimationsDescription')}</p>
                </div>
                <Switch checked={animationEnabled} onCheckedChange={setAnimationEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">{t('salamGreeting')}</Label>
                  <p className="text-xs text-slate-400">{t('showDailySalam')}</p>
                </div>
                <Switch checked={greetingEnabled} onCheckedChange={setGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">{t('splashWelcome')}</Label>
                  <p className="text-xs text-slate-400">{t('splashWelcomeDescription')}</p>
                </div>
                <Switch checked={splashGreetingEnabled} onCheckedChange={setSplashGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">{t('splashScreen')}</Label>
                  <p className="text-xs text-slate-400">{t('splashScreenDescription')}</p>
                </div>
                <Switch checked={splashEnabled} onCheckedChange={setSplashEnabled} />
              </div>
            </Card>
          </div>
        )}

        {/* HAPTICS SECTION */}
        {sectionId === 'haptics' && <HapticSettings />}

        {/* PERSONAL SECTION */}
        {sectionId === 'personal' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('genderPreference')}
              </Label>
              <Select value={genderSettings.gender} onValueChange={(v: Gender) => setGenderSettingsState(setGender(v))}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="male">{t('man')}</SelectItem>
                  <SelectItem value="female">{t('womanIncludesMenstrual')}</SelectItem>
                  <SelectItem value="prefer-not-to-say">{t('preferNotToSay')}</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t('preferredCurrency')}
              </Label>
              <Select
                value={preferredCurrency}
                onValueChange={(curr) => {
                  setPreferredCurrency(curr);
                  localStorage.setItem('preferred-currency', curr);
                  toast({ title: t('preferredCurrencyUpdated') });
                }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="USD">{t('currencyUSD')}</SelectItem>
                  <SelectItem value="PKR">{t('currencyPKR')}</SelectItem>
                  <SelectItem value="SAR">{t('currencySAR')}</SelectItem>
                  <SelectItem value="AED">{t('currencyAED')}</SelectItem>
                  <SelectItem value="EUR">{t('currencyEUR')}</SelectItem>
                  <SelectItem value="GBP">{t('currencyGBP')}</SelectItem>
                  <SelectItem value="INR">{t('currencyINR')}</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>
        )}

        {/* PRAYER SECTION */}
        {sectionId === 'prayer' && (
          <div className="space-y-4">
            <Card className="p-4 rounded-2xl">
              <TimeFormatControl />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('calculationMethod')}</Label>
              <PrayerMethodSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('madhabAsrSchool')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={madhab === 'shafi' ? 'default' : 'outline'}
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setMadhabState('shafi');
                    setMadhab('shafi');
                    try {
                      localStorage.removeItem('cached_prayer_times');
                      localStorage.removeItem('cached-prayer-times');
                    } catch { /* ignore */ }
                    toast({ title: t('madhabSetShafi') });
                  }}
                >
                  {t('madhabShafi')}
                </Button>
                <Button
                  variant={madhab === 'hanafi' ? 'default' : 'outline'}
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setMadhabState('hanafi');
                    setMadhab('hanafi');
                    try {
                      localStorage.removeItem('cached_prayer_times');
                      localStorage.removeItem('cached-prayer-times');
                    } catch { /* ignore */ }
                    toast({ title: t('madhabSetHanafi') });
                  }}
                >
                  {t('madhabHanafi')}
                </Button>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('hijriDateAdjustment')}</Label>
              <Select
                value={hijriOffset}
                onValueChange={(val) => {
                  setHijriOffset(val);
                  localStorage.setItem('hijri-date-offset', val);
                  AladhanAPI.clearCachedData();
                  window.dispatchEvent(new Event('hijri-date-offset-changed'));
                  toast({ title: t('hijriOffsetUpdated') });
                }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="-2">{t('hijriOffsetMinus2')}</SelectItem>
                  <SelectItem value="-1">{t('hijriOffsetMinus1')}</SelectItem>
                  <SelectItem value="0">{t('hijriOffset0')}</SelectItem>
                  <SelectItem value="1">{t('hijriOffsetPlus1')}</SelectItem>
                  <SelectItem value="2">{t('hijriOffsetPlus2')}</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>
        )}

        {/* NOTIFICATIONS SECTION */}
        {sectionId === 'notifications' && (
          <Card className="p-4 space-y-3 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between pb-3">
              <div>
                <Label className="text-sm font-bold">{t('fridayKahfAlert')}</Label>
                <p className="text-xs text-slate-400">{t('fridayKahfReminderDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.fridayKahfReminders}
                onCheckedChange={(c) => handleNotificationToggle('fridayKahfReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('ramadanEidReminders')}</Label>
                <p className="text-xs text-slate-400">{t('ramadanEidRemindersDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.ramadanCountdowns}
                onCheckedChange={(c) => handleNotificationToggle('ramadanCountdowns', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('dhikrQuranVerses')}</Label>
                <p className="text-xs text-slate-400">{t('dhikrQuranVersesDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.quranicVerses}
                onCheckedChange={(c) => handleNotificationToggle('quranicVerses', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('tahajjudNightPrayer')}</Label>
                <p className="text-xs text-slate-400">{t('tahajjudNightPrayerDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.tahajjudReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('tahajjudReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('salatDuhaReminders')}</Label>
                <p className="text-xs text-slate-400">{t('salatDuhaRemindersDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.duhaReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('duhaReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('sunnahFastingAlerts')}</Label>
                <p className="text-xs text-slate-400">{t('sunnahFastingAlertsDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.fastingDaysReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('fastingDaysReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('quranTilawatGoal')}</Label>
                <p className="text-xs text-slate-400">{t('quranTilawatGoalDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.quranTrackerReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('quranTrackerReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('bedtimeSunnahAzkar')}</Label>
                <p className="text-xs text-slate-400">{t('bedtimeSunnahAzkarDesc')}</p>
              </div>
              <Switch
                checked={notificationPrefs.bedtimeDuaReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('bedtimeDuaReminders', c)}
              />
            </div>

            {/* Task 21-d: pre-prayer reminder (Switch + minutes Select). */}
            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('prePrayerReminder')}</Label>
                <p className="text-xs text-slate-400">{t('prePrayerReminderDescription')}</p>
              </div>
              <Switch
                checked={notificationPrefs.prePrayerReminder ?? true}
                onCheckedChange={(c) => handleNotificationToggle('prePrayerReminder', c)}
              />
            </div>
            {notificationPrefs.prePrayerReminder && (
              <div className="pb-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('prePrayerMinutesLabel')}</Label>
                <Select
                  value={String(notificationPrefs.prePrayerMinutes ?? 15)}
                  onValueChange={(v) => handleNotificationMinutes('prePrayerMinutes', Number(v))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PRE_PRAYER_MINUTES_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {String(minutes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task 21-d: post-prayer reminder (Switch + minutes Select). */}
            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">{t('postPrayerReminder')}</Label>
                <p className="text-xs text-slate-400">{t('postPrayerReminderDescription')}</p>
              </div>
              <Switch
                checked={notificationPrefs.postPrayerReminder ?? false}
                onCheckedChange={(c) => handleNotificationToggle('postPrayerReminder', c)}
              />
            </div>
            {notificationPrefs.postPrayerReminder && (
              <div className="pb-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('postPrayerMinutesLabel')}</Label>
                <Select
                  value={String(notificationPrefs.postPrayerMinutes ?? 15)}
                  onValueChange={(v) => handleNotificationMinutes('postPrayerMinutes', Number(v))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {POST_PRAYER_MINUTES_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {String(minutes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-3">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={async () => {
                  const res = await unifiedNotifications.testNotification();
                  toast({ title: res.success ? t('testNotificationSent') : t('notificationFailed') });
                }}
              >
                {t('testNotification')}
              </Button>
            </div>
          </Card>
        )}

        {/* ADHAN SECTION */}
        {sectionId === 'adhan' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold">{t('prayerAlarm')}</Label>
                  <p className="text-xs text-slate-400">{t('prayerAlarmDescription')}</p>
                </div>
                <Switch
                  checked={isAlarmEnabled}
                  onCheckedChange={(c) => (c ? enableAlarm() : disableAlarm())}
                />
              </div>
              <Button variant="outline" className="w-full rounded-xl gap-2 mt-2" onClick={testAdhan}>
                <Volume2 className="w-4 h-4" />
                {t('testAdhan')}
              </Button>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('adhanReciterSelection')}</Label>
              <AdhanSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('customAdhan')}</Label>
              <CustomAdhanUpload />
            </Card>
          </div>
        )}

        {/* BACKUP SECTION */}
        {sectionId === 'backup' && <AutoBackupCard />}

        {/* STORAGE SECTION */}
        {sectionId === 'storage' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('storageUsed')}</Label>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>{t('offlineQuranAudio')}</span>
                <span className="text-amber-600">
                  {t('recitersLabel', { count: quranDownloads.reciters })} • {t('surahsCountLabel', { count: quranDownloads.count })} • {formatFileSize(quranDownloads.size)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>{t('downloadedEbooks')}</span>
                <span className="text-amber-600">{formatFileSize(storageStats.totalSize)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-100 dark:border-slate-800 pt-2">
                <span>{t('booksCached')}</span>
                <span>{t('filesLabel', { count: storageStats.totalBooks })}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Button
                variant="destructive"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowClearCacheDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
                {t('clearTemporaryCache')}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowClearQuranDialog(true)}
                disabled={quranDownloads.count === 0}
              >
                {t('deleteDownloadedSurahs')}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={handleClearBooks}
              >
                {t('deleteDownloadedEbooks')}
              </Button>
            </Card>

            {/* Per-author whole-Quran tafsir downloads — real sizes + delete */}
            <TafsirStorageCard />

            <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    {t('clearCacheConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>{t('clearCacheDialogDesc')}</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">{t('willBeRemoved')}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>{t('downloadedEbookPdfs')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>{t('offlineCachedAssets')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">{t('yourDataIsSafe')}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{t('safePrayerRecords')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{t('safeSettingsPreferences')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{t('safeAutoBackup')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCache} className="rounded-xl bg-destructive text-white">
                    {t('clearCache')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* DELETE DOWNLOADED SURAHS DIALOG */}
            <AlertDialog open={showClearQuranDialog} onOpenChange={setShowClearQuranDialog}>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    {t('deleteDownloadedSurahsTitle')}
                  </AlertDialogTitle>
<AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        {t('deleteQuranDesc1', {
                          surahs: t('surahsCountLabel', { count: quranDownloads.count }),
                          size: formatFileSize(quranDownloads.size),
                        })}
                      </p>
                      <p>{t('deleteQuranDesc2')}</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearQuranDownloads} className="rounded-xl bg-destructive text-white">
                    {t('deleteSurahs')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* PRIVACY SECTION */}
        {sectionId === 'privacy' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-2 rounded-2xl bg-emerald-500/5 border-emerald-500/20">
              <Label className="text-xs font-bold uppercase tracking-wider text-emerald-600">{t('privacyFirstGuarantee')}</Label>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('privacyFirstDesc')}
              </p>
            </Card>

            <PermissionManager />
          </div>
        )}

        {/* ABOUT SECTION */}
        {sectionId === 'about' && (
          <div className="space-y-4">
            <Card className="p-5 text-center space-y-2 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold">{t('appTitle')}</h2>
              <p className="text-xs text-slate-400">{t('version')} {CURRENT_APP_VERSION}</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto pt-2">
                {t('aboutTagline')}
              </p>
            </Card>


            {/* Contributors Section */}
            <Card className="p-5 rounded-2xl space-y-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="text-lg">👥</span> {t('contributors')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      HS
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">HSLN</p>
                      <p className="text-xs text-slate-400">{t('contributorFrench')}</p>
                    </div>
                  </div>
                  <a
                    href="https://gitlab.com/HSLN"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all"
                  >
                    GitLab
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      NU
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nuraqueer</p>
                      <p className="text-xs text-slate-400">{t('contributorKorean')}</p>
                    </div>
                  </div>
                  <a
                    href="https://gitlab.com/nuraqueer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-all"
                  >
                    GitLab
                  </a>
                </div>
              </div>
            </Card>

            {/* Feedback Contributors Section */}
            <Card className="p-5 rounded-2xl space-y-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="text-lg">💬</span> {t('feedbackContributors')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      HA
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Haris</p>
                      <p className="text-xs text-slate-400">{t('countrySriLanka')}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('feedbackBadge')}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                      IB
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ibrahim Bn Tariq</p>
                      <p className="text-xs text-slate-400">{t('countryEgypt')}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400">{t('feedbackBadge')}</span>
                </div>
              </div>
            </Card>

            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => setShowChangelog(true)}
            >
              {t('viewChangelog')}
            </Button>

            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
          </div>
        )}

        {/* SUPPORT SECTION */}
        {sectionId === 'support' && (
          <div className="space-y-4">
            <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{t('supportDevelopment')}</h3>
                  <p className="text-xs text-slate-400">{t('supportSubtitle')}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('supportBody')}
              </p>

              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('howToDonate')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('howToDonateDesc')}
                </p>
              </div>

              <Button
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all rounded-xl gap-2"
                onClick={() => window.open('https://wa.me/923352706540', '_blank')}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium">{t('contactOnWhatsapp')}</span>
              </Button>
            </Card>
          </div>
        )}

        {/* CONTACT SECTION — Card + FAQ redesign (see ContactPage) */}
        {sectionId === 'contact' && <ContactPage />}
      </main>
    </div>
  );
};

export default SettingsSubPage;
