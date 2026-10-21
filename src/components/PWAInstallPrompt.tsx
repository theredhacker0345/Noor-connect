import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Smartphone } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

const FDROID_URL = 'https://f-droid.org/en/packages/com.noorconnect.app/';

export function PWAInstallPrompt() {
  const { t } = useI18n();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.();
      setIsInstalled(isStandalone || isInWebAppiOS || isCapacitor);
      setIsNativeApp(!!isCapacitor);
    };

    checkPlatform();

    const timer = setTimeout(() => {
      checkPlatform();
      if (!isInstalled) {
        setShowPrompt(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleInstallClick = () => {
    window.open(FDROID_URL, '_blank', 'noopener,noreferrer');
    setShowPrompt(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isNativeApp || isInstalled || !showPrompt || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up-fade">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground mb-1">
              {t('pwaGetAndroidApp')}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('pwaFdrDesc')}
            </p>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleInstallClick}
                className="flex items-center gap-1 text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                {t('pwaGetOnFdroid')}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-xs"
              >
                {t('pwaMaybeLater')}
              </Button>
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="flex-shrink-0 h-6 w-6"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
