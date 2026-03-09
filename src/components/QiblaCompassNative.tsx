import { useCallback, useEffect, useMemo, useState } from "react";
import { Compass, Loader2, LocateFixed, MapPin, RefreshCw, TriangleAlert, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import { nativeQiblaService, type QiblaDirectionData } from "@/lib/native-qibla-service";
import {
  calculateDistanceToKaabaKm,
  getCardinalDirection,
  normalizeDegrees
} from "@/lib/qibla";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const ALIGNMENT_THRESHOLD_DEG = 5; // Tighter tolerance for premium feel
const KAABA_COORDINATES = { latitude: 21.4225, longitude: 39.8262 };

export default function QiblaCompassNative() {
  const { t: ti18n } = useI18n();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [qiblaData, setQiblaData] = useState<QiblaDirectionData | null>(null);
  const [compassState, setCompassState] = useState<"idle" | "activating" | "active" | "error">("idle");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [hasVibrated, setHasVibrated] = useState(false);

  const startCompass = useCallback(async () => {
    try {
      setCompassState("activating");
      const result = await nativeQiblaService.startCompass();
      if (result.success) {
        setCompassState("active");
      } else {
        setCompassState("error");
        setLocationError(result.message);
      }
    } catch (error) {
      setCompassState("error");
      setLocationError(error instanceof Error ? error.message : "Sensor error");
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = nativeQiblaService.onQiblaDirectionChange((data) => {
      setQiblaData(data);
      if (data.latitude && data.longitude) {
        setDistanceKm(calculateDistanceToKaabaKm(data.latitude, data.longitude));
      }
    });

    return () => {
      unsubscribe();
      nativeQiblaService.stopCompass();
    };
  }, [startCompass]);

  const isAligned = useMemo(() => {
    if (!qiblaData) return false;
    const diff = Math.abs(normalizeDegrees(qiblaData.compassAngle - qiblaData.qiblaBearing));
    return diff <= ALIGNMENT_THRESHOLD_DEG;
  }, [qiblaData]);

  // Handle Haptics on alignment
  useEffect(() => {
    if (isAligned && !hasVibrated && compassState === "active") {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => { });
      setHasVibrated(true);
    } else if (!isAligned) {
      setHasVibrated(false);
    }
  }, [isAligned, hasVibrated, compassState]);

  if (isLoadingLocation && compassState === "activating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-[#e0c097] opacity-50" />
          <div className="absolute inset-0 blur-xl bg-[#e0c097]/20 rounded-full animate-pulse" />
        </div>
        <p className="text-[#e0c097]/60 font-medium animate-pulse">Initializing Sensors...</p>
      </div>
    );
  }

  const dialRotation = qiblaData ? -qiblaData.compassAngle : 0;
  const qiblaNeedleRotation = qiblaData ? qiblaData.qiblaBearing : 0;

  return (
    <div className="px-5 py-6 space-y-8 max-w-lg mx-auto overflow-hidden">
      {/* Dynamic Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a237e] to-[#0d1b2a] rounded-3xl" />
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#e0c097]/10 rounded-full blur-3xl group-hover:bg-[#e0c097]/20 transition-all duration-700" />

        <div className="relative p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[#e0c097]/60 text-[10px] uppercase tracking-[0.2em] font-bold">Kaaba Direction</span>
            <h2 className="text-3xl font-black text-white">
              {qiblaData ? `${Math.round(qiblaData.qiblaBearing)}°` : "--°"}
              <span className="text-lg ml-2 text-[#e0c097] font-medium">
                {qiblaData ? getCardinalDirection(qiblaData.qiblaBearing) : ""}
              </span>
            </h2>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[#e0c097]/60 text-[10px] uppercase tracking-[0.2em] font-bold">Distance</span>
            <p className="text-xl font-bold text-white">
              {distanceKm ? `${Math.round(distanceKm).toLocaleString()} km` : "-- km"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Compass Area */}
      <div className="relative flex items-center justify-center">
        {/* Outer Glow Effect */}
        <AnimatePresence>
          {isAligned && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute w-80 h-80 bg-emerald-500/20 rounded-full blur-[60px]"
            />
          )}
        </AnimatePresence>

        {/* The Compass Dial */}
        <div className="relative w-80 h-80">
          {/* Static Outer Ring */}
          <div className="absolute inset-0 rounded-full border-[10px] border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-[#0f172a]/40 backdrop-blur-xl flex items-center justify-center">
            {/* Alignment indicator triangle at top */}
            <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[15px] border-x-transparent border-t-[20px] transition-colors duration-300 ${isAligned ? 'border-t-emerald-500' : 'border-t-[#e0c097]/40'}`} />
          </div>

          {/* Rotating Compass Dial */}
          <motion.div
            className="absolute inset-4 transition-all duration-100 ease-out"
            style={{ rotate: dialRotation }}
          >
            {/* Degree ticks and letters */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-white/40 fill-current">
              {Array.from({ length: 72 }).map((_, i) => {
                const angle = i * 5;
                const isMajor = angle % 30 === 0;
                const isCardinal = angle % 90 === 0;
                return (
                  <rect
                    key={angle}
                    x="49.5" y="2"
                    width={isMajor ? "1" : "0.5"}
                    height={isMajor ? "5" : "3"}
                    rx="0.5"
                    style={{ transformOrigin: '50% 50%', transform: `rotate(${angle}deg)` }}
                    className={isCardinal ? "text-[#e0c097] fill-[#e0c097]" : ""}
                  />
                );
              })}
              {/* Cardinal North Letter */}
              <text x="50" y="14" textAnchor="middle" fontSize="6" fontWeight="bold" className="fill-[#e0c097]">N</text>
              <text x="86" y="52" textAnchor="middle" fontSize="6" fontWeight="bold">E</text>
              <text x="50" y="90" textAnchor="middle" fontSize="6" fontWeight="bold">S</text>
              <text x="14" y="52" textAnchor="middle" fontSize="6" fontWeight="bold">W</text>
            </svg>

            {/* Qibla Needle (within the rotating frame) */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ rotate: qiblaNeedleRotation }}
            >
              {/* User requested Asset: qibla.png - The authentic compass look */}
              <div className="relative w-full h-full flex items-center justify-center p-8">
                <motion.img
                  src="/qibla.png"
                  alt="Qibla Pointer"
                  className={`w-full h-full object-contain transition-all duration-500 drop-shadow-[0_0_15px_rgba(224,192,151,0.3)] invert brightness-200 ${isAligned ? 'scale-110 drop-shadow-[0_0_25px_rgba(16,185,129,0.8)]' : 'scale-100'}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: isAligned ? 1.05 : 0.95 }}
                />

                {/* Kaaba Indicator Tag when Aligned */}
                {isAligned && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-[10%] flex flex-col items-center"
                  >
                    <div className="bg-emerald-500/90 backdrop-blur-md text-white border border-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg shadow-emerald-500/40">
                      KAABA
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Center Hub */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a237e] to-[#0d1b2a] border-4 border-white/20 shadow-2xl flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#e0c097]" />
            </div>
          </div>
        </div>
      </div>

      {/* Alignment Status Banner */}
      <AnimatePresence mode="wait">
        {isAligned ? (
          <motion.div
            key="aligned"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center text-center gap-2"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <p className="text-emerald-400 font-black text-xl tracking-tight">QIBLA ALIGNED</p>
            <p className="text-emerald-400/60 text-xs">You are now facing the Holy Kaaba</p>
          </motion.div>
        ) : (
          <motion.div
            key="adjust"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-sm font-semibold text-white">Adjust Position</span>
              </div>
              {qiblaData && (
                <span className="text-xs font-mono text-[#e0c097] px-2 py-1 bg-[#e0c097]/10 rounded-lg">
                  {Math.round(normalizeDegrees(qiblaData.qiblaBearing - qiblaData.compassAngle))}° Diff
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Hold your phone steady and rotate slowly until the Kaaba icon matches the top indicator.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-4 pb-4"
      >
        <Button
          variant="outline"
          onClick={startCompass}
          disabled={compassState === "activating"}
          className="h-16 rounded-3xl border-[#e0c097]/30 bg-[#e0c097]/5 hover:bg-[#e0c097]/10 text-[#e0c097] gap-3 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(224,192,151,0.05)] font-bold text-md"
        >
          {compassState === "activating" ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Calibrate
        </Button>
        <Button
          onClick={() => {
            setIsRefreshingLocation(true);
            setTimeout(() => {
              nativeQiblaService.stopCompass();
              startCompass();
              setIsRefreshingLocation(false);
            }, 1000);
          }}
          disabled={isRefreshingLocation}
          className="h-16 rounded-3xl bg-gradient-to-r from-[#e0c097] to-[#d6af7e] text-black hover:opacity-90 gap-3 transition-all active:scale-[0.98] shadow-[0_0_25px_rgba(224,192,151,0.3)] font-black text-md border-0"
        >
          {isRefreshingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
          GPS Refresh
        </Button>
      </motion.div>

      {/* Safety Alert */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
        <Info className="w-5 h-5 text-amber-500/50 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-slate-400/80 leading-normal">
          <span className="text-amber-500 font-bold block mb-1 uppercase tracking-widest">Accuracy Note</span>
          Ensure you are away from large metal objects or electrical equipment for the most accurate reading. Recalibrate if the needle feels inconsistent.
        </p>
      </div>
    </div>
  );
}
