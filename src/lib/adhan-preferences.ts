/**
 * Per-Prayer Adhan Preferences
 * Allows users to set a specific adhan sound for each prayer
 */

// Adhan preferences constants

// Add special Fajr adhan to options
export const FAJR_ADHAN_OPTION = {
    id: 'adhan-fajr',
    name: 'Fajr Special Adhan',
    url: '/audio/adhan-fajr.mp3'
};

export const ADHAN_OPTIONS = [
    { id: 'adhan-makkah', name: 'Makkah Adhan', url: '/audio/adhan-makkah.mp3' },
    { id: 'adhan-madinah', name: 'Madinah Adhan', url: '/audio/adhan-madinah.mp3' },
    { id: 'adhan-egyptian', name: 'Egyptian Adhan', url: '/audio/adhan-egyptian.mp3' },
    { id: 'adhan-classic', name: 'Classic Adhan', url: '/audio/adhan-classic.mp3' },
    { id: 'adhan-tvquran', name: 'TV Quran Adhan', url: '/audio/adhan-tvquran.mp3' },
    { id: 'adhan-lovable', name: 'Noor Connect Adhan', url: '/audio/adhan-lovable.mp3' },
];

// All available adhans including Fajr-specific
export const ALL_ADHAN_OPTIONS = [FAJR_ADHAN_OPTION, ...ADHAN_OPTIONS];

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface AdhanPreferences {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
}

const STORAGE_KEY = 'adhan-preferences';

// Default preferences - Fajr gets special adhan, others get Makkah
const DEFAULT_PREFERENCES: AdhanPreferences = {
    Fajr: 'adhan-fajr',
    Dhuhr: 'adhan-makkah',
    Asr: 'adhan-makkah',
    Maghrib: 'adhan-makkah',
    Isha: 'adhan-makkah',
};

/**
 * Get all adhan preferences
 */
export function getAdhanPreferences(): AdhanPreferences {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Failed to load adhan preferences:', error);
    }
    return DEFAULT_PREFERENCES;
}

/**
 * Get the adhan ID for a specific prayer
 */
export function getAdhanForPrayer(prayer: PrayerName): string {
    const prefs = getAdhanPreferences();
    return prefs[prayer] || DEFAULT_PREFERENCES[prayer];
}

/**
 * Get the adhan URL for a specific prayer
 */
export async function getAdhanUrlForPrayer(prayer: PrayerName): Promise<string> {
    const adhanId = getAdhanForPrayer(prayer);

    // Check if it's a custom adhan
    if (adhanId.startsWith('custom-')) {
        try {
            const { Capacitor } = await import('@capacitor/core');
            const { getCustomAdhanFilePath, getCustomAdhanUrl } = await import('@/components/CustomAdhanUpload');
            if (Capacitor.isNativePlatform()) {
                // Android MediaPlayer can't resolve blob: URLs — play from a real file
                const filePath = await getCustomAdhanFilePath(adhanId);
                if (filePath) return filePath;
            } else {
                const customUrl = await getCustomAdhanUrl(adhanId);
                if (customUrl) return customUrl;
            }
        } catch (err) {
            console.error('Failed to load custom adhan url:', err);
        }
    }

    const adhan = ALL_ADHAN_OPTIONS.find(a => a.id === adhanId);
    let url = adhan?.url || ALL_ADHAN_OPTIONS[1].url;

    // Critical Fix for Native Platforms (Android/APK)
    // Local assets like "/audio/xxx.mp3" need to be mapped to internal asset paths
    // so the native media player can find them.
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform() && url.startsWith('/')) {
        // On Android, assets in 'public' are served through the webview but 
        // native intent/players might need a full URL or 'public/' prefix
        // Capacitor.convertFileSrc helps, but for background we usually need 
        // the path relative to the assets folder or the full app URL.
        url = `public${url}`; // Map /audio/... to public/audio/... for the native plugin
    }

    return url;
}

/**
 * Set the adhan for a specific prayer
 */
export function setAdhanForPrayer(prayer: PrayerName, adhanId: string): void {
    try {
        const prefs = getAdhanPreferences();
        prefs[prayer] = adhanId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('adhan-preferences-changed', { detail: { prayer, adhanId } })
            );
        }
    } catch (error) {
        console.error('Failed to save adhan preference:', error);
    }
}

/**
 * Reset all preferences to defaults
 */
export function resetAdhanPreferences(): void {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('adhan-preferences-changed'));
    }
}
