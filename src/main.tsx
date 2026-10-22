import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { localNotifications } from "@/lib/local-notifications";
import { whenIdle } from "@/lib/performance-optimizations";
import './lib/i18n-new'; // Initialize new offline-first i18n
import { initUpdateSafety } from "@/lib/update-safety";

// Update-safety check (version-change detection + data-loss sentinel).
// Fire-and-forget: internally guarded, never throws and never blocks render.
void initUpdateSafety();

// Initialize local notifications on the first idle slice so it doesn't compete
// with the initial paint / Capacitor bridge startup (reduces startup jank).
whenIdle(() => { void localNotifications.initialize(); });

import { LanguageProvider } from "@/contexts/LanguageContext-new";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </StrictMode>
  );
} else {
  console.error("Root element not found");
}

// Defer low-end device detection until after React root is created
import { isLowEndDevice } from "@/lib/performance-optimizations";
if (isLowEndDevice()) {
  document.documentElement.classList.add("low-end-device");
}

// Service worker is handled automatically by vite-plugin-pwa (injectRegister: 'auto')
// in production. In development, we forcefully unregister to prevent console spam.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) return;

      await Promise.all(registrations.map((r) => r.unregister()));

      // Remove any PWA caches that can interfere with Vite dev (stale chunks/assets).
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // A controlling SW continues until reload; reload once to fully detach.
      if (navigator.serviceWorker.controller) {
        const reloadKey = "dev-sw-detach-reload";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
      }
    } catch (err) {
      console.warn("Failed to unregister Service Worker in development mode:", err);
    }
  })();
}
