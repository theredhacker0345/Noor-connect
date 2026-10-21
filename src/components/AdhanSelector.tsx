import { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  getAdhanPreferences,
  setAdhanForPrayer,
  ALL_ADHAN_OPTIONS,
  ADHAN_OPTIONS,
  type PrayerName,
  type AdhanPreferences
} from '@/lib/adhan-preferences';
import { adhanService, type AdhanConfig } from '@/lib/adhan-service';
import { useI18n } from '@/hooks/useI18n';

const ADHAN_STORAGE_KEY = 'selected-adhan-id';

export const getSelectedAdhanUrl = (): string => {
  const savedId = localStorage.getItem(ADHAN_STORAGE_KEY);
  const adhan = ADHAN_OPTIONS.find(a => a.id === savedId);
  return adhan?.url || ADHAN_OPTIONS[0].url;
};

// Global audio instance to prevent multiple audio playing
let globalPreviewAudio: HTMLAudioElement | null = null;

export const stopAllAdhanPreviews = () => {
  if (globalPreviewAudio) {
    globalPreviewAudio.pause();
    globalPreviewAudio.currentTime = 0;
    globalPreviewAudio = null;
  }
};

const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const AdhanSelector = () => {
  const { t } = useI18n();
  const [preferences, setPreferences] = useState<AdhanPreferences>(getAdhanPreferences);
  const [adhanConfig, setAdhanConfig] = useState<AdhanConfig>(adhanService.getAdhanConfig());
  const [isExpanded, setIsExpanded] = useState(false);
  const [playingPrayer, setPlayingPrayer] = useState<PrayerName | null>(null);
  const [customAdhans, setCustomAdhans] = useState<{ id: string, name: string }[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load custom adhan metadata from IndexedDB/localforage.
    // Defer 600ms so Profile.tsx's initial paint + framer-motion page
    // transition completes before we spin up IndexedDB connections,
    // which otherwise cause a synchronous IDBFactory.open() call on
    // the main thread inside React's commit phase.
    let deferTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      void (async () => {
        try {
          const localforage = (await import('localforage')).default;
          const adhanStore = localforage.createInstance({
            name: 'islamic-companion',
            storeName: 'custom-adhans',
            description: 'User uploaded adhan audio files'
          });
          const saved = await adhanStore.getItem<any[]>('custom-adhan-audio');
          if (saved) {
            setCustomAdhans(saved.map(a => ({ id: a.id, name: `${t('customLabel', { name: a.name })}` })));
          }
        } catch (error) {
          console.error("Error loading custom adhan metadata:", error);
        }
      })();
      deferTimer = null;
    }, 600);

    // Sync preferences when storage changes or external events fire
    const handleSync = () => {
      setPreferences(getAdhanPreferences());
      setAdhanConfig(adhanService.getAdhanConfig());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('adhan-config-changed' as any, handleSync);

    return () => {
      if (deferTimer !== null) clearTimeout(deferTimer);
      stopAllAdhanPreviews();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPlayingPrayer(null);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('adhan-config-changed' as any, handleSync);
    };
  }, []);

  const handleAdhanChange = (prayer: PrayerName, adhanId: string) => {
    setAdhanForPrayer(prayer, adhanId);
    setPreferences(prev => ({ ...prev, [prayer]: adhanId }));

    // Stop any playing preview
    stopAllAdhanPreviews();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPlayingPrayer(null);

    // Trigger notification reschedule
    window.dispatchEvent(new Event('prayer-method-changed'));
  };

  const handlePreview = async (prayer: PrayerName) => {
    const adhanId = preferences[prayer];

    // If already playing this prayer's adhan, stop it
    if (playingPrayer === prayer) {
      stopAllAdhanPreviews();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPlayingPrayer(null);
      return;
    }

    // Stop any existing audio first
    stopAllAdhanPreviews();

    const startPlayingUrl = (url: string) => {
      globalPreviewAudio = new Audio(url);
      globalPreviewAudio.volume = 0.5;

      const handleEnded = () => {
        setPlayingPrayer(null);
        globalPreviewAudio = null;
      };

      const handleError = () => {
        setPlayingPrayer(null);
        globalPreviewAudio = null;
      };

      globalPreviewAudio.addEventListener('ended', handleEnded);
      globalPreviewAudio.addEventListener('error', handleError);

      globalPreviewAudio.play().then(() => {
        setPlayingPrayer(prayer);
      }).catch((e) => {
        console.error("Audio playback failed:", e);
        setPlayingPrayer(null);
        globalPreviewAudio = null;
      });
    };

    if (adhanId.startsWith('custom-')) {
      try {
        const { getCustomAdhanUrl } = await import('./CustomAdhanUpload');
        const url = await getCustomAdhanUrl(adhanId);
        if (url) {
          startPlayingUrl(url);
        }
      } catch (err) {
        console.error("Failed to load custom adhan", err);
      }
    } else {
      const adhan = ALL_ADHAN_OPTIONS.find(a => a.id === adhanId);
      if (adhan && adhan.url) {
        startPlayingUrl(adhan.url);
      }
    }
  };

  const combinedOptions = [...ALL_ADHAN_OPTIONS, ...customAdhans];
  const prayerToggleMap: Record<PrayerName, keyof AdhanConfig> = {
    Fajr: 'fajrEnabled',
    Dhuhr: 'dhuhrEnabled',
    Asr: 'asrEnabled',
    Maghrib: 'maghribEnabled',
    Isha: 'ishaEnabled'
  };

  const handleTogglePrayer = (prayer: PrayerName, enabled: boolean) => {
    const key = prayerToggleMap[prayer];
    if (!key) return;
    const updated = { ...adhanConfig, [key]: enabled };
    adhanService.saveAdhanConfig(updated);
    setAdhanConfig(updated);

    // Notify other components (GlobalAlarm, Profile, etc.)
    window.dispatchEvent(new CustomEvent('adhan-config-changed', { detail: updated }));
    
    // Also trigger notification reschedule for background alarms
    window.dispatchEvent(new Event('prayer-method-changed'));
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">{t('adhanSounds')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('customizeAdhanPerPrayer')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div >

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {PRAYERS.map((prayer) => (
            <div key={prayer} className="flex items-center gap-2">
              <span className="w-20 text-sm font-medium text-foreground">
                {t(prayer.toLowerCase())}
              </span>
              <Switch
                checked={Boolean(adhanConfig[prayerToggleMap[prayer]])}
                onCheckedChange={(checked) => handleTogglePrayer(prayer, checked)}
                className="shrink-0"
              />
              <Select
                value={preferences[prayer]}
                onValueChange={(value) => handleAdhanChange(prayer, value)}
              >
                <SelectTrigger className="flex-1 bg-background h-9">
                  <SelectValue placeholder={t('selectAdhan')} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {combinedOptions.map((adhan) => (
                    <SelectItem key={adhan.id} value={adhan.id}>
                      {adhan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePreview(prayer)}
                className="shrink-0 h-9 w-9"
              >
                {playingPrayer === prayer ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}

          <p className="text-xs text-primary/70 mt-3 pt-2 border-t border-border/50">
            {t('fajrDefaultNote')}
          </p>
        </div>
      )}
    </Card >
  );
};
