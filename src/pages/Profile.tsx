import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
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
  ArrowLeft,
  Settings as SettingsIcon,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CURRENT_APP_VERSION } from '@/lib/constants';
import { useI18n } from '@/hooks/useI18n';
import hapticService from '@/lib/haptic-service';
import { Switch } from '@/components/ui/switch';
import { notificationManager } from '@/lib/notification-manager';

interface SettingsRow {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconColor: string;
  route: string;
  asyncKey?: string;
}

interface SettingsGroup {
  id: string;
  title: string;
  badge?: string;
  rows: SettingsRow[];
}

const GROUPS: SettingsGroup[] = [
  {
    id: 'appearance',
    title: 'appearancePersonalization',
    badge: 'display',
    rows: [
      {
        id: 'appearance',
        title: 'themeAppearance',
        subtitle: 'darkModeThemesSubtitle',
        icon: Palette,
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        route: '/settings/appearance',
        asyncKey: 'theme',
      },
      {
        id: 'haptics',
        title: 'hapticFeedback',
        subtitle: 'hapticSubtitle',
        icon: Vibrate,
        gradient: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        route: '/settings/haptics',
        asyncKey: 'haptic',
      },
      {
        id: 'personal',
        title: 'personalInformation',
        subtitle: 'personalInfoSubtitle',
        icon: User,
        gradient: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        route: '/settings/personal',
      },
    ],
  },
  {
    id: 'prayer',
    title: 'prayerAdhanGroup',
    badge: 'spiritual',
    rows: [
      {
        id: 'prayer',
        title: 'prayerCalculation',
        subtitle: 'prayerCalculationSubtitle',
        icon: Clock,
        gradient: 'from-teal-500/10 via-teal-500/5 to-transparent border-teal-500/20',
        iconColor: 'text-teal-600 dark:text-teal-400',
        route: '/settings/prayer',
        asyncKey: 'prayer',
      },
      {
        id: 'notifications',
        title: 'prayerNotifications',
        subtitle: 'prayerNotificationsSubtitle',
        icon: Bell,
        gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        route: '/settings/notifications',
      },
      {
        id: 'adhan',
        title: 'adhanSoundsReciters',
        subtitle: 'adhanSoundsSubtitle',
        icon: Volume2,
        gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/20',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        route: '/settings/adhan',
      },
    ],
  },
  {
    id: 'data',
    title: 'dataStorageGroup',
    badge: 'system',
    rows: [
      {
        id: 'backup',
        title: 'backupRestore',
        subtitle: 'backupRestoreSubtitle',
        icon: Database,
        gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        route: '/settings/backup',
      },
      {
        id: 'storage',
        title: 'storageCache',
        subtitle: 'storageCacheSubtitle',
        icon: HardDrive,
        gradient: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        route: '/settings/storage',
        asyncKey: 'storage',
      },
      {
        id: 'privacy',
        title: 'privacySecurity',
        subtitle: 'privacySecuritySubtitle',
        icon: ShieldCheck,
        gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        route: '/settings/privacy',
      },
    ],
  },
  {
    id: 'about',
    title: 'aboutCommunity',
    badge: 'noorBadge',
    rows: [
      {
        id: 'about',
        title: 'aboutNoorConnect',
        subtitle: 'aboutRowSubtitle',
        icon: Info,
        gradient: 'from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        route: '/settings/about',
      },
      {
        id: 'support',
        title: 'supportDonate',
        subtitle: 'supportSubtitle',
        icon: Heart,
        gradient: 'from-pink-500/10 via-pink-500/5 to-transparent border-pink-500/20',
        iconColor: 'text-pink-600 dark:text-pink-400',
        route: '/settings/support',
      },
      {
        id: 'contact',
        title: 'contactFeedback',
        subtitle: 'contactFeedbackSubtitle',
        icon: Mail,
        gradient: 'from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20',
        iconColor: 'text-violet-600 dark:text-violet-400',
        route: '/settings/contact',
      },
    ],
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getCalcMethodDisplay(val: string | null): string | null {
  if (!val) return null;
  const mapping: Record<string, string> = {
    MWL: 'MWL',
    MuslimWorldLeague: 'MWL',
    ISNA: 'ISNA',
    NorthAmerica: 'ISNA',
    Egyptian: 'Egypt',
    Makkah: 'Umm al-Qura',
    UmmAlQura: 'Umm al-Qura',
    Karachi: 'Karachi',
    Tehran: 'Tehran',
    Jafari: 'Jafari',
    Singapore: 'Singapore',
    France: 'France',
    Turkey: 'Turkey',
    Russia: 'Russia',
    Moonsighting: 'Moonsighting',
    Custom: 'Custom',
  };
  if (mapping[val]) return mapping[val];
  return val.length > 6 ? val.substring(0, 6) + '…' : val;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [asyncValues, setAsyncValues] = useState<Record<string, string | null>>({});

  // NC-9: quick access to the "prayer time is ending" reminder straight from
  // the Profile page (full config lives in /settings/notifications).
  const [endReminderEnabled, setEndReminderEnabled] = useState(false);

  useEffect(() => {
    try {
      setEndReminderEnabled(notificationManager.getPreferences().prayerEndReminder ?? false);
    } catch {
      setEndReminderEnabled(false);
    }
  }, []);

  const handleEndReminderToggle = (checked: boolean) => {
    setEndReminderEnabled(checked);
    try {
      notificationManager.updatePreferences({ prayerEndReminder: checked });
      // Re-schedules all prayer-window notifications for the new pref.
      window.dispatchEvent(new Event('prayer-notification-prefs-changed'));
    } catch (error) {
      console.warn('Failed to update prayer-end reminder preference:', error);
    }
  };

  // Translate dynamic pill values that are app words (theme "System", haptic "On/Off");
  // other values (theme names, calculation methods, byte sizes) are shown as-is.
  const displayAsyncValue = (asyncKey: string, val: string): string => {
    if (asyncKey === 'haptic') {
      if (val === 'On') return t('on');
      if (val === 'Off') return t('off');
    }
    if (asyncKey === 'theme' && val === 'System') return t('system');
    return val;
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      const results: Record<string, string | null> = {};

      try {
        const rawTheme = localStorage.getItem('theme');
        if (rawTheme) {
          results['theme'] = rawTheme.charAt(0).toUpperCase() + rawTheme.slice(1);
        } else {
          results['theme'] = 'System';
        }
      } catch {
        results['theme'] = null;
      }

      try {
        // Read from the haptic service (Preferences-backed, single source
        // of truth) instead of the legacy 'hapticEnabled' localStorage key,
        // which was never written and made this pill show a wrong value.
        const hapticSettings = await hapticService.getSettingsAsync();
        results['haptic'] = hapticSettings.enabled ? 'On' : 'Off';
      } catch {
        results['haptic'] = null;
      }

      try {
        const calcMethod = localStorage.getItem('calculation-method') || localStorage.getItem('prayer_calculation_method');
        results['prayer'] = getCalcMethodDisplay(calcMethod);
      } catch {
        results['prayer'] = null;
      }

      try {
        if (typeof Filesystem !== 'undefined' && Filesystem.stat) {
          const stat = await Filesystem.stat({
            path: 'cache',
            directory: Directory.Cache,
          });
          results['storage'] = formatBytes(stat.size || 0);
        } else {
          results['storage'] = '—';
        }
      } catch {
        results['storage'] = '—';
      }

      setAsyncValues(results);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-32">
      {/* Sticky Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3.5 transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
              aria-label={t('goBack')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none flex items-center gap-2">
                {t('settings')}
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h1>
              <p className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-400 mt-0.5">
                Noor Connect • {t('mobileControlHub')}
              </p>
            </div>
          </div>

          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <SettingsIcon className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {/* Settings Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950/40 p-4 text-white shadow-md border border-slate-800">
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                <CheckCircle2 className="w-3 h-3 text-amber-400" />
                {t('performanceOptimized')}
              </div>
              <h2 className="text-base font-bold tracking-tight text-amber-100">
                {t('islamicMobileExperience')}
              </h2>
              <p className="text-xs text-slate-300 max-w-[240px]">
                {t('configureWithZeroLag')}
              </p>
            </div>

            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          {/* Background Decorative Element */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Group Cards */}
        {GROUPS.map((group) => (
          <React.Fragment key={group.id}>
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {t(group.title)}
                </h2>
                {group.badge && (
                  <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {t(group.badge)}
                  </span>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {group.rows.map((row) => {
                  const IconComponent = row.icon;
                  const hasAsyncKey = !!row.asyncKey;
                  const val = hasAsyncKey ? asyncValues[row.asyncKey!] : undefined;

                  return (
                    <div
                      key={row.id}
                      onClick={() => navigate(row.route)}
                      className="group flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-all duration-150 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${row.gradient} border flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                          <IconComponent className={`w-5 h-5 ${row.iconColor}`} />
                        </div>

                        <div className="min-w-0 flex-1 pe-2">
                          <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
                            {t(row.title)}
                          </div>
                          <div className="text-[11px] font-normal text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                            {t(row.subtitle)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                        {hasAsyncKey && (
                          val === undefined ? (
                            <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                          ) : val !== null ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                              {displayAsyncValue(row.asyncKey!, val)}
                            </span>
                          ) : null
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* NC-9: quick toggle for the "prayer time is ending" reminder,
                surfaced directly on the Profile page under the prayer group. */}
            {group.id === 'prayer' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/15 shadow-sm px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                      {t('prayerEndReminder')}
                    </div>
                    <div className="text-[11px] font-normal text-slate-400 dark:text-slate-400 mt-0.5">
                      {t('prayerEndReminderQuickSubtitle')}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ms-2">
                  <Switch
                    checked={endReminderEnabled}
                    onCheckedChange={handleEndReminderToggle}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Privacy & Version Footer */}
        <div className="pt-4 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <Lock className="w-3 h-3" />
            {t('privateLocalSecurity')}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
            Noor Connect v{CURRENT_APP_VERSION}
          </p>
        </div>

      </main>
    </div>
  );
};

export default Profile;
