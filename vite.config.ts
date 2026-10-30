import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";
import compression from "vite-plugin-compression";

const APP_VERSION = process.env.npm_package_version ?? "0.0.0";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    target: 'es2015',
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        // Exclude heavy vendor chunks from modulepreload (they're lazy-loaded)
        return deps.filter(dep =>
          !dep.includes('pdf-vendor') &&
          !dep.includes('charts') &&
          !dep.includes('radix-ui') &&
          !dep.includes('animations')
        );
      }
    },
    esbuild: {
      target: 'es2015',
      supported: {
        'optional-chaining': false,
        'nullish-coalescing': false,
        'dynamic-import': false,
        'bigint': false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Animation vendor chunk (used everywhere)
          'animations': ['framer-motion'],
          // Radix UI components (used everywhere)
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-tooltip',
          ],
          // React Query
          'react-query': ['@tanstack/react-query'],
          // Carousel vendor chunk
          'carousel': ['embla-carousel-react'],
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:54321/functions/v1",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: 'serve-android-assets',
      configureServer(server) {
        server.middlewares.use('/android_asset/mushaf', (req, res, next) => {
          const urlPath = req.url?.split('?')[0] || '';
          const filePath = path.join(__dirname, 'android/app/src/main/assets/mushaf', urlPath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      }
    },
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: "autoUpdate",
      injectRegister: 'auto',
      includeAssets: [
        "favicon.png",
        "icon-192x192.png",
        "icon-512x512.png",
        "apple-touch-icon.png",
        "icon-72x72.png",
        "icon-96x96.png",
        "icon-128x128.png",
        "icon-144x144.png",
        "icon-152x152.png",
        "icon-384x384.png",
        "icon-192-maskable.png",
        "icon-512-maskable.png"
      ],
      manifest: {
        id: "com.noorconnect.app.v1.2",
        name: "Noor Connect - Islamic Companion",
        short_name: "Noor Connect",
        description: "Prayer times, Qur'an, Qibla, Tasbeeh, and Daily Hadith. Your complete Islamic companion app.",
        theme_color: "#0B3D2E",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["books", "education", "productivity"],
        lang: "en",
        dir: "ltr",
        shortcuts: [
          {
            name: "Radio",
            short_name: "Radio",
            description: "Listen to Quran Radio",
            url: "/quran-radio",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Prayer Times",
            short_name: "Prayers",
            description: "Check Prayer Times",
            url: "/dashboard",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          }
        ],
        icons: [
          {
            src: "/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      devOptions: {
        enabled: false // Disable SW in dev to prevent caching of Vite internal files
      },
      // Exclude large hadith data from PWA precaching
      injectManifest: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        globIgnores: ['**/*.map', '**/data/hadith-collections/**']
      }
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-i18next',
      'i18next',
      'use-sync-external-store/shim',
    ],
  },
}));
