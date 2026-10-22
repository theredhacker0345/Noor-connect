/**
 * Offline Prayer Times Calculator using adhan library
 * No API calls required - calculates locally
 */
import { Coordinates, CalculationMethod, PrayerTimes, CalculationParameters, Madhab, Shafaq, SunnahTimes } from 'adhan';
import { getMadhab, type MadhabType } from './storage';

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

export interface PrayerTimesResult {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface FormattedPrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const CALCULATION_METHODS: Record<CalculationMethodName, () => CalculationParameters> = {
  MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
  Egyptian: CalculationMethod.Egyptian,
  Karachi: CalculationMethod.Karachi,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Dubai: CalculationMethod.Dubai,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  NorthAmerica: CalculationMethod.NorthAmerica,
  Kuwait: CalculationMethod.Kuwait,
  Qatar: CalculationMethod.Qatar,
  Singapore: CalculationMethod.Singapore,
  Turkey: CalculationMethod.Turkey,
  Tehran: CalculationMethod.Tehran,
};

export const CALCULATION_METHOD_LABELS: Record<CalculationMethodName, string> = {
  MuslimWorldLeague: 'Muslim World League',
  Egyptian: 'Egyptian General Authority',
  Karachi: 'University of Islamic Sciences, Karachi',
  UmmAlQura: 'Umm al-Qura University, Makkah',
  Dubai: 'Dubai',
  MoonsightingCommittee: 'Moonsighting Committee',
  NorthAmerica: 'ISNA (North America)',
  Kuwait: 'Kuwait',
  Qatar: 'Qatar',
  Singapore: 'Singapore',
  Turkey: 'Turkey (Diyanet)',
  Tehran: 'Tehran',
};

// Get stored calculation method.
// Two storage keys exist historically:
//  - 'calculation-method': written by setCalculationMethod() (name string, e.g. 'Egyptian')
//  - 'prayer_calculation_method': written by the Settings UI (numeric PRAYER_METHODS id)
// The Settings selector only ever wrote the id key, which meant this reader never
// saw the user's choice and silently fell back to MWL. Both keys are bridged here.
const PRAYER_METHOD_ID_TO_NAME: Record<number, CalculationMethodName> = {
  1: 'MuslimWorldLeague', // Muslim World League
  2: 'NorthAmerica',      // ISNA
  3: 'Egyptian',          // Egyptian General Authority of Survey
  4: 'UmmAlQura',         // Umm al-Qura
  5: 'Karachi',           // University of Islamic Sciences, Karachi
  7: 'Tehran',            // Institute of Geophysics, Tehran
  8: 'MuslimWorldLeague', // Gulf region (MWL base)
  9: 'Kuwait',
  10: 'Qatar',
  11: 'Singapore',
  12: 'Turkey',           // Diyanet
  13: 'Tehran',
  14: 'MuslimWorldLeague' // Morocco (MWL base)
};

export const getCalculationMethod = (): CalculationMethodName => {
  try {
    const legacy = localStorage.getItem('calculation-method');
    if (legacy && legacy in CALCULATION_METHODS) {
      return legacy as CalculationMethodName;
    }

    const selectedId = localStorage.getItem('prayer_calculation_method');
    if (selectedId) {
      const mapped = PRAYER_METHOD_ID_TO_NAME[parseInt(selectedId, 10)];
      if (mapped) return mapped;
    }
  } catch {
    // localStorage unavailable — fall through to default
  }
  return 'MuslimWorldLeague';
};

/** True when the user has explicitly picked a calculation method in Settings. */
export const hasExplicitCalculationMethod = (): boolean => {
  try {
    const legacy = localStorage.getItem('calculation-method');
    if (legacy && legacy in CALCULATION_METHODS) return true;
    const selectedId = localStorage.getItem('prayer_calculation_method');
    if (selectedId && PRAYER_METHOD_ID_TO_NAME[parseInt(selectedId, 10)]) return true;
  } catch {
    // ignore
  }
  return false;
};

export const setCalculationMethod = (method: CalculationMethodName): void => {
  localStorage.setItem('calculation-method', method);
};

// Calculate prayer times for a given date
export const calculatePrayerTimes = (
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  methodName?: CalculationMethodName
): PrayerTimesResult => {
  const coordinates = new Coordinates(latitude, longitude);
  const method = methodName || getCalculationMethod();
  const params = CALCULATION_METHODS[method]();
  
  // Set madhab for Asr calculation
  const madhab = getMadhab();
  // Maliki and Hanbali follow Shafi for Asr calculation (earlier time)
  // Hanafi uses later Asr time
  if (madhab === 'hanafi') {
    params.madhab = Madhab.Hanafi;
  } else {
    params.madhab = Madhab.Shafi; // Shafi, Maliki, Hanbali all use Shafi calculation
  }
  
  const prayerTimes = new PrayerTimes(coordinates, date, params);
  
  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };
};

