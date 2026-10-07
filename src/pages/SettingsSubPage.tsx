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

import { getMadhab, setMadhab, type MadhabType } from '@/lib/storage';
import { AladhanAPI } from '@/lib/aladhan-api';
import { getStorageStats, clearAllBooks, formatFileSize } from '@/lib/ebooks-storage';
import { downloadManager } from '@/lib/download-manager';
import { clearCache } from '@/lib/backup';
import { notificationManager, type NotificationPreferences } from '@/lib/notification-manager';
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

const SECTION_TITLES: Record<string, { title: string; subtitle: string; icon: any }> = {
  appearance: { title: 'Theme & Appearance', subtitle: 'Display, animations & splash settings', icon: Palette },
  haptics: { title: 'Haptic Feedback', subtitle: 'Vibration & tactile feedback settings', icon: Vibrate },
  personal: { title: 'Personal Information', subtitle: 'Gender, language & preferred currency', icon: User },
  prayer: { title: 'Prayer Calculation', subtitle: 'Calculation method, Madhab & Hijri offset', icon: Clock },
  notifications: { title: 'Prayer Notifications', subtitle: 'Reminders, daily notifications & alerts', icon: Bell },
  adhan: { title: 'Adhan & Sounds', subtitle: 'Adhan audio selection & custom uploads', icon: Volume2 },
  backup: { title: 'Backup & Restore', subtitle: 'Cloud backup, sync & export settings', icon: Database },
  storage: { title: 'Storage & Cache', subtitle: 'Clear cache, offline Quran & download stats', icon: HardDrive },
  privacy: { title: 'Privacy & Security', subtitle: 'Data usage, local storage & permissions', icon: ShieldCheck },
  about: { title: 'About Noor Connect', subtitle: 'App version, changelog & developer', icon: Info },
  support: { title: 'Support Noor Connect', subtitle: 'Help support development — contact us to donate', icon: Heart },
  contact: { title: 'Contact & Hire Developer', subtitle: 'WhatsApp, portfolio & email contacts', icon: Mail },
};


/**
 * 12/24-hour time format toggle — used in both the Appearance and Prayer
 * settings sections. Persisting happens through time-formatter.setTimeFormat,
 * which dispatches `time-format-changed` so the whole app re-renders instantly.
 */
