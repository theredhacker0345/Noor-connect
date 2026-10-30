/**
 * Prayer Calculation Methods Service
 * Handles method selection, persistence, and angle calculations
 */

import { Coordinates, CalculationMethod, PrayerTimes, CalculationParameters, Madhab, Shafaq } from 'adhan';
import { getMadhab } from './storage';
import { calculatePrayerTimes } from './prayer-calculator';
import { LOCATION_STORAGE_KEY } from './location-config';

export type CalculationMethodName = 
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran';

export interface PrayerMethod {
  id: number;
  name: string;
  description: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval?: number; // Minutes after maghrib for some methods
  maghribAngle?: number; // Usually 0 for most methods
  calculationMethod: CalculationMethodName;
}

export const PRAYER_METHODS: PrayerMethod[] = [
  {
    id: 1,
    name: "Muslim World League",
    description: "Based on Muslim World League (MWL) standards",
    fajrAngle: 18,
    ishaAngle: 17,
    maghribAngle: 0,
    calculationMethod: 'MuslimWorldLeague'
  },
  {
    id: 2,
    name: "Islamic Society of North America",
    description: "ISNA method commonly used in North America",
    fajrAngle: 15,
    ishaAngle: 15,
    maghribAngle: 0,
    calculationMethod: 'NorthAmerica'
  },
  {
    id: 3,
    name: "Egyptian General Authority",
    description: "Egyptian General Authority of Survey standards",
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    maghribAngle: 0,
    calculationMethod: 'Egyptian'
  },
  {
    id: 4,
    name: "Umm Al-Qura University",
    description: "Used in Saudi Arabia, based on Umm Al-Qura",
    fajrAngle: 18.5,
    ishaAngle: 0, // Not used, interval is used instead
    ishaInterval: 90, // 90 minutes after maghrib
    maghribAngle: 0,
    calculationMethod: 'UmmAlQura'
  },
  {
    id: 5,
    name: "University of Islamic Sciences",
    description: "University of Islamic Sciences, Karachi method",
    fajrAngle: 18,
    ishaAngle: 18,
    maghribAngle: 0,
    calculationMethod: 'Karachi'
  },
  {
    id: 7,
    name: "Institute of Geophysics",
    description: "University of Tehran, Institute of Geophysics",
    fajrAngle: 17.7,
    ishaAngle: 14,
    maghribAngle: 0,
    calculationMethod: 'Tehran'
  },
  {
    id: 8,
    name: "Gulf Region",
    description: "Modified version for Gulf region countries",
    fajrAngle: 19.5,
    ishaAngle: 0, // Not used, interval is used instead
    ishaInterval: 90, // 90 minutes after maghrib in Ramadan, 60 otherwise
    maghribAngle: 0,
    calculationMethod: 'MuslimWorldLeague' // Using MWL as base, custom angles applied
  },
  {
    id: 9,
    name: "Kuwait",
    description: "Kuwait Ministry of Awqaf method",
    fajrAngle: 18,
    ishaAngle: 17.5,
    maghribAngle: 0,
    calculationMethod: 'Kuwait'
  },
  {
    id: 10,
    name: "Qatar",
    description: "Qatar Ministry of Awqaf method",
    fajrAngle: 18,
    ishaAngle: 0, // Not used, interval is used instead
    ishaInterval: 90, // 90 minutes after maghrib
    maghribAngle: 0,
    calculationMethod: 'Qatar'
  },
  {
    id: 11,
    name: "Singapore",
    description: "MUIS Singapore method",
    fajrAngle: 20,
    ishaAngle: 18,
    maghribAngle: 0,
    calculationMethod: 'Singapore'
  },
  {
    id: 12,
    name: "Turkey",
    description: "Diyanet Turkey method",
    fajrAngle: 18,
    ishaAngle: 17,
    maghribAngle: 0,
    calculationMethod: 'Turkey'
  },
  {
    id: 13,
    name: "Tehran",
    description: "Institute of Geophysics, University of Tehran",
    fajrAngle: 17.7,
    ishaAngle: 14,
    maghribAngle: 0,
    calculationMethod: 'Tehran'
  },
  {
    id: 14,
    name: "Morocco",
    description: "Morocco Ministry of Habous method",
    fajrAngle: 19,
    ishaAngle: 17,
    maghribAngle: 0,
    calculationMethod: 'MuslimWorldLeague' // Using MWL as base, custom angles applied
  }
];

export const DEFAULT_METHOD = PRAYER_METHODS[0]; // Muslim World League

class PrayerMethodsService {
  private readonly STORAGE_KEY = 'prayer_calculation_method';

