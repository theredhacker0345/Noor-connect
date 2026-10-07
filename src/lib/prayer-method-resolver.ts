/**
 * Prayer Method Resolver
 *
 * Single source of truth for which calculation method the app should use.
 * Previously each code path picked its own method (Dashboard hardcoded Karachi,
 * GlobalPrayerAlarm hardcoded ISNA, notifications hardcoded Karachi, and the
 * Settings selector wrote a key nobody read), so different screens and alarms
 * showed/fired at different times for the same day.
 *
 * Resolution order:
 *  1. The method explicitly chosen by the user in Settings (either storage key).
 *  2. The region-recommended method for the given coordinates
 *     (e.g. Egyptian General Authority for Egypt) when no explicit choice exists.
 *  3. The region-recommended method for the stored location, then MWL.
 */
import { prayerMethods } from './prayer-methods';
import { getCalculationMethod, hasExplicitCalculationMethod, type CalculationMethodName } from './prayer-calculator';
import { ALADHAN_METHODS } from './aladhan-api';

export function getEffectiveCalculationMethod(latitude?: number, longitude?: number): CalculationMethodName {
  if (hasExplicitCalculationMethod()) {
    return getCalculationMethod();
  }

  if (typeof latitude === 'number' && typeof longitude === 'number' && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
    return prayerMethods.getRecommendedMethod(latitude, longitude).calculationMethod;
  }

  // No coordinates provided — fall back to the choice derived from the stored location.
  return prayerMethods.getSelectedMethod().calculationMethod;
}

export function getEffectiveAladhanMethodId(latitude?: number, longitude?: number): number {
  return ALADHAN_METHODS[getEffectiveCalculationMethod(latitude, longitude)] ?? 3;
}
