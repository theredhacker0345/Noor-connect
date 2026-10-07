# 🌙 Noor Connect - Your Ultimate Islamic Companion

**License**: GPL-3.0-or-later | **Status**: Stable | **Version**: 2.3.0 | **Privacy-First** | **No Copyright Nasheed Partner**

**Noor Connect** is a comprehensive, privacy-focused Islamic application built as a hybrid Progressive Web App (PWA) with native mobile capabilities. It offers a complete Islamic toolkit without compromising your privacy — no tracking, no analytics, all data stays on your device.

---

## 🎯 Our Mission

Noor Connect was built because there was no single Islamic app that offered comprehensive features without selling user data. Every feature exists because the developer personally needed it, and every architectural decision prioritizes **your sovereignty over your spiritual data**.

### 🏆 Partnership: No Copyright Nasheed

We're proud to partner with **[No Copyright Nasheed](https://nocopyrightnasheed.com/)** — the leading platform for copyright-free Islamic nasheeds.

- ✅ **Official License Grant**: Free perpetual license to integrate 400+ premium nasheeds
- ✅ **Official Feature**: Noor Connect is featured on the [No Copyright Nasheed website](https://nocopyrightnasheed.com/) as a trusted partner
- 🎵 **400+ curated nasheeds** with a highly optimized audio player

---

## 🆕 What's New in v2.3.0

### 🇰🇷 Korean Language Support
- Full Korean (한국어) translation for all app UI strings
- Korean is now a first-class supported language alongside English, Arabic, Urdu, Bengali, Russian, and French

### 🗑️ Widget System Removed
- Removed native Android home-screen widgets to simplify the codebase
- All widget-related infrastructure deleted

### 💚 Simplified Donation Section
- Replaced crypto wallet addresses with a clean WhatsApp contact card
- Contact the developer directly on WhatsApp to donate — Jazak Allah Khair

---

## ✨ Features

### 📖 Quran & Tafsir
- **Complete Holy Quran**: 604-page Madani Mushaf with WebP images and advanced caching
- **Surah Explorer**: Browse all 114 surahs with search, filters, and "Continue Reading" feature
- **Advanced Tafsir System**: 25+ Quranic commentary editions via spaCy API
- **Multilingual Support**: Read meanings and Tafsir in English, Arabic, Bengali, Urdu, and Russian
- **Recitation Playback**: Audio from 11 expert reciters with progress tracking and MP3 download
- **Offline Quran Engine**: IndexedDB offline storage with background sync
- **Quran Progress**: Page-based reading progress, streaks, and achievements

### 🕋 Qibla Compass
- **High-Precision Native Sensors**: Magnetometer-based orientation with 60fps interpolation
- **Premium UI**: SVG-based compass dial with Kaaba alignment glow effects
- **Web Fallback**: GPS/Web-based calculation if sensors fail

### 📅 Islamic Calendar & Events
- **Complete Hijri Calendar**: Gregorian and Hijri dates with offset adjustments
- **Ramadan Mode**: Suhoor/Iftar countdowns, Taraweeh tracking, hydration reminders
- **Holiday Countdowns**: Automated countdowns for Eid al-Fitr, Eid al-Adha, and Laylat al-Qadr

### ⏲️ Prayer Times & Adhan
- **Offline Calculation**: Precise timings for Hanafi and Shafi'i madhabs
- **Granular Adhan Toggles**: Enable/disable Adhan per prayer individually
- **Custom Adhan Upload**: Upload your own MP3 adhan (max 10 MB)
- **Smart Settings**: 12+ calculation methods, madhab selector, 12/24-hour format

### 📿 Spiritual Tracking
- **Gender-Adaptive Onboarding**: Features adapt based on user profile
- **Menstrual Mode**: Track cycles with automatic Adhan silencing and habit adjustment
- **Qaza Tracker**: Ledger of missed prayers
- **Digital Tasbeeh**: 5 dhikrs with Zen Mode, lifetime totals, and haptic feedback
- **Salah Focus Timer**: Do-Not-Disturb timer for prayer focus
- **Habit Tracker**: Track daily spiritual habits with streaks

### 📚 Islamic Education
- **Zakat & Fitrana Calculators**: Offline calculators with real-time exchange rates
- **Hisnul Muslim & Duas**: 80+ authentic supplications with search and audio
- **Names of Allah (Asma-ul-Husna)**: 99 Names with meanings and favorites
- **Islamic Quiz**: Gamified quizzes with XP system, levels, and achievements
- **Islamic Remedies (Tibb-e-Nabawi)**: Mood-based prophetic medicine index
- **Eid Checklist**: Preparation checklists for Islamic events
- **Prayer Statistics**: Visual graphs tracking prayer performance

### 📖 History & Literature
- **Seerah of the Prophet (ﷺ)**: Comprehensive biography with progress tracking
- **Qisas Al-Anbiya**: Stories of the Prophets
- **Ebooks Library**: Modern Islamic ebooks reader

### 📻 Media & Library
- **Hadith Encyclopedia**: 52K+ hadith from 16 collections with grading system
- **24/7 Quran Radio & Streams**: Live streams from Makkah and Madinah via official SBA CDN
- **Quran Radio Catalog**: 200+ streaming stations with categories and favorites
- **Radio Statistics**: Track listening habits with achievements
- **Nasheed Library**: 400+ legally licensed nasheeds with adaptive streaming

### 🎵 Nasheed Player
- **Official Partnership**: 400+ nasheeds from No Copyright Nasheed
- **Adaptive Streaming**: Smart bitrate for weak connections
- **Offline-First**: Download for offline listening
- **Smart Features**: Sleep timer, lyrics sync, daily recommendations

### 📱 Android Integration
- **Auto Backup & Restore**: Automatic backup every 20 minutes and on app close
- **Advanced Notifications**: Heads-up Adhaan, prayer quotes, Friday Kahf reminder
- **Notification History**: Beautiful UI with rich visual cards
- **Lock-Screen Controls**: Media Session API for audio playback
- **Privacy-First**: No analytics, no tracking, all data local

---

## 🚀 Technical Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript 5.8, Vite 5.4, Tailwind CSS 3.4
- **State Management**: React Query 5.8, React Context
- **UI Components**: shadcn/ui (Radix UI), Framer Motion 12.3
- **Platform**: Capacitor 6.x for native mobile apps
- **PWA**: Progressive Web App with Service Worker for offline capability

### Privacy & Security
- **Zero Analytics**: No tracking or telemetry
- **Local Storage**: All data stored on-device
- **Offline-First**: Core features work without internet
- **F-Droid Compatible**: Zero Google Play Services, strict FOSS compliance
- **Open Source**: GNU GPL v3.0 license

### Performance
- **Low-End Device Support**: Adaptive performance modes for 2016+ devices
- **Animation Reduction**: Respects `prefers-reduced-motion`
- **Lazy Loading**: IntersectionObserver for efficient resource loading
- **React Query Tuning**: Optimized cache times and retry policies

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18+
- **Android Studio / Gradle**: Required for native Capacitor builds

### Clone & Run
```bash
git clone https://gitlab.com/theredhacker0345/Noor-connect.git
cd Noor-connect
npm install

# Run development server
npm run dev
```

### Build for Android
```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open Android Studio
npx cap open android
```

### Build APK
```bash
npm run android:build
```

---

## � Contributors

Special thanks to our contributors who helped make Noor Connect better:

- **HSLN** ([@HSLN](https://gitlab.com/HSLN)) - French language translation
- **Nuraqueer** ([@nuraqueer](https://gitlab.com/nuraqueer)) - Korean language translation

## 💬 Feedback Contributors

We're grateful to those who provided valuable feedback:

- **Haris** - Sri Lanka
- **Ibrahim Bn Tariq** - Egypt

---

## �📄 License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

<p align="center">
  <i>"Indeed, in the remembrance of Allah do hearts find rest." (Ar-Ra'd 13:28)</i>
</p>

---

## 📱 Screenshots

<table>
  <tr>
    <td align="center"><img width="280" alt="Home Dashboard" src="assets/screenshots/1_home.png" /><br/><b>Home Dashboard</b></td>
    <td align="center"><img width="280" alt="Services" src="assets/screenshots/2_services.png" /><br/><b>Services</b></td>
    <td align="center"><img width="280" alt="Qibla Compass" src="assets/screenshots/3_qibla.png" /><br/><b>Qibla Compass</b></td>
  </tr>
  <tr>
    <td align="center"><img width="280" alt="Live Streams" src="assets/screenshots/4_live.png" /><br/><b>Live Streams</b></td>
    <td align="center"><img width="280" alt="Quran Radio" src="assets/screenshots/5_radio.png" /><br/><b>Quran Radio</b></td>
    <td align="center"><img width="280" alt="Islamic Quiz" src="assets/screenshots/6_quiz.png" /><br/><b>Islamic Quiz</b></td>
  </tr>
  <tr>
    <td align="center"><img width="280" alt="Islamic Remedies" src="assets/screenshots/7_islamic_remedies.png" /><br/><b>Islamic Remedies</b></td>
    <td align="center"><img width="280" alt="Hadith Encyclopedia" src="assets/screenshots/8_hadith.png" /><br/><b>Hadith Encyclopedia</b></td>
    <td align="center"><img width="280" alt="Settings" src="assets/screenshots/9_settings.png" /><br/><b>Settings</b></td>
  </tr>
</table>