  /**
   * Get the currently selected prayer method
   */
  getSelectedMethod(): PrayerMethod {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const methodId = parseInt(stored, 10);
        const method = PRAYER_METHODS.find(m => m.id === methodId);
        if (method) {
          return method;
        }
      }
    } catch (error) {
      console.error('Failed to load prayer method from storage:', error);
    }

    // No explicit choice yet — recommend the method used by the user's region
    // (e.g. Egyptian General Authority for Egypt) so times match local mosques.
    try {
      const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (storedLocation) {
        const parsed = JSON.parse(storedLocation) as { latitude?: number; longitude?: number };
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return this.getRecommendedMethod(parsed.latitude, parsed.longitude);
        }
      }
    } catch {
      // ignore — fall through to default
    }

    return DEFAULT_METHOD;
  }

  /**
   * Save the selected prayer method to localStorage
   */
  saveSelectedMethod(method: PrayerMethod): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, method.id.toString());
      // Keep the legacy name-based key in sync so every reader
      // (prayer-calculator, hooks, notifications) sees the same choice.
      localStorage.setItem('calculation-method', method.calculationMethod);
      console.log(`Prayer method saved: ${method.name} (${method.id})`);
    } catch (error) {
      console.error('Failed to save prayer method to storage:', error);
    }
  }

  /**
   * Get method by ID
   */
  getMethodById(id: number): PrayerMethod | undefined {
    return PRAYER_METHODS.find(method => method.id === id);
  }

  /**
   * Get all available methods
   */
  getAllMethods(): PrayerMethod[] {
    return PRAYER_METHODS;
  }

  /**
   * Calculate prayer times using the selected method
   */
  async calculatePrayerTimesWithMethod(
    latitude: number,
    longitude: number,
    date: Date,
    method?: PrayerMethod
  ): Promise<any> {
    const selectedMethod = method || this.getSelectedMethod();

    // Calculate with the method's declared angles (Gulf/Morocco sit on an MWL base)
    const times = calculatePrayerTimes(latitude, longitude, date, selectedMethod.calculationMethod, {
      fajrAngle: selectedMethod.fajrAngle,
      ishaAngle: selectedMethod.ishaAngle,
      ishaInterval: selectedMethod.ishaInterval,
    });

    return times;
  }

  /**
   * Get method-specific display information
   */
  getMethodDisplayInfo(method: PrayerMethod): {
    fajrDisplay: string;
    ishaDisplay: string;
  } {
    const fajrDisplay = `${method.fajrAngle}°`;
    let ishaDisplay: string;

    if (method.ishaInterval) {
      ishaDisplay = `${method.ishaInterval} min after Maghrib`;
    } else {
      ishaDisplay = `${method.ishaAngle}°`;
    }

    return { fajrDisplay, ishaDisplay };
  }

  /**
   * Check if method uses interval instead of angle for Isha
   */
  usesIshaInterval(method: PrayerMethod): boolean {
    return !!method.ishaInterval;
  }

  /**
   * Get recommended method for a region
   */
  getRecommendedMethod(latitude: number, longitude: number): PrayerMethod {
    // Simple region-based recommendations
    if (latitude >= 24 && latitude <= 26 && longitude >= 50 && longitude <= 56) {
      // Saudi Arabia region
      return PRAYER_METHODS.find(m => m.id === 4) || DEFAULT_METHOD; // Umm Al-Qura
    } else if (latitude >= 24 && latitude <= 37 && longitude >= 44 && longitude <= 60) {
      // Gulf region
      return PRAYER_METHODS.find(m => m.id === 8) || DEFAULT_METHOD; // Gulf Region
    } else if (latitude >= 21 && latitude <= 32 && longitude >= 24 && longitude <= 37) {
      // Egypt — Egyptian General Authority of Survey (Fajr 19.5°, Isha 17.5°)
      return PRAYER_METHODS.find(m => m.id === 3) || DEFAULT_METHOD; // Egyptian
    } else if (latitude >= 25 && latitude <= 45 && longitude >= -125 && longitude <= -66) {
      // North America
      return PRAYER_METHODS.find(m => m.id === 2) || DEFAULT_METHOD; // ISNA
    } else if (latitude >= 35 && latitude <= 42 && longitude >= 26 && longitude <= 45) {
      // Turkey region
      return PRAYER_METHODS.find(m => m.id === 12) || DEFAULT_METHOD; // Turkey
    } else if (latitude >= 30 && latitude <= 37 && longitude >= -10 && longitude <= 5) {
      // Morocco/Spain region
      return PRAYER_METHODS.find(m => m.id === 14) || DEFAULT_METHOD; // Morocco
    } else {
      // Default to Muslim World League
      return DEFAULT_METHOD;
    }
  }
}

export const prayerMethods = new PrayerMethodsService();
