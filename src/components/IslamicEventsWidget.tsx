/**
 * Islamic Events Widget
 * Displays upcoming Islamic events and today's special events
 */

import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Bell, Clock, Star } from 'lucide-react';
import { islamicEventsService } from '@/lib/islamic-events-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';

interface IslamicEvent {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  type: 'eid' | 'ramadan' | 'hajj' | 'other';
  daysUntil?: number;
  isToday?: boolean;
}

export function IslamicEventsWidget() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [todayEvent, setTodayEvent] = useState<IslamicEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<IslamicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();

    const handleRefresh = () => {
      loadEvents();
    };


    return () => {
    };
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Get today's Islamic event
      const todaysEvent = await islamicEventsService.getTodaysIslamicEvent();
      if (todaysEvent) {
        setTodayEvent({
          ...todaysEvent,
          isToday: true
        });
      } else {
        setTodayEvent(null);
      }

      // Get upcoming events
      const upcoming = await islamicEventsService.getUpcomingEventsNext7Days();
      setUpcomingEvents(upcoming.map(event => ({
        id: event.id,
        name: event.name,
        arabicName: event.arabicName,
        description: event.description,
        type: event.type,
        daysUntil: event.daysUntil
      })));

    } catch (error) {
      console.error('Error loading Islamic events:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadIslamicEvents'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleNotifications = async () => {
    try {
      await islamicEventsService.scheduleUpcomingEvents();
      toast({
        title: t('notificationsScheduled'),
        description: t('islamicEventNotificationsScheduled'),
      });
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      toast({
        title: t('error'),
        description: t('failedToScheduleNotifications'),
        variant: 'destructive'
      });
    }
  };

  const getEventColor = (_type: string) => {
    return 'bg-card/50 border border-[#C9860A]/20 backdrop-blur-sm';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'eid': return <Star className="w-4 h-4" />;
      case 'ramadan': return <Calendar className="w-4 h-4" />;
      case 'hajj': return <Clock className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9860A]/50 to-transparent" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#C9860A]/10 rounded-full blur-[20px] pointer-events-none" />

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
            <Calendar className="w-4 h-4 text-[#C9860A]" />
            {t('islamicEvents')}
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={scheduleNotifications}
            className="h-8 px-3 rounded-xl gap-2 text-[#C9860A] hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
          >
            <Bell className="w-4 h-4" />
            {t('notify')}
          </Button>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">{t('upcomingHolidaysSpecialDays')}</p>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {/* Today */}
        {todayEvent ? (
          <div className={`p-3 rounded-2xl ${getEventColor(todayEvent.type)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[#C9860A]">{getEventIcon(todayEvent.type)}</span>
                  <p className="text-sm font-bold text-white truncate">{todayEvent.name}</p>
                </div>
                <p className="font-arabic text-sm text-[#C9860A]/80 mt-1 truncate" dir="rtl">
                  {todayEvent.arabicName}
                </p>
              </div>
              <Badge className="rounded-full text-xs uppercase tracking-widest font-bold bg-[#C9860A]/10 text-[#C9860A] border-none">
                {t('today')}
              </Badge>
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-2">
              {todayEvent.description}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-card/50 border border-border/40 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
            {t('noSpecialEventsToday')}
          </div>
        )}

        {/* Upcoming */}
        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t('nextUp')}
            </p>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-2xl ${getEventColor(event.type)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#C9860A]">{getEventIcon(event.type)}</span>
                        <p className="text-xs font-bold text-white truncate">{event.name}</p>
                      </div>
                      <p className="font-arabic text-xs text-[#C9860A]/70 mt-1 truncate" dir="rtl">
                        {event.arabicName}
                      </p>
                    </div>
                    <Badge className="rounded-full text-xs uppercase tracking-widest font-bold bg-[#C9860A]/10 text-[#C9860A] border-none">
                      {event.daysUntil === 1 ? t('tomorrow') : t('daysAbbrev', { count: event.daysUntil })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
            {t('noUpcomingEvents7Days')}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl border-[#C9860A]/30 text-white hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
          onClick={() => navigate("/calendar")}
        >
          {t('viewCalendar')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default IslamicEventsWidget;
