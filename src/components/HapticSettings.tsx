/**
 * Haptic Settings Component
 * Allows users to configure haptic feedback preferences
 */

import { useState, useEffect } from 'react';
import { Vibrate, VibrateOff, HandHeart, Bell, Bookmark, MousePointer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';
import hapticService, { type HapticSettings } from '@/lib/haptic-service';

export function HapticSettings() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [settings, setSettings] = useState<HapticSettings>(hapticService.getSettings());
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load current settings
    setSettings(hapticService.getSettings());
  }, []);

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
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${settings.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
            {settings.enabled ? <Vibrate className="w-5 h-5" /> : <VibrateOff className="w-5 h-5" />}
          </div>
          <div>
            <Label className="text-sm font-bold">{t('sectionHapticsTitle')}</Label>
            <p className="text-xs text-muted-foreground">{t('hapticFeedbackDesc')}</p>
          </div>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) => updateSetting('enabled', enabled)}
        />
      </div>

      {settings.enabled && (
        <>
          {/* Intensity Setting */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <HandHeart className="w-4 h-4" />
                {t('vibrationIntensity')}
              </Label>
              <Select 
                value={settings.intensity} 
                onValueChange={(value: 'light' | 'medium' | 'heavy') => updateSetting('intensity', value)}
              >
                <SelectTrigger className="w-full">
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
            </div>
          </Card>

          {/* Feature Toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('whenToVibrate')}</h3>
            
            {/* Prayer Notifications */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.prayerNotifications ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('prayerTimes')}</Label>
                  <p className="text-xs text-muted-foreground">{t('adhanPrayerReminders')}</p>
                </div>
              </div>
              <Switch
                checked={settings.prayerNotifications}
                onCheckedChange={(enabled) => updateSetting('prayerNotifications', enabled)}
              />
            </div>

            {/* Bookmark Actions */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.bookmarkActions ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('bookmarkActions')}</Label>
                  <p className="text-xs text-muted-foreground">{t('bookmarkActionsDesc')}</p>
                </div>
              </div>
              <Switch
                checked={settings.bookmarkActions}
                onCheckedChange={(enabled) => updateSetting('bookmarkActions', enabled)}
              />
            </div>

            {/* UI Interactions */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.uiInteractions ? 'bg-purple-500/10 text-purple-500' : 'bg-muted text-muted-foreground'}`}>
                  <MousePointer className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('uiInteractions')}</Label>
                  <p className="text-xs text-muted-foreground">{t('uiInteractionsDesc')}</p>
                </div>
              </div>
              <Switch
                checked={settings.uiInteractions}
                onCheckedChange={(enabled) => updateSetting('uiInteractions', enabled)}
              />
            </div>
          </div>

          {/* Test Button */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold">{t('testHaptics')}</Label>
                <p className="text-xs text-muted-foreground">{t('testHapticsDesc')}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={testHaptics}
                disabled={isTesting}
                className="gap-2"
              >
                <Vibrate className="w-4 h-4" />
                {isTesting ? t('testingLabel') : t('testNow')}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default HapticSettings;
