/**
 * Quran Progress Widget
 * Displays overall Quran reading progress including completed surahs, streak, and achievements
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, TrendingUp, Award, Calendar } from 'lucide-react';
import { quranFeaturesService } from '@/lib/quran-features';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';

interface OverallProgress {
  totalSurahs: number;
  completedSurahs: number;
  totalAyahs: number;
  completedAyahs: number;
  totalPages: number;
  pagesRead: number;
  percentage: number;
}

interface QuranProgressWidgetProps {
  className?: string;
}

export function QuranProgressWidget({ className }: QuranProgressWidgetProps) {
  const [progress, setProgress] = useState<OverallProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const { toast } = useToast();

  const loadProgress = async () => {
    try {
      const progressData = await quranFeaturesService.getOverallProgress();
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading Quran progress:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadQuranProgress'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();

    // Listen for widget refresh events
    const handleRefresh = () => {
      loadProgress();
    };

    window.addEventListener('widget-refresh', handleRefresh);
    window.addEventListener('noorconnect:quran-progress-changed', handleRefresh);

    return () => {
      window.removeEventListener('widget-refresh', handleRefresh);
      window.removeEventListener('noorconnect:quran-progress-changed', handleRefresh);
    };
  }, []);

  const getAchievementBadge = (percentage: number) => {
    if (percentage >= 100) return { icon: Award, text: t('achievementCompleted') };
    if (percentage >= 75) return { icon: TrendingUp, text: t('achievementAdvanced') };
    if (percentage >= 50) return { icon: BookOpen, text: t('achievementProgressing') };
    if (percentage >= 25) return { icon: Calendar, text: t('achievementStarted') };
    return { icon: BookOpen, text: t('achievementBeginner') };
  };

  const getMotivationalMessage = (percentage: number) => {
    if (percentage >= 100) return t('quranMotivation100');
    if (percentage >= 75) return t('quranMotivation75');
    if (percentage >= 50) return t('quranMotivation50');
    if (percentage >= 25) return t('quranMotivation25');
    return t('quranMotivation0');
  };

  if (loading) {
    return (
      <Card className={`bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md ${className || ''}`}>
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
            <BookOpen className="w-5 h-5 text-[#C9860A]" />
            {t('quranProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="h-4 bg-muted/30 rounded w-2/4 ml-2" />
            <div className="h-4 bg-muted/30 rounded w-1/4 ml-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className={`bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md ${className || ''}`}>
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
            <BookOpen className="w-5 h-5 text-[#C9860A]" />
            {t('quranProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t('noProgressData')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-[#C9860A]/30 text-white hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
              onClick={() => window.location.href = '/quran'}
            >
              {t('startReading')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const achievement = getAchievementBadge(progress.percentage);
  const motivationalMessage = getMotivationalMessage(progress.percentage);

  return (
    <Card className={`relative overflow-hidden bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md ${className || ''}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9860A]/50 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9860A]/10 rounded-full blur-[20px] pointer-events-none" />

      <CardHeader className="relative z-10">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
          <BookOpen className="w-5 h-5 text-[#C9860A]" />
          {t('quranProgress')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {/* Main Progress Display */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24">
              <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
              <circle
                cx="48" cy="48" r="36" stroke="#C9860A" strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress.percentage / 100)}`}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px', transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-serif italic text-white">{Math.round(progress.percentage)}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold font-serif italic text-[#C9860A]">
              {progress.completedSurahs} / {progress.totalSurahs}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('surahsFullyCompleted')}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress.percentage} className="h-2 bg-black/50" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
            {t('pagesReadOf', { read: progress.pagesRead, total: progress.totalPages })}
          </p>
        </div>

        {/* Achievement Badge */}
        <div className="flex items-center justify-center">
          <Badge className="bg-[#C9860A]/10 text-[#C9860A] border border-[#C9860A]/30 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
            <achievement.icon className="w-4 h-4" />
            {achievement.text}
          </Badge>
        </div>

        {/* Motivational Message */}
        <div className="text-center p-3 bg-card/50 border border-border/40 rounded-lg">
          <p className="text-xs font-medium text-foreground/80">{motivationalMessage}</p>
        </div>

        {/* Action Button */}
        <div className="text-center space-y-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => window.location.href = '/quran'}
            className="gap-2 bg-[#C9860A] text-white hover:bg-[#C9860A]/90 font-bold uppercase tracking-wider text-xs w-full"
          >
            <BookOpen className="w-4 h-4" />
            {t('continueReading')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/quran-progress'}
            className="gap-2 w-full border-[#C9860A]/30 text-white hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
          >
            <TrendingUp className="w-4 h-4" />
            {t('viewDetails')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuranProgressWidget;