const TimeFormatControl = ({ withBorder = false }: { withBorder?: boolean }) => {
  const [timeFormat, setTimeFormat] = useTimeFormat();
  const { toast } = useToast();

  return (
    <div className={`flex items-center justify-between py-1 ${withBorder ? 'border-t border-slate-100 dark:border-slate-800 pt-3' : ''}`}>
      <div>
        <Label className="text-sm font-bold">Time Format</Label>
        <p className="text-xs text-slate-400">Prayer times, clock & countdowns</p>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => {
            setTimeFormat('12');
            toast({ title: 'Time format set to 12-hour' });
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeFormat === '12' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
        >
          12H
        </button>
        <button
          onClick={() => {
            setTimeFormat('24');
            toast({ title: 'Time format set to 24-hour' });
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

  const meta = SECTION_TITLES[sectionId] || { title: 'Settings', subtitle: 'Noor Connect Preferences', icon: Palette };
  const IconComponent = meta.icon;


  const handleClearCache = async () => {
    await clearCache();
    setStorageStats({ totalBooks: 0, totalSize: 0 });
    toast({ title: 'Cache cleared successfully' });
    setShowClearCacheDialog(false);
  };

  const handleClearQuranDownloads = async () => {
    try {
      await downloadManager.clearAll();
      setQuranDownloads({ count: 0, size: 0, reciters: 0 });
      toast({ title: 'Offline surahs deleted', description: 'All downloaded Quran audio has been removed from this device.' });
    } catch {
      toast({ title: 'Could not delete downloads', variant: 'destructive' });
    }
    setShowClearQuranDialog(false);
  };

  const handleClearBooks = async () => {
    await clearAllBooks();
    const stats = await getStorageStats();
    setStorageStats(stats);
    toast({ title: 'E-books deleted' });
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences, checked: boolean) => {
    const updated = { ...notificationPrefs, [key]: checked };
    setNotificationPrefs(updated);
    notificationManager.updatePreferences({ [key]: checked });
    toast({ title: `Notification ${checked ? 'enabled' : 'disabled'}` });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="Go back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {meta.title}
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              {meta.subtitle}
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
                Language
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="ur">اردو (Urdu)</SelectItem>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                  <SelectItem value="ru">Русский (Russian)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                  <SelectItem value="ko">한국어 (Korean)</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-4 rounded-2xl">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-bold">App Theme</Label>
                  <p className="text-xs text-slate-400">Switch between light & dark mode</p>
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-400'}`}
                  >
                    System
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow text-amber-400' : 'text-slate-400'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <TimeFormatControl withBorder />

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">Fluid Animations</Label>
                  <p className="text-xs text-slate-400">Enable smooth UI transitions</p>
                </div>
                <Switch checked={animationEnabled} onCheckedChange={setAnimationEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">Salam Greeting</Label>
                  <p className="text-xs text-slate-400">Show daily salam on home screen</p>
                </div>
                <Switch checked={greetingEnabled} onCheckedChange={setGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">Splash Welcome</Label>
                  <p className="text-xs text-slate-400">Show "Islamic Companion" on launch</p>
                </div>
                <Switch checked={splashGreetingEnabled} onCheckedChange={setSplashGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <Label className="text-sm font-bold">Splash Screen</Label>
                  <p className="text-xs text-slate-400">Enable app startup animation</p>
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
                Gender Preference
              </Label>
              <Select value={genderSettings.gender} onValueChange={(v: Gender) => setGenderSettingsState(setGender(v))}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="male">Man</SelectItem>
                  <SelectItem value="female">Woman (Includes Menstrual Mode)</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Preferred Currency
              </Label>
              <Select
                value={preferredCurrency}
                onValueChange={(curr) => {
                  setPreferredCurrency(curr);
                  localStorage.setItem('preferred-currency', curr);
                  toast({ title: 'Preferred currency updated' });
                }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="PKR">PKR - Pakistani Rupee (Rs)</SelectItem>
                  <SelectItem value="SAR">SAR - Saudi Riyal (SR)</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham (AED)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Calculation Method</Label>
              <PrayerMethodSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Madhab (Asr School of Jurisprudence)</Label>
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
                    toast({ title: 'Madhab set to Shafi / Maliki / Hanbali' });
                  }}
                >
                  Shafi / Maliki / Hanbali
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
                    toast({ title: 'Madhab set to Hanafi' });
                  }}
                >
                  Hanafi
                </Button>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Hijri Date Offset</Label>
              <Select
                value={hijriOffset}
                onValueChange={(val) => {
                  setHijriOffset(val);
                  localStorage.setItem('hijri-date-offset', val);
                  AladhanAPI.clearCachedData();
                  window.dispatchEvent(new Event('hijri-date-offset-changed'));
                  toast({ title: 'Hijri offset updated' });
                }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="-2">-2 Days</SelectItem>
                  <SelectItem value="-1">-1 Day</SelectItem>
                  <SelectItem value="0">0 Days (Standard)</SelectItem>
                  <SelectItem value="1">+1 Day</SelectItem>
                  <SelectItem value="2">+2 Days</SelectItem>
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
                <Label className="text-sm font-bold">Friday Surah Al-Kahf Reminders</Label>
                <p className="text-xs text-slate-400">Weekly reminder on Friday mornings</p>
              </div>
              <Switch
                checked={notificationPrefs.fridayKahfReminders}
                onCheckedChange={(c) => handleNotificationToggle('fridayKahfReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Ramadan & Eid Reminders</Label>
                <p className="text-xs text-slate-400">Countdown & event notifications</p>
              </div>
              <Switch
                checked={notificationPrefs.ramadanCountdowns}
                onCheckedChange={(c) => handleNotificationToggle('ramadanCountdowns', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Dhikr & Quran Verses</Label>
                <p className="text-xs text-slate-400">Daily spiritual verse pushes</p>
              </div>
              <Switch
                checked={notificationPrefs.quranicVerses}
                onCheckedChange={(c) => handleNotificationToggle('quranicVerses', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Tahajjud & Night Prayer</Label>
                <p className="text-xs text-slate-400">Pre-Fajr reminders during last third of night</p>
              </div>
              <Switch
                checked={notificationPrefs.tahajjudReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('tahajjudReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Salat al-Duha Reminders</Label>
                <p className="text-xs text-slate-400">Mid-morning Duha prayer alerts</p>
              </div>
              <Switch
                checked={notificationPrefs.duhaReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('duhaReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Sunnah Fasting Alerts</Label>
                <p className="text-xs text-slate-400">Monday & Thursday Sunnah fasting reminders</p>
              </div>
              <Switch
                checked={notificationPrefs.fastingDaysReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('fastingDaysReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Daily Quran Tilawat Goal</Label>
                <p className="text-xs text-slate-400">Evening recitation reminder</p>
              </div>
              <Switch
                checked={notificationPrefs.quranTrackerReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('quranTrackerReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm font-bold">Bedtime Sunnah Azkar</Label>
                <p className="text-xs text-slate-400">Nightly Ayatul Kursi & protection dua alerts</p>
              </div>
              <Switch
                checked={notificationPrefs.bedtimeDuaReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('bedtimeDuaReminders', c)}
              />
            </div>

            <div className="pt-3">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={async () => {
                  const res = await unifiedNotifications.testNotification();
                  toast({ title: res.success ? 'Test notification sent' : 'Notification failed' });
                }}
              >
                Send Test Notification
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
                  <Label className="text-sm font-bold">Prayer Alarm</Label>
                  <p className="text-xs text-slate-400">Play full Adhan sound at prayer times</p>
                </div>
                <Switch
                  checked={isAlarmEnabled}
                  onCheckedChange={(c) => (c ? enableAlarm() : disableAlarm())}
                />
              </div>
              <Button variant="outline" className="w-full rounded-xl gap-2 mt-2" onClick={testAdhan}>
                <Volume2 className="w-4 h-4" />
                Test Adhan Sound
              </Button>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Adhan Reciter Selection</Label>
              <AdhanSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Custom Adhan Sound</Label>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Storage Usage</Label>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Offline Quran Audio</span>
                <span className="text-amber-600">
                  {quranDownloads.reciters} reciter{quranDownloads.reciters !== 1 ? "s" : ""} • {quranDownloads.count} surah{quranDownloads.count !== 1 ? "s" : ""} • {formatFileSize(quranDownloads.size)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Downloaded E-books</span>
                <span className="text-amber-600">{formatFileSize(storageStats.totalSize)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-100 dark:border-slate-800 pt-2">
                <span>Books Cached</span>
                <span>{storageStats.totalBooks} files</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Button
                variant="destructive"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowClearCacheDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
                Clear Temporary Cache
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowClearQuranDialog(true)}
                disabled={quranDownloads.count === 0}
              >
                Delete Downloaded Surahs
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={handleClearBooks}
              >
                Delete Downloaded E-books
              </Button>
            </Card>

            <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Clear Cache?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>This will remove temporary files and downloaded content to free up space.</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Will be removed:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>Downloaded e-book PDFs</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>Offline cached assets (re-downloads on next visit)</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Your data is safe:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Prayer records, bookmarks, qaza tracker</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Settings, preferences, habit tracker</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Auto backup snapshot</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCache} className="rounded-xl bg-destructive text-white">
                    Clear Cache
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
                    Delete Downloaded Surahs?
                  </AlertDialogTitle>
<AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        This removes all offline Quran recitations from {quranDownloads.reciters} reciter{quranDownloads.reciters !== 1 ? "s" : ""}
                        ({quranDownloads.count} surah{quranDownloads.count !== 1 ? "s" : ""}, {formatFileSize(quranDownloads.size)}).
                      </p>
                      <p>Streaming will still work online. You can re-download any surah anytime from the Quran Audio page.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearQuranDownloads} className="rounded-xl bg-destructive text-white">
                    Delete Surahs
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
              <Label className="text-xs font-bold uppercase tracking-wider text-emerald-600">Privacy First Guarantee</Label>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Noor Connect stores all your prayer history, bookmarks, and settings locally on your device. We do not track or sell user data.
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
              <h2 className="text-lg font-bold">Noor Connect</h2>
              <p className="text-xs text-slate-400">Version {CURRENT_APP_VERSION}</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto pt-2">
                Built end-to-end: 6 languages, 400+ licensed nasheeds. Built for the sake of Allah.
              </p>
            </Card>

            {/* Contributors Section */}
            <Card className="p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">👥 Contributors</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">HSLN</span>
                  <a
                    href="https://gitlab.com/HSLN"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    French Translation
                  </a>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Nuraqueer</span>
                  <a
                    href="https://gitlab.com/nuraqueer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Korean Translation
                  </a>
                </div>
              </div>
            </Card>

            {/* Feedback Contributors Section */}
            <Card className="p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">💬 Feedback Contributors</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Haris</span>
                  <span className="text-slate-400">Sri Lanka</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Ibrahim Bn Tariq</span>
                  <span className="text-slate-400">Egypt</span>
                </div>
              </div>
            </Card>

            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => setShowChangelog(true)}
            >
              View Release Changelog
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
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Support Development</h3>
                  <p className="text-xs text-slate-400">100% free. No ads. Built for the sake of Allah.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Noor Connect is completely free with no ads or subscriptions. If you'd like to support development and help keep it free, we'd be truly grateful.
              </p>

              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">How to donate</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  If you would like to donate, kindly contact on WhatsApp via the number given in the app. Jazak Allah Khair.
                </p>
              </div>

              <Button
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all rounded-xl gap-2"
                onClick={() => window.open('https://wa.me/923352706540', '_blank')}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium">Contact on WhatsApp</span>
              </Button>
            </Card>
          </div>
        )}

        {/* CONTACT SECTION — Developer Info */}
        {sectionId === 'contact' && (
          <div className="space-y-4">
            <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20 rounded-2xl overflow-hidden space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Briefcase className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Love this app? I built it.</h3>
                  <p className="text-xs text-slate-400">One developer. Zero trackers. Built for the sake of Allah.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                I also build production software, websites, and security audits for businesses and startups. If you need a developer who delivers quality work, let's talk.
              </p>

              <div className="space-y-2.5 pt-2">
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all rounded-xl"
                  onClick={() => window.open('https://wa.me/923352706540', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Let's Talk on WhatsApp</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 justify-center bg-white dark:bg-slate-900 hover:bg-emerald-500/10 hover:text-emerald-700 transition-all rounded-xl border-slate-200 dark:border-slate-800"
                  onClick={() => window.open('https://ubaid-ur-rehmanportfolio.vercel.app/', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-emerald-600" />
                  <span className="font-medium">View my work</span>
                </Button>

                <button
                  className="w-full min-h-11 flex items-center gap-2.5 text-left text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-xl border border-slate-100 dark:border-slate-800/60"
                  onClick={() => window.location.href = 'mailto:arifubaid0345@gmail.com'}
                >
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Gmail</span> — arifubaid0345@gmail.com
                  </span>
                </button>

                <button
                  className="w-full min-h-11 flex items-center gap-2.5 text-left text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-xl border border-slate-100 dark:border-slate-800/60"
                  onClick={() => window.location.href = 'mailto:ubaid0345@proton.me'}
                >
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Other email: <span className="font-semibold text-slate-800 dark:text-slate-200">Proton</span> — ubaid0345@proton.me
                  </span>
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsSubPage;
