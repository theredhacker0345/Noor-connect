# Noor Connect Technical Architecture Report

## Executive Summary

**Noor Connect** is a comprehensive, privacy-focused Islamic application built as a hybrid Progressive Web App (PWA) that can be deployed as both a web application and native mobile apps (Android/iOS). The application is licensed under GNU GPL v3.0 and prioritizes data privacy by keeping all information strictly local on user devices.

## Project Classification

### Application Type: **Hybrid PWA + Capacitor Native**
- **Web**: React + TypeScript + Vite PWA with Service Worker
- **Mobile**: Capacitor 6.x (native Android widgets were removed in v2.3.0)
- **Cross-Platform**: Single codebase with platform-specific compilation

### Architecture: **Privacy-First, Offline-First**
- No external analytics or tracking
- Local storage of all data
- F-Droid compatible (zero proprietary blobs)
- Auto-updater from GitHub releases

## Complete File Structure

### Root Directory Structure
```
.
├── src/
│   ├── components/                    # React UI components
│   ├── contexts/                     # React context providers
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # Backend utilities & services
│   ├── pages/                        # Route components
│   ├── styles/                       # CSS (Tailwind)
│   └── utils/                        # TypeScript utilities
├── android/                         # Native Android build
│   ├── app/                         # App module
│   └── capacitor-cordova-android-plugins/
├── public/                          # Static assets & web assets
├── dist/                            # Build output
└── package.json, package-lock.json  # Dependencies
```

### Key Technical Directories

**Frontend (TypeScript/React)**
- `src/` - Complete application source with **300+ files**
- `src/lib/` - Core business logic and services
- `src/components/` - UI components (shadcn/ui + custom)
- `src/pages/` - Application routes

**Android Native**
- `android/app/src/main/java/` - Native Android code
- ~~Widget system~~ removed in v2.3.0
- Capacitor plugin bridge for communication

**Build & Configuration**
- `vite.config.ts` - Web build and PWA configuration
- `capacitor.config.ts` - Capacitor native config
- `android/app/build.gradle` - Native build system

## Project Classification

### Application Type
1. **Hybrid PWA (Progressive Web App)**
   - Installable on mobile devices
   - Service Worker for offline capability
   - PWA manifest with standalone mode

2. **Capacitor Native Mobile**
   - Capacitor 6.x with native APIs
    - Native notifications, storage, sensors

3. **F-Droid Compatible Distribution**
   - Zero Google Play Services
   - FOSS (Free and Open Source Software)
   - Localized assets and resources

### Core Features Categories
1. **Quran & Tafsir** - 604-page Mushaf with caching
2. **Prayer Times** - 5 prayer tracking with offline calculation
3. **Qibla Compass** - Native sensor-based direction finder
4. **Hadith Collections** - 87,000+ hadith with grading system
5. **Islamic Finance** - Zakat & Fitrana calculators
6. **Spiritual Tools** - Tasbeeh counter, Ramadan mode, menstrual tracking
7. **Media** - Quran radio, live streams, audio recitation
8. **Education** - Islamic quiz, tafsir, asma-ul-husna

## Dependencies Analysis

### Runtime Dependencies (package.json)

**Core Libraries (45 packages)**
- **UI Framework**: React 18.3.1, TypeScript 5.8.3, Vite
- **Styling**: Tailwind CSS 3.4.17, shadcn/ui components
- **State Management**: React Query 5.83.0, Dexie 4.0.11
- **Navigation**: React Router DOM 6.30.1, Framer Motion
- **Internationalization**: i18next 25.8.13 with 5 locales
- **Form Handling**: React Hook Form 7.61.1, Zod 3.25.76
- **API Integration**: Adhan 4.4.3, Qibla 1.1.0, spacy API

**Performance & Capabilities**
- **Performance**: Canvas Confetti, Framer Motion, Embla Carousel
- **Data Visualization**: Recharts, PDF.js, jsPDF
- **Audio/Video**: HLS.js, native audio engines
- **Security**: Workbox Window, compression plugins

**Platform-Specific**
- **Capacitor**: App, Browser, Device, Haptics, Local Notifications
- **Android**: WorkManager, Kotlin coroutines

### Native Libraries
- **Android SDK**: Java 17, Kotlin 1.7.3
- **Build Tools**: Gradle 8.14.3, Android Studio
- **Web Components**: WebP image format, WebAssembly

### Capacitor Plugins
1. **@capacitor/app** - App lifecycle and URLs
2. **@capacitor/browser** - In-app browser
3. **@capacitor/device** - Device info and capabilities
4. **@capacitor/haptics** - Vibration feedback
5. **@capacitor/local-notifications** - Local notifications
6. **@capacitor/motion** - Motion sensors
7. **@capacitor/preferences** - Key-value storage (native)

## Architecture Patterns

### 1. Component-Based Architecture
- **Atomic Design**: UI atoms, molecules, organisms
- **Composition over Inheritance**: Component composition
- **Higher-Order Components**: Auth, Error boundaries, loaders

### 2. State Management Patterns
- **React Context**: Theme, Settings, Language contexts
- **React Query**: Server state with caching
- **Custom Hooks**: usePrayerTimes, useI18n, usePrayerAlarm

### 3. Service Layer Architecture
```
Business Logic:
├── Prayer Calculation (offline + API fallback)
├── Quran Services (caching, search)
├── Hadith Services (87K entries)
├── Storage Services (localForage, Preferences)
```

### 4. Event-Driven Architecture
- **Notification System**: Local notifications with scheduling
- **Event Bus**: Custom events for component communication

