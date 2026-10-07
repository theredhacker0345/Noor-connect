# Crash-on-Launch Fix & Performance Plan

## Problem Statement
App crashes instantly on Android 7.0 (API 24) devices: opens → closes same second. No error shown to user.

## Root Cause Analysis

### Crash-on-Launch (Critical)
| Factor | Current State | Impact |
|--------|---------------|--------|
| `browserslist` | **Missing** from package.json | Vite doesn't transpile for old WebView |
| `vite.config.ts` target | `es2015` only | No syntax downleveling for Chrome 51 |
| Android 7.0 WebView | Chrome 51 (2016) | No `?.`, `??`, `??=`, dynamic import, `BigInt`, etc. |
| Capacitor 6 | Requires WebView 89+ | Some APIs polyfilled, but syntax not |
| Build output | Modern ES2020+ syntax | **SyntaxError on first parse** → crash |

**Evidence:** `package.json` has no `browserslist` field. Vite defaults to modern browsers. Android 7.0 system WebView is frozen at Chrome 51.

### Post-Launch Performance (Timer/esbuild)
| Fix | Impact |
|-----|--------|
| Timer cleanup (`Dashboard.tsx:393`, `PremiumDashboard.tsx:65,122`) | Stops accumulating `setInterval`/`requestAnimationFrame` on navigation. Reduces CPU/RAM over time. |
| esbuild minify | 3-5x faster build, similar gz size. **Does not change JS syntax output** - still needs browserslist for transpilation. |

## Plan

### Phase 1: Fix Crash-on-Launch (Week 1)

#### 1.1 Add browserslist for Android 7+ WebView
```json
// package.json
"browserslist": [
  "Android >= 7",
  "Chrome >= 51",
  "WebView >= 7"
]
```

#### 1.2 Add core-js polyfills for missing features
```bash
npm install core-js@3
```
```ts
// main.tsx - FIRST import
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

#### 1.3 Configure Vite for proper transpilation
```ts
// vite.config.ts
build: {
  target: 'es2015',  // Keep
  // Add esbuild target for broader compatibility
  esbuild: {
    target: 'es2015',
    supported: {
      'optional-chaining': false,
      'nullish-coalescing': false,
      'dynamic-import': false
    }
  }
}
```

#### 1.4 Test on Android 7.0 emulator/device
- Verify no SyntaxError in logcat
- App reaches native splash → JS splash → Dashboard

### Phase 2: Performance Improvements (Week 2)

#### 2.1 Timer Cleanup (High Impact, Low Effort)
```tsx
// Dashboard.tsx
useEffect(() => {
  const id = setInterval(() => setMinuteTick(t => t + 1), 60000);
  return () => clearInterval(id);  // ADD THIS
}, []);

// PremiumDashboard.tsx
useEffect(() => {
  const timerId = globalTimerManager.addCallback(...);
  return () => globalTimerManager.removeCallback(timerId);  // ADD THIS
}, []);
```

#### 2.2 Move Heavy Chunks Out of Main Bundle
```ts
// vite.config.ts
manualChunks: {
  'radix-ui': [...],
  'animations': ['framer-motion'],
  // REMOVE pdf-vendor, charts from here
}
```
Lazy-load in `QuranReader.tsx` and `PrayerStats.tsx` only.

#### 2.3 Enable modulePreload for Parallel Chunk Loading
```ts
// vite.config.ts
build: {
  modulePreload: { polyfill: true }
}
```

#### 2.4 Switch to esbuild Minify (Faster Parse)
```ts
// vite.config.ts
build: {
  minify: 'esbuild',  // Replace terser
  // Remove terserOptions
}
```

#### 2.5 Add RequestIdleCallback Preload
```tsx
// AppShell.tsx
useEffect(() => {
  const preload = async () => {
    await Promise.all([
      import('@/pages/Quran'),
      import('@/pages/QuranReader'),
      import('@/pages/Hadith'),
      import('@/pages/Tasbeeh'),
      import('@/pages/Qibla'),
    ]).catch(() => {});
  };
  requestIdleCallback?.(preload) || setTimeout(preload, 200);
}, []);
```

### Phase 3: Native Splash Screen (Week 2-3)

#### 3.1 Add @capacitor/splash-screen
```bash
npm install @capacitor/splash-screen
```

#### 3.2 Configure Native Splash Control
```ts
// capacitor.config.ts
plugins: {
  SplashScreen: {
    launchShowDuration: 0,
    launchAutoHide: false,
    backgroundColor: "#0F1117",
    androidScaleType: "CENTER_CROP"
  }
}
```

#### 3.3 Hide After App Ready
```tsx
// AppShell.tsx
useEffect(() => {
  const checkReady = setInterval(() => {
    if (document.getElementById('root')?.hasChildNodes()) {
      clearInterval(checkReady);
      SplashScreen.hide({ fadeOutDuration: 300 });
    }
  }, 50);
}, []);
```

### Phase 4: Optional - Raise minSdk (Strategic Decision)

| Option | Pros | Cons |
|--------|------|------|
| Keep minSdk=24 + full polyfill | Supports old devices | Larger bundle, more maintenance |
| Raise to minSdk=26 (Android 8) | WebView updatable, modern JS works | Drops ~5% users (Android 7) |
| Raise to minSdk=28 (Android 9) | Best compatibility | Drops ~15% users |

**Recommendation:** Fix for minSdk=24 first (Phases 1-3), then evaluate crash rates. If <1% users on Android 7, consider raising in v3.

## Validation Checklist

- [ ] `npm run build` produces no SyntaxError for `?.` `??` in output
- [ ] Android 7.0 emulator: app launches to Dashboard
- [ ] logcat shows no "WebView renderer gone" on cold start
- [ ] Timer cleanup: no interval leak after 10 nav cycles
- [ ] Bundle size: main chunk < 500 KB gz
- [ ] Cold start < 2s on Mali-400 class device

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `browserslist`, `core-js`, `regenerator-runtime` |
| `src/main.tsx` | Add polyfill imports at TOP |
| `vite.config.ts` | Add esbuild target, modulePreload, minify: esbuild |
| `src/pages/Dashboard.tsx` | Add `clearInterval` cleanup |
| `src/components/PremiumDashboard.tsx` | Add `globalTimerManager.removeCallback` |
| `capacitor.config.ts` | Add SplashScreen config |
| `src/App.tsx` / `AppShell.tsx` | Add SplashScreen.hide() + preload logic |
| `android/app/build.gradle` | Verify minSdkVersion=24 |

## Success Metrics

| Metric | Target |
|--------|--------|
| Crash-free sessions (Android 7) | > 99% |
| Cold start time (low-end) | < 2.5s |
| JS heap after 5 min usage | < 80 MB |
| Bundle main chunk (gz) | < 500 KB |