/**
 * Haptic Feedback Service
 * Manages vibration and haptic feedback for the app
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export type HapticPattern = 
  | 'light'     // Subtle tap
  | 'medium'    // Noticeable tap  
  | 'heavy'     // Strong tap
  | 'success'   // Success feedback
  | 'warning'   // Warning feedback
  | 'error'     // Error feedback
  | 'prayer'    // Prayer time notification
  | 'adhan'     // Adhan call vibration
  | 'bookmark'   // Bookmark saved
  | 'complete'   // Task completed;

export interface HapticSettings {
  enabled: boolean;
  prayerNotifications: boolean;
  bookmarkActions: boolean;
  uiInteractions: boolean;
  intensity: 'light' | 'medium' | 'heavy';
}

const DEFAULT_SETTINGS: HapticSettings = {
  enabled: true,
  prayerNotifications: true,
  bookmarkActions: true,
  // Must default to true so the master "Haptic feedback" toggle governs
  // everything out of the box: when it is ON, UI taps (button.tsx) vibrate
  // unless the user explicitly opts out via this granular toggle below.
  uiInteractions: true,
  intensity: 'medium'
};

const STORAGE_KEY = 'haptic-settings';

/**
 * Load haptic settings from Capacitor Preferences
 */
const loadSettingsFromPreferences = async (): Promise<HapticSettings> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.warn('Failed to load haptic settings from Preferences:', error);
    // Fallback to localStorage for migration
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        // Migrate to Preferences
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(settings) });
        localStorage.removeItem(STORAGE_KEY);
        return settings;
      }
    } catch (fallbackError) {
      console.warn('Failed to load from localStorage fallback:', fallbackError);
    }
  }
  return DEFAULT_SETTINGS;
};

/**
 * Save haptic settings to Capacitor Preferences
 */
const saveSettingsToPreferences = async (settings: HapticSettings): Promise<void> => {
  try {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(settings) });
  } catch (error) {
    console.warn('Failed to save haptic settings to Preferences:', error);
    // Fallback to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};

/**
 * Best-effort synchronous read of haptic settings from localStorage.
 * localStorage.getItem is ~0.03ms on modern Android WebView (well under a
 * frame budget of 16ms), so it's safe to call from the constructor and
 * avoids a one-frame flicker in the Profile UI where `getSettings()`
 * returns DEFAULT_SETTINGS (intensity: medium) then snaps to the user's
 * saved preference (e.g. light) once the async Capacitor bridge returns.
 *
 * Returns DEFAULT_SETTINGS if no value is stored or anything throws.
 */
const syncReadSettingsFromLocalStorage = (): HapticSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Storage disabled, corrupt payload, or cross-origin restriction.
    // Gracefully degrade to defaults.
  }
  return DEFAULT_SETTINGS;
};

class HapticService {
  private settings: HapticSettings = DEFAULT_SETTINGS;
  private initialized: boolean = false;

  constructor() {
    // DO NOT eagerly call Preferences.get() here — that crosses the
    // JS↔Java native bridge synchronously on Android and blocks UI.
    //
    // Instead, seed `this.settings` from localStorage (cheap sync read,
    // ~0.03ms) so getSettings() returns the user's saved value on the
    // very first Profile render, avoiding the flash-of-default-state.
    // The Preferences-backed load still happens lazily in initialize()
    // and will overwrite with any fresher value from the Capacitor store
    // (which is the source of truth after migration).
    this.settings = syncReadSettingsFromLocalStorage();
  }

  /**
   * Initialize haptic service by loading settings
   */
  private async initialize(): Promise<void> {
    this.settings = await loadSettingsFromPreferences();
    this.initialized = true;
  }

  /**
   * Get current haptic settings
   */
  getSettings(): HapticSettings {
    return { ...this.settings };
  }

  /**
   * Get current haptic settings after ensuring they were loaded from
   * Preferences (the source of truth). The synchronous getSettings() can
   * still hold the constructor's localStorage seed until initialize()
   * completes, so use this where accuracy matters (e.g. Profile status).
   */
  async getSettingsAsync(): Promise<HapticSettings> {
    if (!this.initialized) await this.initialize();
    return { ...this.settings };
  }

  /**
   * Update haptic settings
   */
  async updateSettings(newSettings: Partial<HapticSettings>): Promise<void> {
    if (!this.initialized) await this.initialize();
    this.settings = { ...this.settings, ...newSettings };
    await saveSettingsToPreferences(this.settings);
  }

  /**
   * Check if haptics are enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Check if specific haptic type is enabled
   */
  isTypeEnabled(type: 'prayer' | 'bookmark' | 'ui'): boolean {
    if (!this.settings.enabled) return false;
    
    switch (type) {
      case 'prayer':
        return this.settings.prayerNotifications;
      case 'bookmark':
        return this.settings.bookmarkActions;
      case 'ui':
        return this.settings.uiInteractions;
      default:
        return false;
    }
  }

