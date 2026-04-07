import { AppBar } from "@/components/AppBar";
import QiblaCompassModern from "@/components/QiblaCompassModern";
import { PageTransition } from "@/components/PageTransition";
import { useLanguage } from "@/contexts/LanguageContext-new";

const Qibla = () => {
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <AppBar title={t("qibla") || "Qibla"} />
        <div className="flex flex-col min-h-[calc(100vh-64px)]">
          <div className="flex-grow">
            <QiblaCompassModern />
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60 px-6 pb-8 italic">
            The qibla feature is currently in development and may not be 100% accurate.
            Please use a physical compass for religious obligations.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Qibla;
