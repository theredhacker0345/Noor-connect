/**
 * Prayer Stats Widget
 * Shows prayer tracking statistics and achievements
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Award, Target, CheckCircle, Trophy, Flame, Medal } from "lucide-react";
import { getPrayerHistory, getSalahStats } from "@/lib/salah-tracker";

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

type RangeKey = "week" | "month";

interface PrayerStatsSummary {
  rangeKey: RangeKey;
  rangeDays: number;
  completed: number;
  totalPossible: number;
  completionRate: number;
  averagePerDay: number;
  currentStreak: number;
  longestStreak: number;
  todayCompleted: number;
}

export function PrayerStatsWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PrayerStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<RangeKey>("week");

  const loadStats = useCallback(() => {
    try {
      const rangeDays = timeRange === "week" ? 7 : 30;
      const history = getPrayerHistory(rangeDays);
      const completionCounts = history.map((day) => PRAYER_KEYS.filter((k) => day[k]).length);

      const completed = completionCounts.reduce((sum, n) => sum + n, 0);
      const totalPossible = history.length * 5;
      const completionRate = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0;
      const averagePerDay = history.length > 0 ? Math.round((completed / history.length) * 10) / 10 : 0;

      const salahStats = getSalahStats();

      setStats({
        rangeKey: timeRange,
        rangeDays,
        completed,
        totalPossible,
        completionRate,
        averagePerDay,
        currentStreak: salahStats.currentStreak,
        longestStreak: salahStats.longestStreak,
        todayCompleted: salahStats.todayCompleted,
      });
    } catch (error) {
      console.error('Error loading prayer stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadStats();

    // Listen for prayer tracking updates
    window.addEventListener('salah-updated', loadStats);

    return () => {
      window.removeEventListener('salah-updated', loadStats);
    };
  }, [loadStats]);

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-[#C9860A] bg-card border-[#C9860A]/50 shadow-[0_0_10px_rgba(201,134,10,0.2)]';
    if (streak >= 14) return 'text-[#C9860A] bg-card border-[#C9860A]/40';
    if (streak >= 7) return 'text-[#C9860A] bg-card border-[#C9860A]/30';
    return 'text-[#C9860A] bg-card border-border/40';
  };

  const achievements = useMemo(() => {
    if (!stats) return [];

    const rangeIsWeek = stats.rangeKey === "week";

    return [
      {
        id: "perfect-range",
        title: rangeIsWeek ? "Perfect Week" : "Perfect Month",
        description: rangeIsWeek ? "Completed all prayers this week" : "Completed all prayers this month",
        icon: Trophy,
        unlocked: stats.completionRate === 100 && stats.totalPossible > 0,
      },
      {
        id: "streak-7",
        title: "Consistency",
        description: "Maintain a 7‑day streak",
        icon: Flame,
        unlocked: stats.currentStreak >= 7,
      },
      {
        id: "rate-80",
        title: "Momentum",
        description: rangeIsWeek ? "80%+ completion this week" : "80%+ completion this month",
        icon: Medal,
        unlocked: stats.completionRate >= 80 && stats.totalPossible > 0,
      },
    ].filter((a) => a.unlocked);
  }, [stats]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const missed = Math.max(0, stats.totalPossible - stats.completed);

  return (
    <Card className="relative overflow-hidden bg-[#1A1A1A] border border-[#C9860A]/30 transition-all duration-500 shadow-md">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9860A]/50 to-transparent" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C9860A]/20 rounded-full blur-2xl" />
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
            <TrendingUp className="w-4 h-4 text-[#C9860A]" />
            Prayer Statistics
          </CardTitle>
          <div className="flex gap-1 relative z-10">
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2 text-xs uppercase font-bold tracking-wider rounded-lg ${timeRange === 'week' ? 'bg-[#C9860A] text-white hover:bg-[#C9860A]/90' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTimeRange('week')}
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2 text-xs uppercase font-bold tracking-wider rounded-lg ${timeRange === 'month' ? 'bg-[#C9860A] text-white hover:bg-[#C9860A]/90' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTimeRange('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-[#C9860A]" />
              <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold font-serif italic text-white">
              {stats.completed}
            </p>
            <p className="text-xs uppercase font-bold text-muted-foreground mt-1 tracking-wider">
              {stats.completionRate}% rate
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-[#C9860A]" />
              <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Remaining</span>
            </div>
            <p className="text-2xl font-bold font-serif italic text-white">
              {missed}
            </p>
            <p className="text-xs uppercase font-bold text-muted-foreground mt-1 tracking-wider">
              of {stats.totalPossible}
            </p>
          </div>
        </div>

        {/* Current Streak */}
        <div className={`p-3 rounded-xl border backdrop-blur-sm ${getStreakColor(stats.currentStreak)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C9860A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Streak</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-serif italic text-white">{stats.currentStreak}</p>
              <p className="text-xs font-bold uppercase text-muted-foreground">days</p>
            </div>
          </div>
          {stats.longestStreak > stats.currentStreak && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
              Longest: {stats.longestStreak} days
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Completion Rate</span>
            <span className="text-[#C9860A]">
              {stats.completionRate}%
            </span>
          </div>
          <Progress 
            value={stats.completionRate} 
            className="h-2 bg-black/50"
          />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center pt-1">
            Avg {stats.averagePerDay}/5 per day • Today {stats.todayCompleted}/5
          </p>
        </div>

        {/* Achievements */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
            <Trophy className="w-4 h-4 text-[#C9860A]" />
            Recent Achievements
          </h4>
          <div className="space-y-2">
            {achievements.length > 0 ? (
              achievements.slice(0, 2).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/40 backdrop-blur-sm"
                >
                  <achievement.icon className="w-4 h-4 text-[#C9860A]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{achievement.title}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">{achievement.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground p-3 rounded-lg bg-card/50 border border-border/40 text-center">
                Keep checking in your prayers to unlock achievements.
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-[#C9860A]/30 text-white hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
          onClick={() => navigate('/prayer-stats')}
        >
          <Calendar className="w-4 h-4" />
          View Detailed Stats
        </Button>
      </CardContent>
    </Card>
  );
}

export default PrayerStatsWidget;
