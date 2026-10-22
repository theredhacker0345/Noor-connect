/**
 * Notification History Page
 * Displays all past notifications with filtering, day grouping and management options
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Clock, Calendar, Heart, BookOpen, Trash2, Filter, Search, Moon, Droplets, BookMarked, Sparkles, Sun, CloudMoon, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppBar } from '@/components/AppBar';
import { serviceWorkerManager, type NotificationHistoryItem } from '@/lib/service-worker-registration';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { unifiedNotifications } from '@/lib/unified-notifications';

const NotificationHistory = () => {
  const { t } = useLanguage();
  // Interpolated strings need the react-i18next t() (supports {{var}} params).
  const { t: tInterp } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  // Load notification history
  useEffect(() => {
    loadNotificationHistory();

    // Listen for updates from Service Worker
    const handleHistoryUpdate = (event: CustomEvent<NotificationHistoryItem[]>) => {
      setNotifications(event.detail);
      applyFilters(event.detail, searchTerm, filterType);
    };

    window.addEventListener('notificationHistoryUpdate', handleHistoryUpdate as EventListener);

    // Check permission status
    unifiedNotifications.getPermissionStatus().then(status => {
      setNotificationsSupported(status === 'granted');
    });

    return () => {
      window.removeEventListener('notificationHistoryUpdate', handleHistoryUpdate as EventListener);
    };
  }, []);

  // Apply filters when search or filter changes
  useEffect(() => {
    applyFilters(notifications, searchTerm, filterType);
  }, [notifications, searchTerm, filterType]);

  const loadNotificationHistory = async () => {
    setIsLoading(true);
    try {
      const history = await serviceWorkerManager.getNotificationHistory();
      setNotifications(history);
      setFilteredNotifications(history);
    } catch (error) {
      console.error('Failed to load notification history:', error);
      toast({
        title: t('error'),
        description: t('notifHistoryEmpty'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (items: NotificationHistoryItem[], search: string, type: string) => {
    let filtered = items;

    // Apply type filter
    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }

    // Apply search filter
    if (search) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.body.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const clearAllHistory = async () => {
    try {
      await serviceWorkerManager.clearNotificationHistory();
      setNotifications([]);
      setFilteredNotifications([]);
      toast({
        title: t('notifHistoryClearAll') + ' ✓'
      });
    } catch (error) {
      console.error('Failed to clear notification history:', error);
      toast({
        title: t('error'),
        description: t('notifHistoryClearAll'),
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'prayer':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'ramadan-countdown':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'eid':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'friday-kahf':
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'daily-hadith':
        return <BookMarked className="w-5 h-5 text-orange-500" />;
      case 'quranic-verse':
        return <BookOpen className="w-5 h-5 text-emerald-500" />;
      case 'dhikr-reminder':
        return <Sparkles className="w-5 h-5 text-teal-500" />;
      case 'tahajjud-reminder':
        return <Moon className="w-5 h-5 text-indigo-500" />;
      case 'duha-reminder':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'fasting-reminder':
        return <CloudMoon className="w-5 h-5 text-sky-500" />;
      case 'quran-tracker':
        return <BookMarked className="w-5 h-5 text-lime-600" />;
      case 'bedtime-dua':
        return <Moon className="w-5 h-5 text-violet-500" />;
      case 'haidh':
        return <Droplets className="w-5 h-5 text-rose-500" />;
      case 'islamic-sleep':
        return <Moon className="w-5 h-5 text-cyan-500" />;
      case 'islamic_event':
        return <Baby className="w-5 h-5 text-fuchsia-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'prayer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ramadan-countdown':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'eid':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'friday-kahf':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'daily-hadith':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground';
    }
  };

  const getNotificationTypeLabel = (type: string): string => {
    switch (type) {
      case 'prayer': return t('notifHistoryFilterPrayer');
      case 'ramadan-countdown': return t('notifHistoryFilterRamadan');
      case 'eid': return t('notifHistoryFilterEid');
      case 'friday-kahf': return t('notifHistoryFilterFriday');
      case 'daily-hadith': return t('notifHistoryFilterHadith');
      default: return type.replace('-', ' ');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return tInterp('notifHistoryJustNow');
    if (minutes < 60) return tInterp('notifHistoryMinutesAgo', { count: minutes });
    if (hours < 24) return tInterp('notifHistoryHoursAgo', { count: hours });
    if (days < 7) return tInterp('notifHistoryDaysAgo', { count: days });
    return formatTimestamp(timestamp);
  };

  /** Group filtered notifications into Today / Yesterday / earlier day buckets. */
  const groupedNotifications = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday.getTime() - 86_400_000;

    const groups: { label: string | null; items: NotificationHistoryItem[] }[] = [];
    let currentLabel: string | null | undefined = undefined;

    for (const item of filteredNotifications) {
      const ts = item.timestamp;
      let label: string | null;
      if (ts >= startOfToday.getTime()) {
        label = t('notifHistoryToday');
      } else if (ts >= startOfYesterday) {
        label = t('notifHistoryYesterday');
      } else {
        label = null; // absolute date shown per row
      }
      if (label !== currentLabel) {
        groups.push({ label, items: [item] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [filteredNotifications, t]);

  return (
    <div className="min-h-screen bg-background">
      <AppBar
        title={t("notificationHistory") || "Notification History"}
        showBack={true}
      />

      <div className="p-4 space-y-4">
        {/* Filters and Search */}
        <Card className="p-4 bg-muted/30">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder={t('notifHistorySearchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t('notifHistorySearchPlaceholder')}
                className="ps-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1" aria-label={t('notifHistoryAllTypes')}>
                  <Filter className="w-4 h-4 ms-2" aria-hidden="true" />
                  <SelectValue placeholder={t('notifHistoryAllTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('notifHistoryAllTypes')}</SelectItem>
                  <SelectItem value="prayer">{t('notifHistoryFilterPrayer')}</SelectItem>
                  <SelectItem value="ramadan-countdown">{t('notifHistoryFilterRamadan')}</SelectItem>
                  <SelectItem value="eid">{t('notifHistoryFilterEid')}</SelectItem>
                  <SelectItem value="friday-kahf">{t('notifHistoryFilterFriday')}</SelectItem>
                  <SelectItem value="daily-hadith">{t('notifHistoryFilterHadith')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={clearAllHistory}
                className="text-destructive hover:text-destructive"
                aria-label={t('notifHistoryClearAll')}
                disabled={notifications.length === 0}
              >
                <Trash2 className="w-4 h-4 me-2" aria-hidden="true" />
                {t('notifHistoryClearAll')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{notifications.length}</div>
            <div className="text-xs text-muted-foreground">{t('notifHistoryTotal')}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {notifications.filter(n => n.type === 'prayer').length}
            </div>
            <div className="text-xs text-muted-foreground">{t('notifHistoryPrayers')}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-green-500">
              {notifications.filter(n => n.type === 'ramadan-countdown').length}
            </div>
            <div className="text-xs text-muted-foreground">{t('notifHistoryRamadan')}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-red-500">
              {notifications.filter(n => n.type === 'eid').length}
            </div>
            <div className="text-xs text-muted-foreground">{t('notifHistoryEid')}</div>
          </Card>
        </div>

        {/* Notification List */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('notifHistoryRecent')}</h3>
            <Badge variant="secondary">
              {filteredNotifications.length} / {notifications.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" aria-hidden="true"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <p className="text-muted-foreground">
                {notifications.length === 0
                  ? t('notifHistoryEmpty')
                  : t('notifHistoryNoMatch')
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3" aria-live="polite">
                {groupedNotifications.map((group, groupIdx) => (
                  <div key={`group-${groupIdx}`} className="space-y-3">
                    {group.label && (
                      <div className="flex items-center gap-2 pt-1" aria-hidden="true">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                          {group.label}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {group.items.map((notification, index) => (
                      <Card key={`${notification.timestamp}-${index}`} className="p-4 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-muted/40 transition-all duration-300 hover:shadow-md hover:border-primary/20 group cursor-default mb-3 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true"></div>
                        <div className="flex items-start gap-4">
                          <div className="mt-1 bg-muted p-2 rounded-xl group-hover:bg-primary/10 transition-colors" aria-hidden="true">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <h4 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{notification.title}</h4>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${getNotificationBadgeColor(notification.type)}`}
                              >
                                {getNotificationTypeLabel(notification.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed opacity-90">
                              {notification.body}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60">
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              <time dateTime={new Date(notification.timestamp).toISOString()}>{getRelativeTime(notification.timestamp)}</time>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
              <ScrollBar />
            </ScrollArea>
          )}
        </Card>

        {/* Notification Engine Status */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold mb-3">
            {unifiedNotifications.isRunningAsNativeApp() ? t('notifHistoryAppStatus') : t('notifHistoryBrowserStatus')}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${unifiedNotifications.isRunningAsNativeApp() || serviceWorkerManager.getRegistrationStatus().isRegistered ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true"></div>
              <span>{unifiedNotifications.isRunningAsNativeApp() ? t('notifHistoryNativeBridge') : t('notifHistoryServiceWorker')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${notificationsSupported ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true"></div>
              <span>{t('notifHistoryPermissions')}</span>
            </div>
          </div>
          {unifiedNotifications.isRunningAsNativeApp() && (
            <p className="text-xs text-muted-foreground mt-3 italic">
              {t('notifHistoryNativeNote')}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NotificationHistory;
