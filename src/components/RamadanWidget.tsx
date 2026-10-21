import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Moon, Sunrise, Sunset, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrayerTime } from "@/lib/time-formatter";
import type { PrayerTimesWithEnd } from "@/hooks/usePrayerTimes";
import { useI18n } from "@/hooks/useI18n";

export interface RamadanWidgetProps {
  isRamadan: boolean;
  ramadanDay: number;
  prayerTimesWithEnd: PrayerTimesWithEnd | null;
  timeFormat: "12" | "24";
  timeZone?: string;
}

const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

interface NextInfo {
  label: string;
  time: Date | null;
  countdown: string;
}

export function RamadanWidget({
  isRamadan,
  ramadanDay,
  prayerTimesWithEnd,
  timeFormat,
  timeZone,
}: RamadanWidgetProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [nextInfo, setNextInfo] = useState<NextInfo>({ label: "", time: null, countdown: "" });

  const fajrStart = prayerTimesWithEnd?.fajr?.start ?? null;
  const maghribStart = prayerTimesWithEnd?.maghrib?.start ?? null;

  const suhoorTimeText = useMemo(() => {
    if (!fajrStart) return "";
    return formatPrayerTime(fajrStart, timeFormat, timeZone);
  }, [fajrStart, timeFormat, timeZone]);

  const iftarTimeText = useMemo(() => {
    if (!maghribStart) return "";
    return formatPrayerTime(maghribStart, timeFormat, timeZone);
  }, [maghribStart, timeFormat, timeZone]);

  const computeNext = useCallback(() => {
    if (!isRamadan || !fajrStart || !maghribStart) {
      setNextInfo(prev =>
        prev.label === "" && prev.time === null && prev.countdown === ""
          ? prev
          : { label: "", time: null, countdown: "" }
      );
      return;
    }

    const now = new Date();

    // Ramadan day events:
    // - Before Fajr: Suhoor ends at Fajr
    // - Between Fajr and Maghrib: Iftar at Maghrib
    // - After Maghrib: Suhoor ends tomorrow (approx. +24h from today's Fajr)
    let label: string;
    let time: Date;
    if (now < fajrStart) {
      label = t('suhoorEnds');
      time = fajrStart;
    } else if (now < maghribStart) {
      label = t('iftar');
      time = maghribStart;
    } else {
      label = t('suhoorEndsTomorrow');
      time = new Date(fajrStart.getTime() + 24 * 60 * 60 * 1000);
    }
    const countdown = formatCountdown(time.getTime() - now.getTime());

    setNextInfo(prev => {
      if (
        prev.label === label &&
        prev.countdown === countdown &&
        ((prev.time === null && time === null) || prev.time?.getTime() === time.getTime())
      ) {
        return prev;
      }
      return { label, time, countdown };
    });
  }, [isRamadan, fajrStart, maghribStart, t]);

  useEffect(() => {
    computeNext();
    const id = window.setInterval(computeNext, 1000);
    return () => window.clearInterval(id);
  }, [computeNext]);

  const fastingProgress = useMemo(() => {
    if (!isRamadan || !fajrStart || !maghribStart) return null;
    const now = new Date();
    if (now <= fajrStart) return 0;
    if (now >= maghribStart) return 100;
    const total = maghribStart.getTime() - fajrStart.getTime();
    const done = now.getTime() - fajrStart.getTime();
    return Math.round((done / Math.max(1, total)) * 100);
  }, [isRamadan, fajrStart, maghribStart]);

  if (!isRamadan) {
    return (
      <Card className="relative overflow-hidden bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9860A]/50 to-transparent" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-white">
              <Moon className="w-4 h-4 text-[#C9860A]" />
              {t('ramadan')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-xl text-[#C9860A] hover:text-[#E8A020] hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
              onClick={() => navigate("/ramadan")}
            >
              {t('open')}
              <ArrowUpRight className="w-4 h-4 ms-1" />
            </Button>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">
            {t('ramadanWidgetDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase font-bold tracking-widest">
            <Badge variant="secondary" className="rounded-full bg-[#C9860A]/10 text-[#C9860A] border-none">
              {t('notInRamadan')}
            </Badge>
            <Badge variant="outline" className="rounded-full border-[#C9860A]/30 text-white/60">
              {t('planAhead')}
            </Badge>
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full rounded-xl bg-[#C9860A] text-white hover:bg-[#C9860A]/90 font-bold uppercase tracking-wider text-xs"
            onClick={() => navigate("/ramadan")}
          >
            {t('openRamadanMode')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasTimes = Boolean(fajrStart && maghribStart);

  return (
    <Card className="relative overflow-hidden bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9860A]/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-white">
            <Moon className="w-4 h-4 text-[#C9860A]" />
            {t('ramadan')}
          </CardTitle>
          <Badge variant="secondary" className="rounded-full bg-[#C9860A]/10 text-[#C9860A] border-none uppercase tracking-widest font-bold text-xs">
            {ramadanDay ? t('ramadanDayLabel', { count: ramadanDay }) : "—"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasTimes ? (
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
            {t('loadingSuhoorIftar')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">
                  <Sunrise className="w-3.5 h-3.5 text-[#C9860A]" />
                  {t('suhoorEnds')}
                </div>
                <div className="text-xl font-bold font-serif italic tabular-nums text-white">
                  {suhoorTimeText}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">
                  <Sunset className="w-3.5 h-3.5 text-[#C9860A]" />
                  {t('iftar')}
                </div>
                <div className="text-xl font-bold font-serif italic tabular-nums text-white">
                  {iftarTimeText}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#C9860A]/10 border border-[#C9860A]/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#C9860A]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white">{nextInfo.label || t('next')}</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-[#C9860A]">
                  {nextInfo.countdown || "—"}
                </span>
              </div>

              {typeof fastingProgress === "number" && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    <span>{t('fastingProgress')}</span>
                    <span className="font-bold text-[#C9860A]">{fastingProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C9860A] transition-all duration-500"
                      style={{ width: `${fastingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-[#C9860A]/30 text-white hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
              onClick={() => navigate("/ramadan")}
            >
              {t('openRamadanMode')}
              <ArrowUpRight className="w-4 h-4 ms-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default RamadanWidget;

