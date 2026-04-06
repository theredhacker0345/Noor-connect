import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, MapPin, Bell, BellOff, Smartphone, Globe, AlertTriangle, RefreshCw, Settings, Info } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { permissionManager, type PermissionType, type PermissionInfo } from '@/lib/permission-manager';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { GeolocationService } from '@/lib/geolocation-service';

interface PermissionManagerProps {
  className?: string;
}

const PermissionManager = ({ className }: PermissionManagerProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<Map<PermissionType, PermissionInfo>>(new Map());
  const [loading, setLoading] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'mobile' | 'web'>('web');

  useEffect(() => {
    setPlatform(Capacitor.isNativePlatform() ? 'mobile' : 'web');
    loadPermissions();

    const unsubscribe = permissionManager.subscribe(() => {
      loadPermissions();
    });

    return () => unsubscribe();
  }, []);

  const loadPermissions = async () => {
    const allPermissions = await permissionManager.getAllPermissions();
    const permissionMap = new Map<PermissionType, PermissionInfo>();
    allPermissions.forEach(p => permissionMap.set(p.type, p));
    setPermissions(permissionMap);
  };

  const handleRequestPermission = async (type: PermissionType) => {
    setLoading(type);
    try {
      const success = await permissionManager.requestPermission(type);
      
      if (success) {
        toast({
          title: 'Permission Granted',
          description: `The ${type} permission has been successfully granted.`,
        });
      } else {
        // Additional handling for denied permissions
        if (type === 'location') {
          await GeolocationService.requestPermissions();
        } else if (type === 'notifications') {
          if (Capacitor.isNativePlatform()) {
            await LocalNotifications.requestPermissions();
          } else if ('Notification' in window) {
            await Notification.requestPermission();
          }
        }

        toast({
          title: 'Permission Required',
          description: `Please enable ${type} permissions in your device settings to use this feature.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while requesting permission.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      loadPermissions();
    }
  };

  const handleOpenSettings = async (type: PermissionType) => {
    permissionManager.openSettings(type);
  };

  const getStatusIcon = (status: PermissionInfo['status']) => {
    switch (status) {
      case 'granted':
        return <ShieldCheck className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <ShieldOff className="w-5 h-5 text-red-500" />;
      case 'prompt':
      case 'prompt-with-rationale':
        return <Shield className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: PermissionInfo['status']) => {
    switch (status) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'prompt':
      case 'prompt-with-rationale':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Action Needed</Badge>;
      case 'not-supported':
        return <Badge variant="secondary">Not Supported</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const locationPermission = permissions.get('location');
  const notificationPermission = permissions.get('notifications');

  return (
    <Card className={`p-4 space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Privacy & Permissions</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Noor Connect is privacy-first. We only request permissions necessary for core features like prayer times and notifications. All data stays on your device.
      </p>

      {/* Location Permission */}
      <div className="space-y-3 p-3 rounded-lg border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">{locationPermission?.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {locationPermission?.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(locationPermission?.status || 'prompt')}
                {getStatusBadge(locationPermission?.status || 'prompt')}
              </div>
            </div>

            {locationPermission?.status === 'granted' && (
              <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-md">
                ✅ Accurate Prayer Times & Qibla Enabled
              </div>
            )}

            {locationPermission?.status === 'denied' && (
              <div className="space-y-2">
                <div className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-md">
                  ❌ Location Access Denied
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Why Location Needed:</p>
                  <ul className="list-disc list-inside space-y-1 ml-3">
                    {locationPermission?.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {locationPermission?.status === 'prompt' && (
              <div className="space-y-2">
                <div className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-md">
                  ⚠️ Location Needed
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleRequestPermission('location')}
                  disabled={loading === 'location'}
                  className="w-full"
                >
                  {loading === 'location' ? (
                    <>
                      <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 me-2" />
                      Enable Location
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Platform-specific instructions */}
        {locationPermission?.status === 'denied' && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border/50">
            <div className="flex items-start gap-2 mb-2">
              {platform === 'mobile' ? (
                <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {platform === 'mobile' ? 'Mobile App Instructions:' : 'Browser Instructions:'}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
              <strong>How to Fix:</strong> {locationPermission?.instructions?.[platform] || 'Check your device settings'}
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {platform === 'web' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestPermission('location')}
                    className="w-full"
                  >
                    <MapPin className="w-4 h-4 me-2" />
                    Request Location Again
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenSettings('location')}
                className="w-full"
              >
                <Settings className="w-4 h-4 me-2" />
                Open {platform === 'mobile' ? 'App Settings' : 'Browser Settings'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Permission */}
      <div className="space-y-3 p-3 rounded-lg border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">{notificationPermission?.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {notificationPermission?.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(notificationPermission?.status || 'prompt')}
                {getStatusBadge(notificationPermission?.status || 'prompt')}
              </div>
            </div>

            {notificationPermission?.status === 'granted' && (
              <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-md">
                ✅ Notifications Enabled
              </div>
            )}

            {notificationPermission?.status === 'denied' && (
              <div className="space-y-2">
                <div className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-md">
                  ❌ Notifications Denied
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Why Notifications Needed:</p>
                  <ul className="list-disc list-inside space-y-1 ml-3">
                    {notificationPermission?.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {notificationPermission?.status === 'prompt' && (
              <div className="space-y-2">
                <div className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-md">
                  ⚠️ Notifications Needed
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleRequestPermission('notifications')}
                  disabled={loading === 'notifications'}
                  className="w-full"
                >
                  {loading === 'notifications' ? (
                    <>
                      <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 me-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
              </div>
            )}

            {notificationPermission?.status === 'not-supported' && (
              <div className="bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded-md">
                ❌ Notifications Not Supported
              </div>
            )}
          </div>
        </div>

        {/* Platform-specific instructions */}
        {notificationPermission?.status === 'denied' && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border/50">
            <div className="flex items-start gap-2 mb-2">
              {platform === 'mobile' ? (
                <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {platform === 'mobile' ? 'Mobile Notification Instructions:' : 'Web Notification Instructions:'}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
              <strong>How to Fix:</strong> {notificationPermission?.instructions?.[platform] || 'Check your device settings'}
            </div>
            <div className="space-y-2 mt-2">
              {platform === 'web' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleRequestPermission('notifications');
                    }}
                    className="w-full"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Request Permission
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if ((window as any).chrome) {
                        window.open('chrome://settings/content/notifications');
                      } else if ((window as any).mozInnerScreenX !== undefined) {
                        window.open('about:preferences#privacy');
                      } else if ((window as any).safari) {
                        toast({
                          title: 'Safari Settings',
                          description: 'Go to Safari > Preferences > Websites > Notifications',
                        });
                      } else {
                        toast({
                          title: 'Browser Settings',
                          description: 'Click lock icon in your browser address bar and allow notifications',
                        });
                      }
                    }}
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 me-2" />
                    Open Browser Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Test notification to show current status
                      if ('Notification' in window) {
                        const testNotification = new Notification('Test Notification', {
                          body: 'This is a test notification from Noor Connect',
                          icon: '/favicon.ico'
                        });
                        setTimeout(() => testNotification.close(), 3000);
                        toast({
                          title: 'Test Notification Sent',
                          description: 'If you don\'t see this, please enable notifications in browser settings',
                        });
                      } else {
                        toast({
                          title: 'Notifications Not Supported',
                          description: 'Your browser does not support notifications',
                          variant: 'destructive'
                        });
                      }
                    }}
                    className="w-full"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Test Notification
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenSettings('notifications')}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Open {platform === 'mobile' ? 'Notification Settings' : 'Browser Settings'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Overall Status */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Permission Summary</h4>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-background rounded border">
            <span>Platform:</span>
            <span className="font-medium">{platform === 'mobile' ? 'Mobile App' : 'Web App'}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background rounded border">
            <span>Overall Status:</span>
            <span className={`font-medium ${
              Array.from(permissions.values()).every(p => p.status === 'granted') 
                ? 'text-green-600' 
                : Array.from(permissions.values()).some(p => p.status === 'denied')
                ? 'text-red-600' 
                : 'text-amber-600'
            }`}>
              {Array.from(permissions.values()).every(p => p.status === 'granted') 
                ? 'All Permissions Granted' 
                : Array.from(permissions.values()).some(p => p.status === 'denied')
                ? 'Some Permissions Denied' 
                : 'Action Needed'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PermissionManager;
