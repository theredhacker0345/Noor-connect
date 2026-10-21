import { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Trash2, Check, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import { getAdhanPreferences, setAdhanForPrayer, type PrayerName, type AdhanPreferences } from "@/lib/adhan-preferences";

const CUSTOM_ADHAN_KEY = 'custom-adhan-audio';
const SELECTED_ADHAN_KEY = 'selected-adhan';

interface CustomAdhan {
  id: string;
  name: string;
  data: string; // base64
  addedAt: number;
}

// ─── Lazy localforage store (typed contract) ──────────────────────────
// We only use 2 methods on the localforage instance — getItem / setItem.
// Declaring this typed interface (instead of `any`) gives us full TS safety
// without needing to install/bundle the entire localforage type declarations
// at edit time.  The actual module is still dynamically imported so the
// IndexedDB connection opens lazily (never on Settings mount).
interface LocalforageAdhanStore {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
}
let _adhanStore: LocalforageAdhanStore | null = null;
async function getAdhanStore(): Promise<LocalforageAdhanStore> {
  if (_adhanStore) return _adhanStore;
  const localforageModule = await import('localforage');
  const localforageInstance = (
    (localforageModule as { default?: LocalforageAdhanStore & { createInstance: (opts: any) => LocalforageAdhanStore } }).default ??
    (localforageModule as unknown as LocalforageAdhanStore & { createInstance: (opts: any) => LocalforageAdhanStore })
  );
  _adhanStore = localforageInstance.createInstance({
    name: 'islamic-companion',
    storeName: 'custom-adhans',
    description: 'User uploaded adhan audio files'
  });
  return _adhanStore;
}

// Export helper function to get custom adhan audio
export const getCustomAdhanUrl = async (id: string): Promise<string | null> => {
  try {
    const adhanStore = await getAdhanStore();
    const adhans = await adhanStore.getItem<CustomAdhan[]>(CUSTOM_ADHAN_KEY);
    const adhan = adhans?.find((a) => a.id === id);
    if (!adhan) return null;

    const binaryString = atob(adhan.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('getCustomAdhanUrl error:', error);
    return null;
  }
};

const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function CustomAdhanUpload() {
  const { t } = useI18n();
  const [customAdhans, setCustomAdhans] = useState<CustomAdhan[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AdhanPreferences>(getAdhanPreferences());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Defer IndexedDB loads + setups: 800ms after mount lets the page paint and
    // transition animation completes before we open an IndexedDB connection.
    let t: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      loadCustomAdhans();
      t = null;
    }, 800);

    // Listen for storage changes to keep preferences in sync
    const handleStorageChange = () => {
      setPreferences(getAdhanPreferences());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      if (t !== null) clearTimeout(t);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadCustomAdhans = async () => {
    try {
      const adhanStore = await getAdhanStore();
      const saved = await adhanStore.getItem<CustomAdhan[]>(CUSTOM_ADHAN_KEY);
      if (saved) setCustomAdhans(saved);
    } catch (error) {
      console.error("Error loading custom adhans:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: t('invalidFile'), description: t('invalidFileDesc'), variant: "destructive" });
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t('fileTooLarge'), description: t('fileTooLargeDesc'), variant: "destructive" });
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const newAdhan: CustomAdhan = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        data: base64,
        addedAt: Date.now()
      };

      const updated = [...customAdhans, newAdhan];
      const adhanStore = await getAdhanStore();
      await adhanStore.setItem(CUSTOM_ADHAN_KEY, updated);
      setCustomAdhans(updated);

      toast({ title: t('adhanUploaded'), description: t('adhanUploadedDesc', { name: newAdhan.name }) });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: t('uploadFailed'), description: t('uploadFailedDesc'), variant: "destructive" });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlay = async (adhan: CustomAdhan) => {
    if (playingId === adhan.id) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const url = await getCustomAdhanUrl(adhan.id);
      if (!url) return;

      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(adhan.id);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (audioRef.current && playingId === adhan.id) {
          audioRef.current.pause();
          setPlayingId(null);
        }
      }, 15000);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = customAdhans.filter(a => a.id !== id);
    const adhanStore = await getAdhanStore();
    await adhanStore.setItem(CUSTOM_ADHAN_KEY, updated);
    setCustomAdhans(updated);

    // Clear any prayer assignments for this adhan
    let changed = false;
    const newPrefs = { ...preferences };
    PRAYERS.forEach(p => {
      if (newPrefs[p] === id) {
        newPrefs[p] = 'adhan-makkah'; // Reset to default
        setAdhanForPrayer(p, 'adhan-makkah');
        changed = true;
      }
    });

    if (changed) {
      setPreferences(newPrefs);
    }

    toast({ title: t('adhanDeleted') });
  };

  const handleAssignToPrayer = (adhanId: string, prayer: PrayerName) => {
    setAdhanForPrayer(prayer, adhanId);
    setPreferences(prev => ({ ...prev, [prayer]: adhanId }));

    toast({
      title: t('adhanAssigned'),
      description: t('assignedToPrayer', { prayer: t(prayer.toLowerCase()) })
    });

    // Trigger notification reschedule
    window.dispatchEvent(new Event('prayer-method-changed'));
  };

  const isAssignedTo = (adhanId: string, prayer: PrayerName) => {
    return preferences[prayer] === adhanId;
  };

  const getAssignedPrayers = (adhanId: string) => {
    return PRAYERS.filter(p => preferences[p] === adhanId);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h3 className="font-medium">{t('customAdhanLibrary')}</h3>
        </div>
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('uploadMp3')}
        </Button>
      </div>

      {customAdhans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('noCustomAdhans')}
        </p>
      ) : (
        <div className="space-y-4">
          {customAdhans.map((adhan) => (
            <div
              key={adhan.id}
              className="p-3 rounded-lg border border-border bg-card/50 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handlePlay(adhan)}
                >
                  {playingId === adhan.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{adhan.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getAssignedPrayers(adhan.id).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded uppercase">
                        {t(p.toLowerCase())}
                      </span>
                    ))}
                    {getAssignedPrayers(adhan.id).length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        {t('notAssignedToPrayer')}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive opacity-50 hover:opacity-100"
                  onClick={() => handleDelete(adhan.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="pt-2 border-t border-border/50">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">{t('assignToPrayer')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRAYERS.map(prayer => (
                    <Button
                      key={prayer}
                      variant={isAssignedTo(adhan.id, prayer) ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => handleAssignToPrayer(adhan.id, prayer)}
                    >
                      {t(prayer.toLowerCase())}
                      {isAssignedTo(adhan.id, prayer) && <Check className="w-3 h-3 ml-1" />}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t('customAdhanFooter')}
      </p>
    </Card>
  );
}

// Export helper function for legacy support
export async function getSelectedCustomAdhanUrl(): Promise<string | null> {
  const selectedId = localStorage.getItem('selected-adhan');
  if (!selectedId || !selectedId.startsWith('custom-')) return null;
  return getCustomAdhanUrl(selectedId);
}
