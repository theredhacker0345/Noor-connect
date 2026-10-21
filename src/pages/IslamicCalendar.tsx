// v2.0.3 - Fixed Missing useMemo import
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Moon, Star, ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { calendarApiResponseSchema, safeParseApiResponse } from "@/lib/api-schemas";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useNavigate } from "react-router-dom";
import { goBackOrFallback } from "@/lib/navigation";
import { useI18n } from "@/hooks/useI18n";

// Localized Hijri month names (index 0 = month 1 Muharram ... index 11 = month 12 Dhul Hijjah)
const HIJRI_MONTH_KEYS = [
  "hijriMuharram", "hijriSafar", "hijriRabiAwwal", "hijriRabiThani",
  "hijriJumadaAwwal", "hijriJumadaThani", "hijriRajab", "hijriShaban",
  "hijriRamadan", "hijriShawwal", "hijriDhulQidah", "hijriDhulHijjah",
];

// Jan 1 2023 was a Sunday — one fixed week for localized short weekday headers
const DAY_HEADER_DATES = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i));

const importantDates = [
  { nameKey: "evRamadan", icon: "🌙", descKey: "evRamadanDesc", color: "bg-primary/10 text-foreground border border-primary/20" },
  { nameKey: "evLaylatQadr", icon: "✨", descKey: "evLaylatQadrDesc", color: "bg-primary/20 text-foreground border border-primary/30" },
  { nameKey: "evEidFitr", icon: "🎉", descKey: "evEidFitrDesc", color: "bg-accent/10 text-foreground border border-accent/20" },
  { nameKey: "evEidAdha", icon: "🐑", descKey: "evEidAdhaDesc", color: "bg-secondary/20 text-foreground border border-primary/30" },
  { nameKey: "evDhulHijjah", icon: "🕋", descKey: "evDhulHijjahDesc", color: "bg-primary/15 text-foreground border border-primary/25" },
  { nameKey: "evMuharram", icon: "🌟", descKey: "evMuharramDesc", color: "bg-accent/15 text-foreground border border-accent/25" },
  { nameKey: "evAshura", icon: "⭐", descKey: "evAshuraDesc", color: "bg-secondary/25 text-foreground border border-primary/20" },
];

interface CalendarDay {
  hijriDay: number;
  hijriMonth: {
    number: number;
    en: string;
    ar: string;
  };
  hijriYear: number;
  gregorianDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  holidays: string[];
}

