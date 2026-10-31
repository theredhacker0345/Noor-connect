/**
 * Islamic Stream Player — Premium Redesign
 * HLS streaming for Makkah & Madinah.
 * Uses hls.js (MIT License). Primary: SBA/Globecast/Akamai CDN (HTTPS, CORS-enabled).
 * Fallback: Kwikmotion 1080p for Makkah. YouTube removed for F-Droid compliance.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Capacitor } from '@capacitor/core';
import {
  Maximize,
  Minimize,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
  WifiOff,
  RefreshCw,
  Radio,
  MonitorPlay,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FALLBACK_STREAMS, type Channel } from '@/lib/m3u-parser';import { isLowEndDevice } from '@/lib/performance-optimizations';
import { recordListeningTime } from '@/lib/radio-stats';

type StreamLocation = 'makkah' | 'madinah';

interface StreamState {
  channel: Channel | null;
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  /** True while the auto-reconnect backoff is pending — drives the "Reconnecting…" overlay. */
  isRetrying: boolean;
}

const LOCATION_META: Record<StreamLocation, { label: string; arabic: string; color: string }> = {
  makkah: { label: 'Makkah', arabic: 'مكة المكرمة', color: '#10b981' },
  madinah: { label: 'Madinah', arabic: 'المدينة المنورة', color: '#6366f1' },
};

