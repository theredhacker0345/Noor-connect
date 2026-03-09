import { QiblaDirectionData, PermissionStatus } from './native-qibla-service';
import { GeolocationService, type LocationCoordinates } from './geolocation-service';
import { calculateQiblaBearing, calculateDistanceToKaabaKm, getCardinalDirection } from './qibla';

export class WebQibla {
  private isListening = false;
  private listeners: Set<(data: QiblaDirectionData) => void> = new Set();
  private location: LocationCoordinates | null = null;
  private heading: number | null = null;
  private orientationListener: ((event: DeviceOrientationEvent) => void) | null = null;

  async startCompass(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🌐 Web Qibla fallback: Starting simple compass mode');

      // Try to get actual location first
      try {
        const coords = await GeolocationService.getCurrentPosition();
        if (coords) {
          this.location = coords;
          console.log('✅ Web location acquired:', coords.latitude, coords.longitude);
        }
      } catch (err) {
        console.warn('⚠️ Web location failed, falling back to mock:', err);
        // Fallback to Kaaba coordinates if GPS fails
        this.location = {
          latitude: 21.4225,
          longitude: 39.8262,
          accuracy: 1000
        };
      }

      // Try to use device orientation if available, otherwise simulate
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        console.log('Device orientation available, trying to use it...');

        // Try to request permission for iOS, but don't fail if it doesn't work
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            if (permission === 'granted') {
              console.log('✅ iOS permission granted');
              this.setupOrientationListener();
            } else {
              console.log('⚠️ iOS permission denied, using simulation');
              this.useSimulatedCompass();
            }
          } catch (error) {
            console.log('⚠️ iOS permission request failed, using simulation');
            this.useSimulatedCompass();
          }
        } else {
          // Android/older iOS - try to use device orientation directly
          this.setupOrientationListener();
        }
      } else {
        console.log('⚠️ Device orientation not available, using simulation');
        this.useSimulatedCompass();
      }

      this.isListening = true;
      this.startDataUpdates();

      console.log('🎉 Web Qibla compass started in fallback mode!');
      return {
        success: true,
        message: 'Web Qibla compass started (simulated mode)'
      };
    } catch (error) {
      console.error('💥 Failed to start web compass:', error);

      // Last resort - start with basic simulation
      console.log('🔄 Using last resort simulation mode');
      this.location = {
        latitude: 21.4225,
        longitude: 39.8262,
        accuracy: 1000
      };
      this.isListening = true;
      this.useSimulatedCompass();
      this.startDataUpdates();

      return {
        success: true,
        message: 'Web Qibla compass started (basic simulation)'
      };
    }
  }

  private useSimulatedCompass(): void {
    console.log('Using simulated compass rotation');
    // Simulate compass rotation for demo purposes
    this.heading = Date.now() / 100 % 360;
  }

  async stopCompass(): Promise<{ success: boolean; message: string }> {
    this.isListening = false;

    if (this.orientationListener) {
      window.removeEventListener('deviceorientation', this.orientationListener);
      this.orientationListener = null;
    }

    return {
      success: true,
      message: 'Web Qibla compass stopped'
    };
  }

  async getQiblaDirection(): Promise<{
    success: boolean;
    message: string;
    isListening?: boolean;
  }> {
    return {
      success: true,
      message: 'Web Qibla direction available',
      isListening: this.isListening
    };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    // Check if DeviceOrientationEvent is available
    const hasOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

    return {
      permissions: {
        ACCESS_FINE_LOCATION: hasOrientation,
        ACCESS_COARSE_LOCATION: hasOrientation,
      },
      allGranted: hasOrientation,
    };
  }

  async addListener(
    eventName: string,
    listenerFunc: (data: any) => void
  ): Promise<any> {
    if (eventName === 'qiblaDirectionChange') {
      this.listeners.add(listenerFunc as (data: QiblaDirectionData) => void);
    }
    return Promise.resolve();
  }

  async removeAllListeners(): Promise<void> {
    this.listeners.clear();
  }

  private setupOrientationListener(): void {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      console.warn('DeviceOrientationEvent not supported');
      return;
    }

    this.orientationListener = (event: DeviceOrientationEvent) => {
      // Log for debugging
      console.log(`Compass Event (Fallback): alpha=${event.alpha}, beta=${event.beta}, gamma=${event.gamma}`);

      // Get heading from device orientation
      if (event.alpha !== null) {
        // Convert to 0-360 degrees where 0 = North
        this.heading = 360 - event.alpha;
        this.updateQiblaData();
      }
    };

    window.addEventListener('deviceorientation', this.orientationListener);
  }

  private startDataUpdates(): void {
    if (!this.isListening) return;

    // Send initial data immediately
    this.updateQiblaData();

    // Update every 500ms for smooth experience
    const interval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(interval);
        return;
      }
      this.updateQiblaData();
    }, 500);
  }

  private updateQiblaData(): void {
    if (!this.location || !this.isListening) return;

    const qiblaBearing = calculateQiblaBearing(this.location.latitude, this.location.longitude);
    const distance = calculateDistanceToKaabaKm(this.location.latitude, this.location.longitude);

    // Use actual heading if available, otherwise simulate
    const compassAngle = this.heading || (Date.now() / 100) % 360;

    const data: QiblaDirectionData = {
      isFacingQibla: Math.abs(compassAngle - qiblaBearing) < 10,
      compassAngle,
      needleAngle: qiblaBearing,
      qiblaBearing,
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      accuracy: this.location.accuracy || undefined,
    };

    this.listeners.forEach(listener => listener(data));
  }
}