### 5. Persistence Patterns
- **Local Storage**: Settings, user preferences
- **IndexedDB**: Large datasets (hadith, Quran)
- **Capacitor Preferences**: Native storage
- **Service Worker**: Cache management

## Build System

### Primary Build Tool: **Vite**
```bash
# Development
npm run dev

# Production Build
npm run build
npm run version:sync && vite build

# Android Build
npm run android:build
npm run build && node scripts/clean-dist-data.js && cap sync android && cd android && ./gradlew assembleRelease
```

### Build Process
1. **Asset Optimization**
   - Image compression (JPEG, PNG, WebP)
   - JS/CSS bundle splitting
   - Brotli/Gzip compression

2. **Native Integration**
   - Capacitor sync for Android
   - Mushaf image moving to native assets

3. **PWA Configuration**
   - Service Worker injection
   - Manifest generation
   - Offline fallback routes

### Build Scripts
- `version:sync` - Version synchronization
- `clean:dist` - F-Droid specific cleaning
- `optimize:all` - Comprehensive optimization

## Technical Stack

### Frontend
```
UI Layer:
├── React 18.18
├── TypeScript 5.8.3
├── Vite 5.4.19
├── shadcn/ui ( Radix UI components)
├── Tailwind CSS 3.4.17
├── Framer Motion 12.29.2
└── Sonner 1.7.4 (Notifications)

State & Data:
├── React Query 5.83.0
├── React Hook Form 7.61.1
├── Zod 3.25.76
├── i18next 25.8.13
├── Dexie 4.0.11
└── LocalForage 1.10.0

Performance:
├── Workbox 7.3.0
├── Compression plugins
├── lazy loading
└── requestIdleCallback
```

### Backend Services
- **Prayer Calculation**: Adhan 4.4.3 + offline fallback
- **Quran API**: spacy API for tafsir (no database)
- **Hadith API**: Local storage (87K entries)
- **Real-time**: window CustomEvent bridges for in-app dashboard cards

### Native Layer
- **Android**: Kotlin 1.7.3, Gradle 8.14.3
- **iOS**: Swift/SwiftUI (via Capacitor)
- **Sensors**: Motion, magnetometer, accelerometer
- **Notifications**: LocalNotifications API

### API Integrations
1. **spacy API** - Tafsir and Quran commentary
2. **HLS.js** - Live streaming (Makkah/Madinah)
3. **Aladhan API** - Prayer times (with cache)
4. **Metal API** - Zakat gold/silver prices

## Key Technical Features

### 1. Performance Optimization
- **Low-End Device Support**: Adaptive performance modes
- **Animation Reduction**: Respect `prefers-reduced-motion`
- **Memory Management**: Garbage collection triggers
- **Bundle Splitting**: Manual chunks for lazy loading

### 2. Privacy & Security
- **Zero Analytics**: No tracking or telemetry
- **Encrypted Storage**: Local storage only
- **Offline-First**: All core features work offline
- **F-Droid First**: Strict FOSS compliance

### 3. Widget System (removed in v2.3.0)

The native home-screen widget suite was removed. In-app dashboard cards remain.

### 4. Internationalization
- **5 Languages**: English, Arabic, Urdu, Bengali, Russian
- **RTL Support**: Full right-to-left layout
- **Unicode Support**: Arabic script rendering

### 5. Data Management
- **Offline Database**: 87K+ hadith entries
- **Smart Caching**: Prayer times, Quran pages
- **Backup/Restore**: Full app data migration
- **Migration Tool**: LocalStorage to Capacitor Preferences

## Deployment & Distribution

### Web Deployment
- **Vercel**: GitHub Actions CI/CD pipeline
- **PWA Manifest**: Standalone installation
- **Service Worker**: Auto-update capability
- **Auto-Updater**: Direct GitHub repository updates

### Mobile Distribution
- **Google Play**: Standard Android APK
- **F-Droid**: Strict FOSS version
- **GitHub Releases**: Direct APK downloads
- **Capacitor**: Cross-platform packaging

### CI/CD Pipeline
```
.github/workflows/
├── pr-validation.yml
├── lint-typecheck.yml
├── npm-audit.yml
├── vercel-preview.yml
├── build-apks-signed.yml
└── apk-size-check.yml
```

## Best Practices

### Code Quality
- **TypeScript**: Full type coverage with strict mode
- **ESLint**: Comprehensive linting rules
- **Prettier**: Consistent code formatting
- **Testing**: Component and integration tests

### User Experience
- **Progressive Enhancement**: Core features work everywhere
- **Graceful Degradation**: Fallback for failed features
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance Monitoring**: FPS tracking and optimization

### Mobile Optimization
- **Sensor Usage**: Efficient magnetometer, accelerometer
- **Battery Optimization**: Smart scheduling, doze modes
- **Memory Management**: Low-end device detection
- **Network Awareness**: Progressive loading based on connection

## Conclusion

Noor Connect represents a sophisticated hybrid application architecture that successfully combines web technologies with native mobile capabilities while maintaining a strong focus on privacy, performance, and user experience. The application demonstrates advanced patterns in state management, persistence, and cross-platform development, making it a noteworthy example of modern Islamic software development.

**Key Achievements**:
- ✅ Complete offline capability
- ✅ F-Droid compliance
- ✅ Low-end device optimization
- ✅ Privacy-first architecture
- ✅ Comprehensive Islamic feature set

The application serves as a comprehensive digital companion for Muslims worldwide, providing access to Islamic resources without compromising user privacy or device performance.
