/**
 * Weekly Salah History Chart
 * Shows prayer completion over the past 7 days
 */
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { getPrayerHistory, type DailyPrayers } from "@/lib/salah-tracker";
import { Skeleton } from "@/components/LoadingSkeleton";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/contexts/SettingsContext";
import { useAnimationTier } from "@/hooks/useAnimationTier";
import type { ChartData } from "./WeeklySalahChartRecharts";

const RechartsBarChart = lazy(() => import("./WeeklySalahChartRecharts"));

function SimpleBarFallback({ chartData }: { chartData: ChartData[] }) {
  return (
    <div className="flex items-end justify-between gap-1.5 h-full w-full px-1">
      {chartData.map((entry, index) => {
        const ratio = entry.total > 0 ? entry.completed / entry.total : 0;
        const height = Math.max(5, Math.round(ratio * 100));
        const color = entry.completed === 5
          ? "#C9860A"
          : entry.completed >= 3
            ? "rgba(201,134,10,0.65)"
            : entry.completed >= 1
              ? "rgba(201,134,10,0.35)"
              : "rgba(255,255,255,0.08)";
        return (
          <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <div className="w-full max-w-[28px] rounded-t" style={{ height: `${height}%`, backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground">{entry.day}</span>
          </div>
        );
      })}
    </div>
  );
}

export function WeeklySalahChart() {
  const { t: ti18n, formatDate } = useI18n();
  const { animationEnabled } = useSettings();
  const { tier } = useAnimationTier();
  const chartEnabled = animationEnabled && tier !== 'low' && tier !== 'minimal';
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, total: 0, percentage: 0 });

  // Guards against redundant state updates (e.g. a burst of 'salah-updated'
  // events with unchanged data) so the chart can never feed a render loop.
  const lastSnapshot = useRef<string>("");

  const refreshData = useCallback(() => {
    const history = getPrayerHistory(7);

    // Reverse to show oldest first (left to right)
    const data = history.reverse().map((day: DailyPrayers) => {
      const completed = [day.fajr, day.dhuhr, day.asr, day.maghrib, day.isha].filter(Boolean).length;
      const date = new Date(day.date);
      return {
        day: formatDate(date, { weekday: 'short' }),
        fullDate: formatDate(date, { month: 'short', day: 'numeric' }),
        completed,
        total: 5
      };
    });

    // Only show real data - no fake/sample data
    if (data.length === 0) {
      if (lastSnapshot.current !== "empty") {
        lastSnapshot.current = "empty";
        setChartData([]);
        setWeeklyStats({ completed: 0, total: 0, percentage: 0 });
      }
    } else {
      const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
      const totalPossible = 7 * 5;
      const stats = {
        completed: totalCompleted,
        total: totalPossible,
        percentage: Math.round((totalCompleted / totalPossible) * 100)
      };

      // Skip setState entirely when nothing changed — a setState with fresh
      // object identities re-renders, and (pre-useI18n memoization) that
      // re-render used to recreate this callback and re-run the effect,
      // refreshing + logging ~50×/sec. Belt-and-braces alongside the now
      // stable useI18n helpers.
      const snapshot = JSON.stringify([data, stats]);
      if (snapshot !== lastSnapshot.current) {
        lastSnapshot.current = snapshot;
        setChartData(data);
        setDataVersion(v => v + 1);
        setWeeklyStats(stats);
      }
    }
  }, [formatDate]);

  useEffect(() => {
    refreshData();

    // Listen for real-time updates
    window.addEventListener('salah-updated', refreshData);
    window.addEventListener('widget-refresh', refreshData);
    return () => {
      window.removeEventListener('salah-updated', refreshData);
      window.removeEventListener('widget-refresh', refreshData);
    };
  }, [refreshData]);

  return (
    <Card className="bg-[#1A1A1A] border border-[#C9860A]/30 overflow-hidden min-h-[200px] shadow-md">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9860A]" />
            {ti18n('weeklyProgress')}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3 h-3 text-[#C9860A]" />
            <span className="font-bold font-serif italic text-[#C9860A]">{weeklyStats.percentage}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Stats Summary */}
        <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-widest">
          <span className="text-muted-foreground">
            {weeklyStats.completed} / {weeklyStats.total} {ti18n('prayersThisWeek')}
          </span>
        </div>

        {/* Chart with fixed height to prevent CLS */}
        <div className="h-24 w-full min-h-[96px]">
          {chartData.length > 0 ? (
            chartEnabled ? (
              <Suspense fallback={<SimpleBarFallback chartData={chartData} />}>
                <RechartsBarChart chartData={chartData} dataVersion={dataVersion} />
              </Suspense>
            ) : (
              <SimpleBarFallback chartData={chartData} />
            )
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <p>{ti18n('noPrayerDataYet')}</p>
              <p className="text-xs mt-1">{ti18n('checkInPrayersToSeeProgress')}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#C9860A]" />
            <span>5/5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(201,134,10,0.65)' }} />
            <span>3-4</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(201,134,10,0.35)' }} />
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <span>0</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeeklySalahChart;