  /**
   * Check whether the current device can actually vibrate.
   *
   * Presence alone is NOT enough: desktop Chrome/Chromium (and several
   * Android WebViews on motor-less devices like tablets/TV boxes/emulators)
   * still EXPOSE `navigator.vibrate` — verified live: `'vibrate' in navigator`
   * is true in desktop Chromium where vibration silently no-ops.
   *
   * The honest runtime probe is the W3C Vibration API contract: vibrate()
   * returns false when no vibrator hardware is available. We call
   * `navigator.vibrate(0)` — per spec a 0ms pattern is a vibration CANCEL
   * (harmless, side-effect-free, no user-gesture requirement) — and require
   * it to return true. Devices WITH a motor return true; motor-less devices
   * and desktops return false.
   */
  hasVibrationSupport(): boolean {
    if (typeof navigator === 'undefined') return false;
    if (typeof navigator.vibrate !== 'function') return false;
    try {
      return navigator.vibrate(0) === true;
    } catch {
      return false;
    }
  }

  /**
   * Trigger haptic feedback
   */
  async trigger(pattern: HapticPattern): Promise<void> {
    // Wait for initialization if not ready
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if haptics are globally enabled
    if (!this.settings.enabled) return;

    // Check if specific type is enabled
    const type = this.getPatternType(pattern);
    if (!this.isTypeEnabled(type)) return;

    try {
      // Map pattern to haptic intensity
      const intensity = this.getIntensityForPattern(pattern);
      
      switch (pattern) {
        case 'light':
        case 'medium':
        case 'heavy':
          await Haptics.impact({ style: this.getImpactStyle(intensity) });
          break;
          
        case 'success':
        case 'complete':
          await Haptics.notification({ type: NotificationType.Success });
          break;
          
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
          
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
          
        case 'prayer':
          // Distinguishable prayer-time vibration pattern
          await this.prayerVibration();
          break;

        case 'adhan':
          // Heavier, longer adhan vibration pattern
          await this.adhanVibration();
          break;
          
        case 'bookmark':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
          
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Prayer-time vibration pattern: two medium taps then a short hum.
   * Fixed Medium style (not the intensity setting) so the pattern stays
   * perceptible and clearly distinct from light UI taps. The final
   * Haptics.vibrate() gives a full-amplitude buzz on Android, where
   * impact-style waveforms alone can be too brief to notice.
   */
  private async prayerVibration(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      await this.delay(300);
      await Haptics.impact({ style: ImpactStyle.Medium });
      await this.delay(300);
      await Haptics.vibrate({ duration: 500 });
    } catch (error) {
      console.warn('Prayer vibration failed:', error);
    }
  }

  /**
   * Adhan vibration pattern: heavy-medium-heavy taps then a long hum.
   * Deliberately heavier and longer than the prayer pattern so the call
   * to prayer is unmistakable even on devices with weak haptics.
   */
  private async adhanVibration(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await this.delay(350);
      await Haptics.impact({ style: ImpactStyle.Medium });
      await this.delay(350);
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await this.delay(300);
      await Haptics.vibrate({ duration: 800 });
    } catch (error) {
      console.warn('Adhan vibration failed:', error);
    }
  }

  /**
   * Get the category of a haptic pattern
   */
  private getPatternType(pattern: HapticPattern): 'prayer' | 'bookmark' | 'ui' {
    if (pattern === 'prayer' || pattern === 'adhan') return 'prayer';
    if (pattern === 'bookmark') return 'bookmark';
    return 'ui';
  }

  /**
   * Get impact style based on settings intensity
   */
  private getImpactStyle(patternIntensity: string): ImpactStyle {
    const intensity = this.settings.intensity;
    
    // Override intensity if pattern specifies it
    if (patternIntensity === 'light') return ImpactStyle.Light;
    if (patternIntensity === 'heavy') return ImpactStyle.Heavy;
    
    switch (intensity) {
      case 'light':
        return ImpactStyle.Light;
      case 'heavy':
        return ImpactStyle.Heavy;
      default:
        return ImpactStyle.Medium;
    }
  }

  /**
   * Get intensity for specific pattern
   */
  private getIntensityForPattern(pattern: HapticPattern): string {
    switch (pattern) {
      case 'light': return 'light';
      case 'heavy': return 'heavy';
      default: return this.settings.intensity;
    }
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test haptic feedback
   */
  async test(): Promise<void> {
    if (!this.settings.enabled) {
      console.log('Haptics are disabled');
      return;
    }

    console.log('Testing haptic feedback...');
    
    // Test different patterns
    await this.trigger('light');
    await this.delay(500);
    
    await this.trigger('medium');
    await this.delay(500);
    
    await this.trigger('success');
    await this.delay(500);
    
    await this.trigger('prayer');
  }
}

// Export singleton instance
export const hapticService = new HapticService();
export default hapticService;