export default function IslamicStreamPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<Record<StreamLocation, number>>({ makkah: 0, madinah: 0 });
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Position-pin timer used by media-error recovery — MUST be cancelled when
  // the stream is destroyed/re-initialised, otherwise a stale pin fires
  // against the FRESH stream and rewinds playback ("same words again").
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const playStartRef = useRef<number>(0);
  const isNative = Capacitor.isNativePlatform();
  const streamUrlsRef = useRef<Record<StreamLocation, { primary: string; fallback: string | null }>>({
    makkah: {
      primary: isNative ? FALLBACK_STREAMS.makkah?.nativeUrl || '' : FALLBACK_STREAMS.makkah?.webUrl || '',
      fallback: FALLBACK_STREAMS.makkah?.fallbackUrl || null,
    },
    madinah: {
      primary: isNative ? FALLBACK_STREAMS.madinah?.nativeUrl || '' : FALLBACK_STREAMS.madinah?.webUrl || '',
      fallback: FALLBACK_STREAMS.madinah?.fallbackUrl || null,
    },
  });
  const fallbackTriedRef = useRef<Record<StreamLocation, boolean>>({ makkah: false, madinah: false });
  const activeTabRef = useRef<StreamLocation>('makkah');
  // Fired when the video has been stuck waiting on data for too long (weak
  // connection with a drained buffer) — nudges hls.js back to life.
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NOTE: `streams` must be declared BEFORE anything reads it — the mirror
  // refs below read it during render. This exact ordering bug (streamsRef
  // above the useState) shipped a TDZ ReferenceError that crashed the whole
  // LiveStreams page ("Cannot access 'K' before initialization").
  const [streams, setStreams] = useState<Record<StreamLocation, StreamState>>(() => ({
    makkah: {
      channel: { name: FALLBACK_STREAMS.makkah?.name || 'Al-Quran Al-Kareem (Makkah)', url: streamUrlsRef.current.makkah.primary },
      isLoading: true, error: null, isPlaying: false, isBuffering: false, isRetrying: false,
    },
    madinah: {
      channel: { name: FALLBACK_STREAMS.madinah?.name || 'As-Sunnah (Madinah)', url: streamUrlsRef.current.madinah.primary },
      isLoading: true, error: null, isPlaying: false, isBuffering: false, isRetrying: false,
    },
  }));

  // Live mirror of `streams` so event handlers registered once (online/offline)
  // never read a stale mount-time closure.
  const streamsRef = useRef(streams);
  streamsRef.current = streams;

  const [activeTab, setActiveTab] = useState<StreamLocation>('makkah');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  // Volume/mute survive sessions — radio-style listening shouldn't re-ask
  // these every time the page opens.
  const [volume, setVolume] = useState(() => {
    const v = parseFloat(localStorage.getItem('live-stream-volume') || '');
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('live-stream-muted') === '1');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Quality state
  const [levels, setLevels] = useState<{ id: number, height: number, bitrate: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const current = streams[activeTab];
  const lowEnd = isLowEndDevice();

  /* ─── Controls auto-hide ─── */
  const scheduleHide = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  const showAndScheduleHide = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  /* ─── Track watch time ─── */
  const flushListenTime = useCallback(() => {
    if (playStartRef.current > 0) {
      const elapsed = Math.floor((Date.now() - playStartRef.current) / 1000);
      if (elapsed > 10) {
        const tab = activeTabRef.current;
        recordListeningTime(`live_${tab}`, `Live ${LOCATION_META[tab].label}`, elapsed);
      }
      playStartRef.current = 0;
    }
  }, []);

  /* ─── Destroy HLS ─── */
  const destroyHLS = useCallback(() => {
    flushListenTime();
    if (pinTimerRef.current) { clearTimeout(pinTimerRef.current); pinTimerRef.current = null; }
    if (stallTimerRef.current) { clearTimeout(stallTimerRef.current); stallTimerRef.current = null; }
    const video = videoRef.current;
    if (video) { video.pause(); video.src = ''; video.load(); }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  /* ─── Auto-retry with backoff (weak-internet friendly: 5 attempts, up to
         30 s apart — 3 × 8 s used to give up while the network was still
         recovering) ─── */
  const scheduleRetry = useCallback((tab: StreamLocation) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const attempt = retryCountRef.current[tab] || 0;
    if (attempt >= 5) return;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    retryCountRef.current[tab] = attempt + 1;
    setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isRetrying: true } }));
    retryTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      // The user may have switched Makkah/Madinah while the backoff was
      // pending — never attach the OLD tab's stream to the shared element.
      if (tab !== activeTabRef.current) return;
      const urls = streamUrlsRef.current[tab];
      const url = fallbackTriedRef.current[tab] && urls.fallback ? urls.fallback : urls.primary;
      if (url) initHLS(url, tab);
    }, delay);
  }, []);

  /* ─── Init HLS ─── */
  const initHLS = useCallback((url: string, tab: StreamLocation) => {
    const video = videoRef.current;
    if (!video) return;

    destroyHLS();
    setStreams(prev => ({
      ...prev,
      [tab]: { ...prev[tab], isLoading: true, error: null, isPlaying: false, isBuffering: false, isRetrying: false },
    }));

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: !lowEnd,
        // LL-HLS requires server-side partial-segment support. The SBA
        // Globecast/Akamai origin serves standard HLS; running lowLatencyMode
        // against it causes brief garbled ("gibberish") audio at segment
        // boundaries until the buffer resyncs, so it stays off.
        lowLatencyMode: false,
        capLevelToPlayerSize: false, // Let user or Auto handle it
        backBufferLength: 30, // Keep some history
        maxBufferLength: 60, // aggressive buffer for stability
        maxMaxBufferLength: 120,
        // Start the bandwidth estimate LOW on first playback: on weak mobile
        // connections the default (500 kbps) starts at a high rendition and
        // stalls immediately; starting small ramps up smoothly instead.
        abrEwmaDefaultEstimate: 250000,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 5,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 5,
        startLevel: -1, // Auto by default
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        retryCountRef.current[tab] = 0;

        // Extract available quality levels
        if (data.levels && data.levels.length > 0) {
          const formattedLevels = data.levels.map((l, i) => ({
            id: i,
            height: l.height || 0,
            bitrate: l.bitrate || 0
          }));
          setLevels(formattedLevels);
          setCurrentLevel(hls.currentLevel); // usually -1 (auto)
        } else {
          setLevels([]);
        }

        setStreams(prev => ({
          ...prev,
          [tab]: { ...prev[tab], isLoading: false, isBuffering: false, isPlaying: true },
        }));
        playStartRef.current = Date.now();
        video.play().catch(() => {
          setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isPlaying: false } }));
          playStartRef.current = 0;
        });
      });

      /* ── Media-error recovery (fixes the "audio repeats the same words" glitch).
         recoverMediaError() rebuilds the MSE buffers; if playback resumes from the
         current FRAGMENT boundary instead of the exact pre-error position, the
         last spoken phrase is heard again. We therefore pin the position after
         the first buffered fragment, resume the element if the re-attach left it
         paused, and rate-limit recoveries so a decode loop cannot rapid-fire
         phrase replays. */
      let mediaRecoveryAttempts = 0;
      let lastRecoveryAt = 0;
      const runMediaRecovery = (swapCodec: boolean) => {
        const since = Date.now() - lastRecoveryAt;
        if (since < 3000) {
          // Too soon after the previous recovery — wait out the cooldown.
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            runMediaRecovery(swapCodec);
          }, 3100 - since);
          return;
        }
        lastRecoveryAt = Date.now();
        const pinnedAt = video.currentTime;
        let pinned = false;
        const pinPosition = () => {
          if (pinned || !mountedRef.current) return;
          pinned = true;
          // Recovery landed — give the rate-limiter a fresh budget so a much
          // later media error can still use cheap recovery.
          mediaRecoveryAttempts = 0;
          if (pinnedAt > 0 && Math.abs(video.currentTime - pinnedAt) > 0.25) {
            try { video.currentTime = pinnedAt; } catch { /* not seekable yet — hls resumes from lastCurrentTime */ }
          }
          if (video.paused && !video.ended && !video.error) {
            video.play().catch(() => { /* autoplay policy — user can tap play */ });
          }
        };
        hls.once(Hls.Events.FRAG_BUFFERED, pinPosition);
        // Tracked timer: cleared on destroy/re-init so a pending pin can never
        // fire against a different (fresh) stream and rewind it.
        if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
        pinTimerRef.current = setTimeout(pinPosition, 3000); // fallback if no fragment buffers (e.g. live edge shift)
        if (swapCodec) hls.swapAudioCodec();
        hls.recoverMediaError();
      };

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        
        switch (data.type) {
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Fix catastrophic infinite loop on weak WiFi
            if (mediaRecoveryAttempts < 3) {
              mediaRecoveryAttempts++;
              console.warn('Recovering media error...');
              runMediaRecovery(false);
            } else if (mediaRecoveryAttempts < 6) {
              mediaRecoveryAttempts++;
              console.warn('Swapping audio codec and recovering...');
              runMediaRecovery(true);
            } else {
              fallbackOrError(tab);
            }
            break;
          case Hls.ErrorTypes.NETWORK_ERROR:
            fallbackOrError(tab);
            break;
          default:
            fallbackOrError(tab);
            break;
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDING, () =>
        setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isBuffering: true } })));
      hls.on(Hls.Events.BUFFER_APPENDED, () =>
        setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isBuffering: false } })));

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setCurrentLevel(data.level);
      });

      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari): named handlers so they can be REMOVED before each
      // (re)init — the old anonymous {once:true} listener leaked across re-inits
      // when metadata never fired, and <video> `error` was never handled (frozen
      // UI instead of fallback). Empty-src guard prevents destroyHLS's
      // video.src='' from tripping the error path.
      const onLoadedMetadata = () => {
        cleanupVideoHandlers();
        setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isLoading: false, isPlaying: true } }));
        playStartRef.current = Date.now();
        video.play().catch(() => { playStartRef.current = 0; });
      };
      const onVideoError = () => {
        if (!video.currentSrc || video.currentSrc === '') return; // teardown artefact, not a real failure
        cleanupVideoHandlers();
        fallbackOrError(tab);
      };
      const cleanupVideoHandlers = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onVideoError);
      };
      cleanupVideoHandlers();
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onVideoError);
      video.src = url;
      video.load();
    } else {
      setStreams(prev => ({
        ...prev,
        [tab]: { ...prev[tab], error: 'HLS not supported in this browser.', isLoading: false },
      }));
    }
  }, [destroyHLS, scheduleRetry, lowEnd]);

  /* ─── On fatal error: try fallback once, then friendly error + Retry ─── */
  const fallbackOrError = useCallback((tab: StreamLocation) => {
    const urls = streamUrlsRef.current[tab];
    if (urls?.fallback && !fallbackTriedRef.current[tab]) {
      fallbackTriedRef.current[tab] = true;
      retryCountRef.current[tab] = 0;
      console.warn(`[IslamicStreamPlayer] ${tab} primary failed, switching to fallback stream...`);
      initHLS(urls.fallback, tab);
    } else {
      flushListenTime();
      setStreams(prev => ({
        ...prev,
        [tab]: { ...prev[tab], error: 'Stream temporarily unavailable. Please try again later.', isLoading: false, isBuffering: false, isPlaying: false, isRetrying: false },
      }));
      destroyHLS();
      scheduleRetry(tab);
    }
  }, [initHLS, destroyHLS, scheduleRetry, flushListenTime]);

  /* ─── Online/Offline Monitor ─── */
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      const tab = activeTabRef.current;
      const url = streamUrlsRef.current[tab];
      const tabUrl = fallbackTriedRef.current[tab] && url.fallback ? url.fallback : url.primary;
      // Backoff attempts burned while offline shouldn't count against the
      // fresh connection, and the pending offline timer is already cleared.
      retryCountRef.current[tab] = 0;
      // streamsRef (live mirror) instead of the stale mount-time `streams` —
      // the old closure always read error:null so reconnect-on-online never ran.
      if (tabUrl && streamsRef.current[tab]?.error) initHLS(tabUrl, tab);
    };
    const goOffline = () => {
      setIsOnline(false);
      // Retrying into a dead network only burns the backoff budget and flips
      // the UI between error/reconnecting. Pause and wait for 'online'.
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      setStreams(prev => {
        const t = activeTabRef.current;
        return prev[t].isRetrying ? { ...prev, [t]: { ...prev[t], isRetrying: false } } : prev;
      });
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* ─── Stall watchdog (weak internet): when the buffer drains, the <video>
         element fires 'waiting' and can sit there forever if hls.js' loader
         gave up quietly. If we stay data-starved for 10 s while playback is
         expected, nudge the loader; if another 8 s gets nowhere, escalate to
         the fallback/error path. The video events also give a more accurate
         buffering pill than the BUFFER_APPENDING events alone. ─── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const clearStall = () => {
      if (stallTimerRef.current) { clearTimeout(stallTimerRef.current); stallTimerRef.current = null; }
    };
    const onWaiting = () => {
      const tab = activeTabRef.current;
      setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isBuffering: true } }));
      if (stallTimerRef.current) return; // watchdog already armed
      stallTimerRef.current = setTimeout(() => {
        stallTimerRef.current = null;
        const hls = hlsRef.current;
        const stalledTab = activeTabRef.current;
        if (video.paused || !hls) return; // paused = user action, not a stall
        console.warn('[IslamicStreamPlayer] stall watchdog: nudging hls.js to resume loading');
        try { hls.startLoad(-1); } catch { /* loader already mid-flight */ }
        stallTimerRef.current = setTimeout(() => {
          stallTimerRef.current = null;
          if (!video.paused && video.readyState < 3) fallbackOrError(stalledTab);
        }, 8000);
      }, 10000);
    };
    const onDataFlowing = () => {
      clearStall();
      const tab = activeTabRef.current;
      setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isBuffering: false } }));
    };
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onDataFlowing);
    video.addEventListener('canplay', onDataFlowing);
    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onDataFlowing);
      video.removeEventListener('canplay', onDataFlowing);
      clearStall();
    };
  }, [fallbackOrError]);

  /* ─── Mounted ref cleanup ─── */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      flushListenTime();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [flushListenTime]);

  /* ─── Stream lifecycle: the [activeTab] effect initialises on mount too, so
         no separate mount-init is needed (running both caused a double
         initHLS race — instance A created then immediately destroyed — which
         could glitch the first seconds of audio). ─── */

  /* ─── Switch tab → init new stream ─── */
  useEffect(() => {
    activeTabRef.current = activeTab;
    fallbackTriedRef.current[activeTab] = false;
    const url = streamUrlsRef.current[activeTab].primary;
    if (url) initHLS(url, activeTab);
    return () => {
      // Kill any pending retry/pin from THIS tab before tearing down — they
      // must never fire against the next tab's stream.
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      destroyHLS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ─── Apply persisted volume/mute to the element once on mount ─── */
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = isMuted ? 0 : volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Fullscreen listener ─── */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  /* ─── Recalc video size when fullscreen state / orientation changes ─── */
  useEffect(() => {
    if (!isFullscreen) return;
    const recalc = () => {
      const video = videoRef.current;
      if (!video) return;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
    };
    recalc();
    const t = setTimeout(recalc, 100);
    window.addEventListener('resize', recalc);
    window.addEventListener('orientationchange', recalc);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', recalc);
      window.removeEventListener('orientationchange', recalc);
    };
  }, [isFullscreen]);

  /* ─── Controls ─── */
  const handleRetry = useCallback(() => {
    // "Try now" must cancel any pending auto-retry backoff first, or the old
    // timer fires mid-reconnect and tears down the fresh stream.
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    const url = streamUrlsRef.current[activeTab].primary;
    if (url) {
      fallbackTriedRef.current[activeTab] = false;
      retryCountRef.current[activeTab] = 0;
      setStreams(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], error: null, isLoading: true, isRetrying: false } }));
      initHLS(url, activeTab);
    }
  }, [activeTab, initHLS]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setStreams(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], isPlaying: true } }));
      playStartRef.current = Date.now();
    } else {
      v.pause();
      flushListenTime();
      setStreams(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], isPlaying: false } }));
    }
  }, [activeTab, flushListenTime]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isMuted) { v.volume = volume || 1; setIsMuted(false); localStorage.setItem('live-stream-muted', '0'); }
    else { v.volume = 0; setIsMuted(true); localStorage.setItem('live-stream-muted', '1'); }
  }, [isMuted, volume]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    localStorage.setItem('live-stream-volume', String(val));
    if (videoRef.current) videoRef.current.volume = val;
    if (val > 0 && isMuted) { setIsMuted(false); localStorage.setItem('live-stream-muted', '0'); }
  }, [isMuted]);

   const toggleFullscreen = useCallback(async () => {
     const el = containerRef.current;
     if (!el) return;
     try {
       if (!isFullscreen) {
         await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
         if (Capacitor.isNativePlatform()) {
           document.documentElement.requestFullscreen?.();
           (screen.orientation as any)?.lock?.('landscape').catch(() => {});
         }
       } else {
         await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
         if (Capacitor.isNativePlatform()) {
           document.exitFullscreen?.();
           (screen.orientation as any)?.unlock?.();
         }
       }
     } catch (error) {
       // Handle error if needed
     }
   }, [isFullscreen]);

   const handleQualityChange = useCallback((levelId: number) => {
     if (hlsRef.current) {
       hlsRef.current.currentLevel = levelId;
       setCurrentLevel(levelId);
     }
     setShowQualityMenu(false);
   }, []);

  return (
    <div
      ref={containerRef}
      className={`select-none w-full text-white rounded-[28px] overflow-hidden bg-[#080c14] shadow-2xl border border-white/8 ${isFullscreen ? 'fixed top-0 left-0 rounded-none flex flex-col' : 'relative'}`}
      style={isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#000',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : undefined}
      onMouseMove={showAndScheduleHide}
      onTouchStart={showAndScheduleHide}
    >
      {/* ── Location Switcher ── */}
      <div className="flex items-center gap-1 p-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/6 backdrop-blur-md border border-white/8 flex-1">
          {(['makkah', 'madinah'] as StreamLocation[]).map(loc => {
            const m = LOCATION_META[loc];
            const active = activeTab === loc;
            return (
              <button
                key={loc}
                onClick={() => setActiveTab(loc)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  active
                    ? 'text-white shadow-lg'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={active ? { background: `linear-gradient(135deg, ${m.color}cc, ${m.color}88)` } : {}}
              >
                <span className="text-xs font-black tracking-wide uppercase">{m.label}</span>
                <span className="text-xs font-normal opacity-80 font-arabic">{m.arabic}</span>
              </button>
            );
          })}
        </div>

        {/* Live badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ml-2 transition-all ${
          current.isPlaying
            ? 'bg-red-500/20 border-red-500/40 text-red-400'
            : 'bg-white/6 border-white/10 text-white/40'
        }`}>
          <span className={`w-2 h-2 rounded-full ${current.isPlaying ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
          LIVE
        </div>
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ml-1 bg-amber-500/20 border-amber-500/40 text-amber-400 shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
            OFFLINE
          </div>
        )}
      </div>

      {/* ── Video Area ── */}
      <div
        className={`relative w-full bg-black ${isFullscreen ? 'h-full' : ''}`}
        style={isFullscreen ? { aspectRatio: 'auto', flex: 1 } : { aspectRatio: '16/9' }}
        onClick={() => { if (!current.isLoading && !current.error) { togglePlay(); showAndScheduleHide(); } }}
      >
        <video
          ref={videoRef}
          className={`${isFullscreen ? 'absolute inset-0' : 'relative'} w-full h-full object-contain`}
          style={isFullscreen ? { width: '100%', height: '100%', objectFit: 'contain' } : undefined}
          playsInline
          muted={isMuted}
        />

        {/* NOTE: no decorative glow overlays here — they sat on top of the live
            video, and on devices where reduce-blur strips `filter` (see index.css),
            the blurred discs rendered as hard-edged light circles over the stream. */}

        {/* Loading overlay */}
        {current.isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-[3px] border-white/10" />
              <div className="absolute inset-0 rounded-full border-[3px] border-t-emerald-400 animate-spin" />
              <Radio className="absolute inset-0 m-auto w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <p className="text-white/60 text-sm font-medium">Connecting to sacred stream…</p>
          </div>
        )}

        {/* Buffering overlay */}
        {current.isBuffering && !current.isLoading && (
          <div className="absolute top-3 right-3">
            <div className="bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="text-xs text-white/70 font-medium">Buffering</span>
            </div>
          </div>
        )}

        {/* Error overlay — two flavours: auto-reconnecting (weak network) or
            a dead stream the user must manually retry. */}
        {current.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-sm p-6">
            {current.isRetrying ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-white font-semibold">Reconnecting…</p>
                  <p className="text-white/50 text-sm max-w-xs">{current.error}</p>
                  <p className="text-white/40 text-xs">The stream resumes automatically — no need to tap anything.</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleRetry(); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors border border-white/15"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try now
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <WifiOff className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-white font-semibold">Stream Unavailable</p>
                  <p className="text-white/50 text-sm max-w-xs">{current.error}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleRetry(); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </>
            )}
          </div>
        )}

        {/* Center play button — shows when paused and loaded */}
        {!current.isLoading && !current.error && !current.isPlaying && showControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-18 h-18 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center w-20 h-20">
              <Play className="w-9 h-9 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Channel name toast */}
        {current.channel?.name && current.isPlaying && showControls && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
              <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-white/80 font-medium">{current.channel.name}</span>
            </div>
          </div>
        )}

        {/* ── Bottom Controls Bar ── */}
        <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || !current.isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-8 pb-4">
            <div className="flex items-center justify-between gap-3">

              {/* Left: Play + Volume */}
              <div className="flex items-center gap-3">
                <button
                  onClick={e => { e.stopPropagation(); togglePlay(); }}
                  disabled={current.isLoading}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  {current.isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : current.isPlaying
                      ? <Pause className="w-5 h-5" />
                      : <Play className="w-5 h-5 ml-0.5" />
                  }
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); toggleMute(); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {isMuted || volume === 0
                      ? <VolumeX className="w-4 h-4 text-white/70" />
                      : <Volume2 className="w-4 h-4 text-white/70" />
                    }
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    onClick={e => e.stopPropagation()}
                    className="w-20 h-1 accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right: Quality + Fullscreen */}
              <div className="flex items-center gap-3">
                {levels.length > 1 && (
                  <div className="relative">
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-32 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden flex flex-col z-50 py-1 shadow-2xl">
                        <button
                          onClick={e => { e.stopPropagation(); handleQualityChange(-1); }}
                          className={`px-3 py-2 text-xs font-semibold text-left hover:bg-white/10 transition-colors ${currentLevel === -1 ? 'text-emerald-400' : 'text-white'}`}
                        >
                          Auto
                        </button>
                        {levels.map(l => (
                          <button
                            key={l.id}
                            onClick={e => { e.stopPropagation(); handleQualityChange(l.id); }}
                            className={`px-3 py-2 text-xs font-semibold text-left hover:bg-white/10 transition-colors ${currentLevel === l.id ? 'text-emerald-400' : 'text-white'}`}
                          >
                            {l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1024)}kbps`}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setShowQualityMenu(p => !p); showAndScheduleHide(); }}
                      className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-xs font-bold tracking-wide"
                    >
                      {(() => {
                        const activeHeight = currentLevel >= 0
                          ? levels.find(l => l.id === currentLevel)?.height
                          : undefined;
                        if (currentLevel === -1) return activeHeight ? `AUTO · ${activeHeight}p` : 'AUTO';
                        return activeHeight ? `${activeHeight}P` : 'HQ';
                      })()}
                    </button>
                  </div>
                )}
                
                <button
                  onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4 text-white/70" /> : <Maximize className="w-4 h-4 text-white/70" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