/**
 * Sunnah night times (computed with the SAME method + madhab as prayer times).
 *  - middleOfTheNight: true Islamic midnight = midpoint(Maghrib, tomorrow's Fajr)
 *    → the jumhur (Maliki/Shafi'i/Hanbali) limit of Isha's valid time.
 *  - lastThirdOfTheNight: start of the virtuous Tahajjud window (NOT an Isha limit).
 *    Aladhan's default API `Midnight` field uses a different (Sunset↔Sunrise) span,
 *    so these must always be computed locally (see docs/research/prayer-end-times.md).
 */
export interface SunnahTimesResult {
  middleOfTheNight: Date;
  lastThirdOfTheNight: Date;
}

export const calculateSunnahTimes = (
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  methodName?: CalculationMethodName
): SunnahTimesResult => {
  const coordinates = new Coordinates(latitude, longitude);
  const method = methodName || getCalculationMethod();
  const params = CALCULATION_METHODS[method]();
  const madhab = getMadhab();
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  const sunnah = new SunnahTimes(new PrayerTimes(coordinates, date, params));
  return {
    middleOfTheNight: sunnah.middleOfTheNight,
    lastThirdOfTheNight: sunnah.lastThirdOfTheNight,
  };
};

// Format time based on user preference
export const formatPrayerTime = (date: Date, format: '12' | '24' = '24'): string => {
  if (format === '12') {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
};

// Get formatted prayer times
export const getFormattedPrayerTimes = (
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  format: '12' | '24' = '24'
): FormattedPrayerTimes => {
  const times = calculatePrayerTimes(latitude, longitude, date);
  
  return {
    fajr: formatPrayerTime(times.fajr, format),
    sunrise: formatPrayerTime(times.sunrise, format),
    dhuhr: formatPrayerTime(times.dhuhr, format),
    asr: formatPrayerTime(times.asr, format),
    maghrib: formatPrayerTime(times.maghrib, format),
    isha: formatPrayerTime(times.isha, format),
  };
};

// Get next prayer
export const getNextPrayer = (
  latitude: number,
  longitude: number
): { name: string; time: Date; timeUntil: string } | null => {
  const now = new Date();
  const times = calculatePrayerTimes(latitude, longitude, now);
  
  const prayers = [
    { name: 'Fajr', time: times.fajr },
    { name: 'Sunrise', time: times.sunrise },
    { name: 'Dhuhr', time: times.dhuhr },
    { name: 'Asr', time: times.asr },
    { name: 'Maghrib', time: times.maghrib },
    { name: 'Isha', time: times.isha },
  ];
  
  for (const prayer of prayers) {
    if (prayer.time > now) {
      const diff = prayer.time.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        name: prayer.name,
        time: prayer.time,
        timeUntil: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      };
    }
  }
  
  // If all prayers passed, get tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = calculatePrayerTimes(latitude, longitude, tomorrow);
  
  const diff = tomorrowTimes.fajr.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    name: 'Fajr',
    time: tomorrowTimes.fajr,
    timeUntil: `${hours}h ${minutes}m`,
  };
};

// Get current prayer
export const getCurrentPrayer = (
  latitude: number,
  longitude: number
): string | null => {
  const now = new Date();
  const times = calculatePrayerTimes(latitude, longitude, now);
  
  if (now >= times.isha) return 'Isha';
  if (now >= times.maghrib) return 'Maghrib';
  if (now >= times.asr) return 'Asr';
  if (now >= times.dhuhr) return 'Dhuhr';
  if (now >= times.sunrise) return 'Sunrise';
  if (now >= times.fajr) return 'Fajr';
  
  return null;
};
