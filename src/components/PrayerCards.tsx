import { memo, useMemo } from "react";
import { Clock, Moon, Sun, Sunset, Cloud, CloudMoon, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LocationSearch } from "@/components/LocationSearch";
import type { LocationData, PrayerTimesWithEnd } from "@/hooks/usePrayerTimes";
import { formatPrayerTime } from "@/lib/time-formatter";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import {
  getCurrentPrayer,
  type PrayerWithEndTime,
} from "@/lib/prayer-end-times";

const prayerIcons: Record<string, React.ReactNode> = {
  Fajr: <Moon className="w-5 h-5" />,
  Dhuhr: <Sun className="w-5 h-5" />,
  Asr: <Cloud className="w-5 h-5" />,
  Maghrib: <Sunset className="w-5 h-5" />,
  Isha: <CloudMoon className="w-5 h-5" />,
};

export interface PrayerCardsProps {
  timings: PrayerTimesWithEnd | null;
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  needsManualLocation: boolean;
  refresh: () => Promise<void>;
  setManualLocation: (city: string, country: string) => Promise<void>;
}

const PrayerCardsComponent = function PrayerCards({
  timings,
  location,
  isLoading,
  error,
  needsManualLocation,
  refresh,
  setManualLocation,
}: PrayerCardsProps) {
  const [timeFormat] = useTimeFormat();

  const prayersWithEndTimes: PrayerWithEndTime[] = useMemo(() => {
    if (!timings) return [];

    return [
      {
        name: "Fajr",
        time: formatPrayerTime(timings.fajr.start, timeFormat),
        datetime: timings.fajr.start,
        endTime: timings.fajr.end,
        endTimeFormatted: formatPrayerTime(timings.fajr.end, timeFormat),
      },
      {
        name: "Dhuhr",
        time: formatPrayerTime(timings.dhuhr.start, timeFormat),
        datetime: timings.dhuhr.start,
        endTime: timings.dhuhr.end,
        endTimeFormatted: formatPrayerTime(timings.dhuhr.end, timeFormat),
      },
      {
        name: "Asr",
        time: formatPrayerTime(timings.asr.start, timeFormat),
        datetime: timings.asr.start,
        endTime: timings.asr.end,
        endTimeFormatted: formatPrayerTime(timings.asr.end, timeFormat),
      },
      {
        name: "Maghrib",
        time: formatPrayerTime(timings.maghrib.start, timeFormat),
        datetime: timings.maghrib.start,
        endTime: timings.maghrib.end,
        endTimeFormatted: formatPrayerTime(timings.maghrib.end, timeFormat),
      },
      {
        name: "Isha",
        time: formatPrayerTime(timings.isha.start, timeFormat),
        datetime: timings.isha.start,
        endTime: timings.isha.end,
        endTimeFormatted: formatPrayerTime(timings.isha.end, timeFormat),
      },
    ];
  }, [timings, timeFormat]);

  const currentPrayer = useMemo(() => getCurrentPrayer(prayersWithEndTimes), [prayersWithEndTimes]);

  const nextPrayer = useMemo(() => {
    const now = new Date();
    return prayersWithEndTimes.find((p) => p.datetime > now && p !== currentPrayer) || null;
  }, [prayersWithEndTimes, currentPrayer]);

  if (needsManualLocation) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Prayer Times</h2>
          {location && (
            <div className="text-xs text-muted-foreground">
              📍{" "}
              {location.city && location.country
                ? `${location.city}, ${location.country}`
                : `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
              <span className="ml-2 px-2 py-1 bg-muted rounded">
                {location.source === "geolocation"
                  ? "🛰️ GPS"
                  : location.source === "default"
                    ? "🏛️ Default"
                    : "🔍 Manual"}
              </span>
            </div>
          )}
        </div>
        <LocationSearch onLocationSelect={setManualLocation} isLoading={isLoading} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Prayer Times</h2>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`prayer-card-skeleton-${i}`} className="p-4 min-h-[88px]">
              <div className="h-4 w-16 bg-muted rounded animate-pulse mb-2" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Prayer Times</h2>
          {location && (
            <div className="text-xs text-muted-foreground">
              📍{" "}
              {location.city && location.country
                ? `${location.city}, ${location.country}`
                : `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
            </div>
          )}
        </div>

        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-start gap-3 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-medium">Failed to load prayer times</p>
                <p className="text-sm">{error}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={refresh} className="text-sm underline hover:no-underline">
                    Try again
                  </button>
                  <button
                    onClick={() => setManualLocation("Karachi", "Pakistan")}
                    className="text-sm underline hover:no-underline"
                  >
                    Use Karachi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (prayersWithEndTimes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Prayer Times</h2>
        {location && (
          <div className="text-xs text-muted-foreground">
            📍{" "}
            {location.city && location.country
              ? `${location.city}, ${location.country}`
              : `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
            <span className="ml-2 px-2 py-1 bg-muted rounded">
              {location.source === "geolocation"
                ? "🛰️ GPS"
                : location.source === "default"
                  ? "🏛️ Default"
                  : "🔍 Manual"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {prayersWithEndTimes.map((prayer) => {
          const isCurrent = currentPrayer?.name === prayer.name;
          const isNext = nextPrayer?.name === prayer.name;

          return (
            <Card
              key={prayer.name}
              className={`p-4 border transition-colors ${
                isCurrent
                  ? "border-primary/40 bg-primary/5"
                  : isNext
                    ? "border-blue-200 bg-blue-50"
                    : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isCurrent
                      ? "bg-primary/15 text-primary"
                      : isNext
                        ? "bg-blue-100 text-blue-600"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {prayerIcons[prayer.name] || <Clock className="w-5 h-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{prayer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isCurrent ? "Current" : isNext ? "Next" : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold font-mono leading-none">{prayer.time}</p>
                      <p className="text-xs text-muted-foreground leading-none mt-1">
                        until {prayer.endTimeFormatted}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const PrayerCards = memo(PrayerCardsComponent);