export default function IslamicCalendar() {
  const navigate = useNavigate();
  const { t, formatNumber, formatDate } = useI18n();
  // Use the Maghrib-aware hook (same as Dashboard) for the header date
  const { islamicInfo, isLoading: dateLoading } = useIslamicCalendar();

  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [monthData, setMonthData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetchMonthCalendar(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    const handleOffsetChange = () => fetchMonthCalendar(currentMonth, currentYear);
    window.addEventListener('hijri-date-offset-changed', handleOffsetChange);
    return () => window.removeEventListener('hijri-date-offset-changed', handleOffsetChange);
  }, [currentMonth, currentYear]);

  const fetchMonthCalendar = async (month: number, year: number) => {
    try {
      setLoading(true);
      const offset = parseInt(localStorage.getItem('hijri-date-offset') || '0', 10);
      const response = await fetch(
        `https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`
      );
      const rawData = await response.json();

      const parseResult = safeParseApiResponse(calendarApiResponseSchema, rawData);

      if (parseResult.success && parseResult.data.code === 200) {
        let dataToProcess = parseResult.data.data;
        
        if (offset !== 0) {
           dataToProcess = dataToProcess.map((dayData: any, index: number) => {
              const sourceIndex = index + offset;
              if (sourceIndex >= 0 && sourceIndex < dataToProcess.length) {
                 return { ...dayData, hijri: dataToProcess[sourceIndex].hijri };
              } else {
                 const newHijri = JSON.parse(JSON.stringify(dayData.hijri));
                 let newDay = parseInt(newHijri.day) + offset;
                 if (newDay <= 0) {
                    newDay = 30 + newDay;
                    newHijri.month.number -= 1;
                    if (newHijri.month.number === 0) {
                       newHijri.month.number = 12;
                       newHijri.year = (parseInt(newHijri.year) - 1).toString();
                    }
                 } else if (newDay > 30) {
                    newDay -= 30;
                    newHijri.month.number += 1;
                    if (newHijri.month.number === 13) {
                       newHijri.month.number = 1;
                       newHijri.year = (parseInt(newHijri.year) + 1).toString();
                    }
                 }
                 newHijri.day = newDay.toString().padStart(2, '0');
                 return { ...dayData, hijri: newHijri };
              }
           });
        }
        
        setMonthData(dataToProcess[0]);
        generateCalendarDays(dataToProcess);
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
      toast.error(t('failedToLoadCalendar'));
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (monthData: any[]) => {
    const days: CalendarDay[] = [];
    const today = new Date();

    if (monthData.length === 0) return;

    // Get the first day of the month to determine starting weekday
    const firstDayData = monthData[0];
    const firstDayDate = new Date(
      firstDayData.gregorian.year,
      firstDayData.gregorian.month.number - 1,
      firstDayData.gregorian.day
    );

    // Get weekday index (0 = Sunday, 1 = Monday, etc.)
    const firstWeekdayIndex = firstDayDate.getDay();

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstWeekdayIndex; i++) {
      days.push({
        hijriDay: 0,
        hijriMonth: { number: 0, en: "", ar: "" },
        hijriYear: 0,
        gregorianDate: '',
        isCurrentMonth: false,
        isToday: false,
        holidays: [],
      });
    }

    // Add the actual days of the month
    monthData.forEach((dayData: any) => {
      const gregorianDate = new Date(
        dayData.gregorian.year,
        dayData.gregorian.month.number - 1,
        dayData.gregorian.day
      );

      days.push({
        hijriDay: parseInt(dayData.hijri.day),
        hijriMonth: {
          number: dayData.hijri.month.number,
          en: dayData.hijri.month.en,
          ar: dayData.hijri.month.ar
        },
        hijriYear: parseInt(dayData.hijri.year),
        gregorianDate: `${dayData.gregorian.day} ${dayData.gregorian.month.en}`,
        isCurrentMonth: true,
        isToday: gregorianDate.toDateString() === today.toDateString(),
        holidays: dayData.hijri.holidays || [],
      });
    });

    setCalendarDays(days);
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day);
  };

  const closeDateModal = () => {
    setSelectedDate(null);
  };

  const hijriMonthHeader = useMemo(() => {
    if (calendarDays.length === 0) return "";
    const activeDays = calendarDays.filter(d => d.isCurrentMonth);
    const months = Array.from(new Set(activeDays.map(d => d.hijriMonth.number)));
    const years = Array.from(new Set(activeDays.map(d => d.hijriYear)));
    const monthLabel = (n: number) => (n >= 1 && n <= 12 ? t(HIJRI_MONTH_KEYS[n - 1]) : "");

    if (months.length === 1) return `${monthLabel(months[0])} ${years[0]}`;
    if (years.length === 1) return `${months.map(monthLabel).join(" / ")} ${years[0]}`;
    return `${monthLabel(months[0])} ${years[0]} / ${monthLabel(months[1])} ${years[1]}`;
  }, [calendarDays, t]);

  return (
    <div className="min-h-screen bg-background pt-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => goBackOrFallback(navigate, '/dashboard')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground tracking-tight">{t('islamicCalendar')}</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('hijriDates')}</p>
          </div>
        </div>

        {/* Current Islamic Date */}
        <Card className="bg-card elevation-4 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">{t('islamicCalendar')}</CardTitle>
            </div>
            <CardDescription>{t('todaysHijriDate')}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {dateLoading && (
              <div className="bg-gradient-primary rounded-xl p-6 space-y-3 text-primary-foreground min-h-[220px]">
                <div className="h-10 w-3/4 mx-auto bg-white/20 rounded animate-pulse" />
                <div className="h-9 w-4/5 mx-auto bg-white/15 rounded animate-pulse" />
                <div className="h-4 w-40 mx-auto bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-56 mx-auto bg-white/10 rounded animate-pulse" />
              </div>
            )}

            {!dateLoading && islamicInfo && (
              <>
                <div className="bg-gradient-primary rounded-xl p-6 space-y-2 text-primary-foreground">
                  <div className="text-4xl font-bold mb-2">
                    {islamicInfo.currentDate.hijri.day} {islamicInfo.currentDate.hijri.month.en} {islamicInfo.currentDate.hijri.year} {t('hijriEra')}
                  </div>
                  <div className="text-3xl quran-arabic mb-4" dir="rtl">
                    {islamicInfo.currentDate.hijri.day} {islamicInfo.currentDate.hijri.month.ar} {islamicInfo.currentDate.hijri.year}
                  </div>
                  <div className="opacity-90">
                    {islamicInfo.currentDate.hijri.weekday.en}
                  </div>
                  <div className="text-sm opacity-80 mt-2">
                    {t('gregorian')}: {formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Show holidays if any */}
                {islamicInfo.currentDate.hijri.holidays && islamicInfo.currentDate.hijri.holidays.length > 0 && (
                  <div className="bg-gradient-secondary rounded-lg p-4 border-2 border-accent">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold text-foreground">{t('specialDay')}</h3>
                    </div>
                    {islamicInfo.currentDate.hijri.holidays.map((holiday: string, index: number) => (
                      <p key={index} className="text-center text-foreground font-medium">
                        {holiday}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Full Calendar View */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-primary" />
                {hijriMonthHeader || (
                  <span className="inline-block h-5 w-40 bg-muted rounded animate-pulse" />
                )}
                {" "}{t('hijriEra')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                >
                  {t('today')}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {monthData && `${monthData.gregorian.month.en} ${monthData.gregorian.year}`}
              {!monthData && (
                <span className="inline-block h-4 w-28 bg-muted rounded animate-pulse" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>
            <div className="w-full overflow-x-auto sm:overflow-x-visible">
              <div className="grid grid-cols-7 gap-1 px-0.5 sm:px-0 sm:min-w-[320px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {/* Day headers (localized via Intl short weekday) */}
                {DAY_HEADER_DATES.map((date, i) => (
                  <div key={i} className="text-center font-semibold text-xs md:text-sm text-muted-foreground p-1 md:p-2">
                    {formatDate(date, { weekday: 'short' })}
                  </div>
                ))}

                {/* Calendar days */}
                {loading && (
                  Array.from({ length: 35 }).map((_, index) => (
                    <div
                      key={`cal-skel-${index}`}
                      className="aspect-square min-w-0 p-1 border border-border bg-card min-h-[40px]"
                    >
                      <div className="flex flex-col h-full min-w-0">
                        <div className="h-4 w-6 bg-muted rounded animate-pulse mb-1" />
                        <div className="h-3 w-12 bg-muted/70 rounded animate-pulse" />
                      </div>
                    </div>
                  ))
                )}

                {!loading && calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      aspect-square min-w-0 p-1 border border-border bg-card min-h-[40px] transition-colors
                      ${!day.isCurrentMonth ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-muted/50'}
                      ${day.isToday ? 'border-primary bg-primary/10' : ''}
                      ${day.holidays.length > 0 ? 'bg-accent/5' : ''}
                      ${day.hijriDay === 1 ? 'ring-1 ring-inset ring-primary/40 bg-primary/5' : ''}
                    `}
                    onClick={() => day.isCurrentMonth && handleDateClick(day)}
                  >
                    <div className="flex flex-col h-full min-w-0">
                      {day.isCurrentMonth ? (
                        <>
                          <div className="flex justify-between items-start mb-0.5 min-w-0">
                            <span className={`text-xs sm:text-sm md:text-base font-bold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                              {day.hijriDay}
                            </span>
                            {day.hijriDay === 1 && day.hijriMonth.number >= 1 && (
                              <span className="text-[0.5rem] font-bold text-primary uppercase leading-none mt-1 truncate max-w-[56%]">
                                {t(HIJRI_MONTH_KEYS[day.hijriMonth.number - 1])}
                              </span>
                            )}
                          </div>
                          <div className="text-[0.7rem] sm:text-xs text-muted-foreground mb-0.5 truncate min-w-0">
                            {day.gregorianDate}
                          </div>
                          {day.holidays.length > 0 && (
                            <div className="mt-auto">
                              {/* Mobile: show dot; Desktop/Tablet: show badges */}
                              <div className="hidden sm:block">
                                {day.holidays.map((holiday, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs sm:text-xs w-full mb-1 justify-center px-1 min-w-0"
                                  >
                                    {holiday.length > 10 ? `${holiday.substring(0, 10)}...` : holiday}
                                  </Badge>
                                ))}
                              </div>
                              <div className="sm:hidden flex justify-center">
                                <div className="w-1 h-1 rounded-full bg-primary/60 mt-1"></div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Details Modal */}
        {selectedDate && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeDateModal}
          >
            <div
              className="bg-card rounded-lg shadow-elegant max-w-sm w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t('islamicDateDetails')}</h3>
                  <Button variant="ghost" size="icon" onClick={closeDateModal}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hijri Date */}
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {selectedDate.hijriDay} {selectedDate.hijriMonth.en} {selectedDate.hijriYear} {t('hijriEra')}
                    </div>
                    <div className="text-xl quran-arabic" dir="rtl">
                      {selectedDate.hijriDay} {selectedDate.hijriMonth.ar} {selectedDate.hijriYear} {t('hijriEra')}
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    {selectedDate.gregorianDate}
                  </div>
                </div>

                {/* Holidays/Events */}
                {selectedDate.holidays.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      {t('eventsAndHolidays')}
                    </h4>
                    <div className="space-y-1">
                      {selectedDate.holidays.map((holiday, idx) => (
                        <Badge key={idx} variant="secondary" className="me-1 mb-1">
                          {holiday}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special note if today */}
                {selectedDate.isToday && (
                  <div className="text-center text-sm text-primary font-medium">
                    🌙 {t('today')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Important Islamic Dates */}
        <Card className="bg-card backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t('importantIslamicDates')}
            </CardTitle>
            <CardDescription>
              {t('keyEventsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {importantDates.map((event, index) => (
                <div
                  key={index}
                  className={`${event.color} rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{event.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{t(event.nameKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(event.descKey)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Islamic Months */}
        <Card className="bg-card backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              {t('islamicMonthsTitle')}
            </CardTitle>
            <CardDescription>
              {t('monthsOfHijriDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HIJRI_MONTH_KEYS.map((monthKey, index) => (
                <Badge
                  key={monthKey}
                  variant={islamicInfo?.currentDate.hijri.month.number === index + 1 ? "default" : "outline"}
                  className="justify-center py-2 text-sm"
                >
                  {formatNumber(index + 1)}. {t(monthKey)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
