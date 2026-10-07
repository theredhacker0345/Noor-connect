/**
 * Offline Prayer Times Component
 * Fallback when live streams are completely blocked
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Calendar, Volume2 } from "lucide-react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { formatPrayerTime } from "@/lib/time-formatter";
import { useTimeFormat } from "@/hooks/useTimeFormat";

type LocationKey = "makkah" | "madinah";

const LOCATION_INFO = {
    makkah: {
        name: "Masjid Al-Haram",
        coordinates: { lat: 21.4225, lng: 39.8262 },
        timezone: "Asia/Riyadh",
        description: "The Grand Mosque of Makkah"
    },
    madinah: {
        name: "Masjid An-Nabawi",
        coordinates: { lat: 24.4707, lng: 39.6124 },
        timezone: "Asia/Riyadh", 
        description: "The Prophet's Mosque in Madinah"
    }
};

export default function OfflinePrayerTimes({ location }: { location: LocationKey }) {
    const info = LOCATION_INFO[location];
    const { prayerTimes, isLoading } = usePrayerTimes();
    const [timeFormat] = useTimeFormat();

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <div className="text-center space-y-6 max-w-md">
                {/* Header */}
                <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{info.name}</h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                    <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Live Prayer Times
                    </Badge>
                </div>

                {/* Prayer Times */}
                {prayerTimes && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-background/50 rounded-lg p-3">
                                <div className="font-medium text-primary">Fajr</div>
                                <div className="text-lg font-bold">
                                    {prayerTimes.fajr ? formatPrayerTime(prayerTimes.fajr, timeFormat) : '--:--'}
                                </div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-3">
                                <div className="font-medium text-primary">Dhuhr</div>
                                <div className="text-lg font-bold">
                                    {prayerTimes.dhuhr ? formatPrayerTime(prayerTimes.dhuhr, timeFormat) : '--:--'}
                                </div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-3">
                                <div className="font-medium text-primary">Asr</div>
                                <div className="text-lg font-bold">
                                    {prayerTimes.asr ? formatPrayerTime(prayerTimes.asr, timeFormat) : '--:--'}
                                </div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-3">
                                <div className="font-medium text-primary">Maghrib</div>
                                <div className="text-lg font-bold">
                                    {prayerTimes.maghrib ? formatPrayerTime(prayerTimes.maghrib, timeFormat) : '--:--'}
                                </div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-3">
                                <div className="font-medium text-primary">Isha</div>
                                <div className="text-lg font-bold">
                                    {prayerTimes.isha ? formatPrayerTime(prayerTimes.isha, timeFormat) : '--:--'}
                                </div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-3">
                                <div className="font-medium text-primary">Sunrise</div>
                                <div className="text-lg font-bold">
                                    {prayerTimes.sunrise ? formatPrayerTime(prayerTimes.sunrise, timeFormat) : '--:--'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Audio Option */}
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Volume2 className="w-4 h-4" />
                        <span>Listen to Quran recitation</span>
                    </div>
                    <audio 
                        controls 
                        className="w-full max-w-xs mx-auto"
                        src="https://listen.quran.com/ar/khalefa/128.mp3"
                    >
                        Your browser does not support the audio element.
                    </audio>
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                    <p>Live stream unavailable in your network</p>
                    <p>Showing accurate prayer times for {info.name}</p>
                </div>
            </div>
        </div>
    );
}
