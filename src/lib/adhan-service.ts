/**
 * Adhan (Islamic Call to Prayer) Service
 * Provides Adhan audio notifications for prayer times
 */

import i18n from './i18n-new';
import { getPrayerDisplayPair } from './prayer-display';

export interface AdhanConfig {
  enabled: boolean;
  volume: number;
  fajrEnabled: boolean;
  dhuhrEnabled: boolean;
  asrEnabled: boolean;
  maghribEnabled: boolean;
  ishaEnabled: boolean;
  jummahEnabled: boolean;
  selectedMuezzin: string;
  playNotificationSound: boolean;
  vibrationEnabled: boolean;
  overrideSilentMode: boolean;
  playAtMaxVolume: boolean;
}

export interface Muezzin {
  id: string;
  name: string;
  arabicName: string;
  url: string;
  duration: number;
}

export interface PrayerTime {
  name: string;
  time: string;
  adhanUrl?: string;
  hasPlayed: boolean;
}

export class AdhanService {
  private static instance: AdhanService;
  private audio: HTMLAudioElement | null = null;
  private notificationPermission: NotificationPermission = 'default';
  /**
   * Stable bound listener so we can removeEventListener in cleanup().
   * We cache it once so it has the same function identity on every call.
   */
  private _audioStateListeners: Set<(isPlaying: boolean) => void> | null = null;
  private _onAudioPlaying: (() => void) | null = null;
  private _onAudioPausedOrEnded: (() => void) | null = null;

  static getInstance(): AdhanService {
    if (!AdhanService.instance) {
      AdhanService.instance = new AdhanService();
    }
    return AdhanService.instance;
  }

  constructor() {
    // DO NOT eagerly initialize audio (new Audio()) here —
    // in a Capacitor/WebView APK this triggers AAudioStreamBuilder_openStream
    // on the main thread during module import (Settings mount), causing 100+ms jank.
    // Instead, create the Audio element lazily on the first playAdhan() call.
  }

  /**
   * Lazy audio initialization — only called the first time Adhan playback is requested.
   * Ensures AAudio native stream opening happens on a user gesture (after paint),
   * never during React's render/commit phase.
   *
   * Also attaches audio-element listeners once (not per play call) so downstream
   * subscribers can track playback state reactively, eliminating the need for
   * 500ms `setInterval` polling in AdhanControl.tsx.
   */
  private ensureAudio(): void {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.preload = 'none'; // 'auto' forces codec probe at import time

    // Guard against double-init: only wire the listeners the first time.
    if (this._onAudioPlaying !== null) return;

    this._onAudioPlaying = () => this._notifyStateChange(true);
    this._onAudioPausedOrEnded = () => this._notifyStateChange(false);

    this.audio.addEventListener('playing', this._onAudioPlaying);
    this.audio.addEventListener('pause', this._onAudioPausedOrEnded);
    this.audio.addEventListener('ended', this._onAudioPausedOrEnded);
  }

  /**
   * Subscribe to adhan playback state changes.
   * Returns an unsubscribe function.
   *
   * Designed so React components can do:
   *   useEffect(() => adhanService.onPlaybackChange(setIsPlaying), []);
   */
  onPlaybackChange(listener: (isPlaying: boolean) => void): () => void {
    if (!this._audioStateListeners) {
      this._audioStateListeners = new Set();
    }
    this._audioStateListeners.add(listener);
    // Immediately deliver current state so subscribers don't flash stale UI.
    listener(this.isPlaying());
    return () => {
      this._audioStateListeners?.delete(listener);
    };
  }

  private _notifyStateChange(isPlaying: boolean): void {
    if (!this._audioStateListeners) return;
    for (const listener of this._audioStateListeners) {
      try {
        listener(isPlaying);
      } catch {
        // Never let a subscriber crash the adhan service.
      }
    }
    // Also broadcast on the window so legacy listeners can hook in.
    try {
      window.dispatchEvent(new CustomEvent('adhan-playback-changed', { detail: { isPlaying } }));
    } catch {
      /* ignore */
    }
  }

