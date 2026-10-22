/**
 * Haptic Settings Component
 * Allows users to configure haptic feedback preferences
 *
 * Capability UX: devices without a vibration motor get (a) an AlertDialog
 * explainer that auto-opens once per page visit and (b) a persistent inline
 * amber banner, while every toggle stays usable (settings are kept so they
 * still apply if the user switches devices).
 */

import { useState, useEffect } from 'react';
import { Vibrate, VibrateOff, HandHeart, Bell, Bookmark, MousePointer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import hapticService, { type HapticSettings } from '@/lib/haptic-service';

export function HapticSettings() {
  const { toast } = useToast();
  const { t } = useI18n();
  // Capability is evaluated exactly ONCE per page visit (lazy initializer).
  const [hasVibration] = useState(() => hapticService.hasVibrationSupport());
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [settings, setSettings] = useState<HapticSettings>(hapticService.getSettings());
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load current settings
    setSettings(hapticService.getSettings());
    // Auto-open the "no vibration" explainer once per page visit when the
    // device cannot vibrate (never re-opens after the user dismisses it).
    if (!hasVibration) {
      setShowSupportDialog(true);
    }
  }, [hasVibration]);

  const updateSetting = async <K extends keyof HapticSettings>(
    key: K,
    value: HapticSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await hapticService.updateSettings({ [key]: value });

    // Provide haptic feedback for setting changes (if enabled)
    if (key !== 'enabled' || value === true) {
      hapticService.trigger('light');
    }
  };

  const testHaptics = async () => {
    if (!hasVibration) return;
    setIsTesting(true);
    try {
      await hapticService.test();
      toast({
        title: t('hapticTestComplete'),
        description: t('hapticTestCompleteDesc'),
      });
    } catch (error) {
      toast({
        title: t('hapticTestFailed'),
        description: t('hapticTestFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Persistent inline banner while the device cannot vibrate */}
      {!hasVibration && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <VibrateOff className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {t('hapticNotSupportedTitle')}
            </p>
            <p className="text-xs text-muted-foreground">{t('hapticNotSupportedInline')}</p>
          </div>
        </div>
      )}

      {/* Main toggle — emphasized card */}
      <Card className={cn('p-4 transition-colors', settings.enabled && 'border-primary/20')}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                settings.enabled
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {settings.enabled ? <Vibrate className="h-5 w-5" /> : <VibrateOff className="h-5 w-5" />}
            </div>
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">{t('sectionHapticsTitle')}</Label>
              <p className="text-xs text-muted-foreground">{t('hapticFeedbackDesc')}</p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateSetting('enabled', enabled)}
          />
        </div>
      </Card>

      {settings.enabled && (
        <>
          {/* Intensity Setting */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HandHeart className="h-5 w-5" />
              </div>
              <Label className="text-sm font-semibold">{t('vibrationIntensity')}</Label>
            </div>
            <Select
              value={settings.intensity}
              onValueChange={(value: 'light' | 'medium' | 'heavy') => updateSetting('intensity', value)}
            >
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex flex-col">
                    <span className="font-medium">{t('intensityLight')}</span>
                    <span className="text-xs text-muted-foreground">{t('subtleVibration')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex flex-col">
                    <span className="font-medium">{t('intensityMedium')}</span>
                    <span className="text-xs text-muted-foreground">{t('balancedFeedback')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="heavy">
                  <div className="flex flex-col">
                    <span className="font-medium">{t('intensityHeavy')}</span>
                    <span className="text-xs text-muted-foreground">{t('strongVibration')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Feature Toggles */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('whenToVibrate')}
            </h3>
            <Card className="divide-y divide-border">
              {/* Prayer Notifications */}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      settings.prayerNotifications
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">{t('prayerTimes')}</Label>
                    <p className="text-xs text-muted-foreground">{t('adhanPrayerReminders')}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.prayerNotifications}
                  onCheckedChange={(enabled) => updateSetting('prayerNotifications', enabled)}
                />
              </div>

              {/* Bookmark Actions */}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      settings.bookmarkActions
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">{t('bookmarkActions')}</Label>
                    <p className="text-xs text-muted-foreground">{t('bookmarkActionsDesc')}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.bookmarkActions}
                  onCheckedChange={(enabled) => updateSetting('bookmarkActions', enabled)}
                />
              </div>

              {/* UI Interactions */}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      settings.uiInteractions
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <MousePointer className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">{t('uiInteractions')}</Label>
                    <p className="text-xs text-muted-foreground">{t('uiInteractionsDesc')}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.uiInteractions}
                  onCheckedChange={(enabled) => updateSetting('uiInteractions', enabled)}
                />
              </div>
            </Card>
          </div>

          {/* Test Button */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">{t('testHaptics')}</Label>
                <p className="text-xs text-muted-foreground">{t('testHapticsDesc')}</p>
              </div>
              <Button
                variant="outline"
                onClick={testHaptics}
                disabled={isTesting || !hasVibration}
                className="gap-2"
              >
                <Vibrate className="h-4 w-4" />
                {isTesting ? t('testingLabel') : t('testNow')}
              </Button>
            </div>
            {!hasVibration && (
              <p className="mt-3 text-xs text-muted-foreground">{t('hapticNotSupportedInline')}</p>
            )}
          </Card>
        </>
      )}

      {/* No-vibration explainer — auto-opens once per page visit */}
      <AlertDialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <VibrateOff className="h-5 w-5 text-amber-500" />
              {t('hapticNotSupportedTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('hapticNotSupportedDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="rounded-xl">
              {t('hapticNotSupportedOk')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default HapticSettings;