  /**
   * Initialize audio element for Adhan playback
   * @deprecated Use ensureAudio() instead — kept for backward compatibility with
   * any external callers, but now a no-op since init must be lazy.
   */
  private initializeAudio(): void {
    // No-op; eager init is the cause of the AAudio mount-block issue.
    // See ensureAudio() which is called on-demand from playAdhan().
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Get available muezzins (reciters)
   */
  getAvailableMuezzins(): Muezzin[] {
    return [
      {
        id: 'mishari-rashid',
        name: 'Mishari Rashid Al-Afasy',
        arabicName: 'مشاري راشد العفاسي',
        url: 'https://download.quranicaudio.com/qdc/mishari_al_afasy/adhan/',
        duration: 180
      },
      {
        id: 'abdul-basit',
        name: 'Abdul Basit Abdus-Samad',
        arabicName: 'عبد الباسط عبد الصمد',
        url: 'https://download.quranicaudio.com/qdc/abdul_baset/adhan/',
        duration: 200
      },
      {
        id: 'maher-al-muaiqly',
        name: 'Maher Al-Muaiqly',
        arabicName: 'ماهر المعيقلي',
        url: 'https://download.quranicaudio.com/qdc/maher_al_muaiqly/adhan/',
        duration: 170
      },
      {
        id: 'saad-al-ghamdi',
        name: 'Saad Al-Ghamdi',
        arabicName: 'سعد الغامدي',
        url: 'https://download.quranicaudio.com/qdc/saad_ghamdi/adhan/',
        duration: 160
      },
      {
        id: 'yasser-al-dosari',
        name: 'Yasser Al-Dosari',
        arabicName: 'ياسر الدوسري',
        url: 'https://download.quranicaudio.com/qdc/yasser_al_dosari/adhan/',
        duration: 190
      }
    ];
  }

  /**
   * Get Adhan configuration from localStorage
   */
  getAdhanConfig(): AdhanConfig {
    try {
      const stored = localStorage.getItem('adhan-config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load Adhan config:', error);
    }

    // Default configuration
    return {
      enabled: false,
      volume: 80,
      fajrEnabled: true,
      dhuhrEnabled: true,
      asrEnabled: true,
      maghribEnabled: true,
      ishaEnabled: true,
      jummahEnabled: true,
      selectedMuezzin: 'mishari-rashid',
      playNotificationSound: true,
      vibrationEnabled: true,
      overrideSilentMode: false,
      playAtMaxVolume: false
    };
  }

  /**
   * Save Adhan configuration to localStorage
   */
  saveAdhanConfig(config: AdhanConfig): void {
    try {
      localStorage.setItem('adhan-config', JSON.stringify(config));
      console.log('Adhan configuration saved:', config);
    } catch (error) {
      console.error('Failed to save Adhan config:', error);
    }
  }

  /**
   * Toggle Adhan on/off
   */
  toggleAdhan(): AdhanConfig {
    const config = this.getAdhanConfig();
    config.enabled = !config.enabled;
    this.saveAdhanConfig(config);
    return config;
  }

  /**
   * Play Adhan for specific prayer
   */
  async playAdhan(prayerName: string, customUrl?: string): Promise<boolean> {
    this.ensureAudio();
    if (!this.audio) return false;

    const config = this.getAdhanConfig();
    if (!config.enabled) {
      console.log('Adhan is disabled');
      return false;
    }

    // Respect per-prayer toggles
    const prayerToggleMap: Record<string, keyof AdhanConfig> = {
      fajr: 'fajrEnabled',
      dhuhr: 'dhuhrEnabled',
      asr: 'asrEnabled',
      maghrib: 'maghribEnabled',
      isha: 'ishaEnabled',
      jummah: 'jummahEnabled'
    };
    const prayerKey = prayerToggleMap[prayerName?.toLowerCase?.() || ''];
    if (prayerKey && (config as any)[prayerKey] === false) {
      console.log(`Adhan for ${prayerName} is disabled`);
      return false;
    }

    try {
      // Get muezzin and construct URL
      const muezzins = this.getAvailableMuezzins();
      const selectedMuezzin = muezzins.find(m => m.id === config.selectedMuezzin);

      if (!selectedMuezzin) {
        console.error('Selected muezzin not found');
        return false;
      }

      const adhanUrl = customUrl || `${selectedMuezzin.url}${prayerName}.mp3`;

      // Set audio properties
      this.audio.src = adhanUrl;
      this.audio.volume = config.volume / 100;

      // Play the Adhan
      await this.audio.play();

      // Show notification
      if (config.playNotificationSound && this.notificationPermission === 'granted') {
        this.showAdhanNotification(prayerName, selectedMuezzin.name);
      }

      // Vibrate if enabled
      if (config.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      console.log(`Playing Adhan for ${prayerName} by ${selectedMuezzin.name}`);
      return true;
    } catch (error) {
      console.error('Failed to play Adhan:', error);
      return false;
    }
  }

  /**
   * Stop current Adhan playback
   */
  stopAdhan(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.audio.currentTime = 0;
      console.log('Adhan playback stopped');
    }
  }

  /**
   * Check if Adhan is currently playing
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  /**
   * Show notification for Adhan
   */
  private showAdhanNotification(prayerName: string, muezzinName: string): void {
    if ('Notification' in window && this.notificationPermission === 'granted') {
      // Localize the prayer name (keys are capitalized: "fajr" -> "Fajr").
      const display = getPrayerDisplayPair(
        prayerName.charAt(0).toUpperCase() + prayerName.slice(1).toLowerCase()
      ).localized;
      const notification = new Notification(i18n.t('adhanNotifTitle', { prayer: display }), {
        body: i18n.t('adhanNotifReciter', { reciter: muezzinName }),
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'adhan',
        requireInteraction: true,
        silent: false,
        data: { prayerName, action: 'adhan_playing' }
      });

      // Add click handler to stop adhan when notification is clicked
      notification.onclick = () => {
        this.stopAdhan();
        notification.close();
      };
    }
  }

  /**
   * Get display name for prayer
   */
  private getPrayerDisplayName(prayerName: string): string {
    const prayerNames: { [key: string]: string } = {
      'fajr': 'Fajr',
      'dhuhr': 'Dhuhr',
      'asr': 'Asr',
      'maghrib': 'Maghrib',
      'isha': 'Isha',
      'jummah': 'Jummah'
    };
    return prayerNames[prayerName] || prayerName;
  }

  /**
   * Test Adhan playback
   */
  async testAdhan(prayerName: string): Promise<boolean> {
    console.log(`Testing Adhan for ${prayerName}`);
    return await this.playAdhan(prayerName);
  }

  /**
   * Get next prayer time (mock implementation)
   * In real app, this would integrate with prayer times API
   */
  getNextPrayerTime(): PrayerTime | null {
    // This is a mock implementation
    // In a real app, you would integrate with a prayer times API
    const now = new Date();
    const hour = now.getHours();

    const prayerTimes = [
      { name: 'fajr', time: '05:30', hasPlayed: false },
      { name: 'dhuhr', time: '12:30', hasPlayed: false },
      { name: 'asr', time: '15:45', hasPlayed: false },
      { name: 'maghrib', time: '18:15', hasPlayed: false },
      { name: 'isha', time: '19:45', hasPlayed: false }
    ];

    // Find next prayer time
    for (const prayer of prayerTimes) {
      const [prayerHour, prayerMinute] = prayer.time.split(':').map(Number);
      const prayerMinutes = prayerHour * 60 + prayerMinute;
      const nowMinutes = hour * 60 + now.getMinutes();
      if (prayerMinutes > nowMinutes || (prayerMinutes === nowMinutes && !prayer.hasPlayed)) {
        return prayer;
      }
    }

    return null;
  }

  /**
   * Schedule Adhan for prayer times
   */
  scheduleAdhan(): void {
    // This would integrate with a prayer times calculation service
    // For now, it's a placeholder for future implementation
    console.log('Adhan scheduling - implement prayer times integration');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.audio) {
      if (this._onAudioPlaying) {
        this.audio.removeEventListener('playing', this._onAudioPlaying);
        this._onAudioPlaying = null;
      }
      if (this._onAudioPausedOrEnded) {
        this.audio.removeEventListener('pause', this._onAudioPausedOrEnded);
        this.audio.removeEventListener('ended', this._onAudioPausedOrEnded);
        this._onAudioPausedOrEnded = null;
      }
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }
}

// Export singleton instance
export const adhanService = AdhanService.getInstance();
