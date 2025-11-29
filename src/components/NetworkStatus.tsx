import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowAlert(false);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowAlert(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check Supabase connectivity
    const checkConnectivity = async () => {
      try {
        const response = await fetch('https://svyagwlpawpygjhkyjpd.supabase.co/rest/v1/', {
          method: 'HEAD',
          mode: 'no-cors',
        });
        setShowAlert(false);
      } catch (error) {
        setShowAlert(true);
      }
    };

    const interval = setInterval(checkConnectivity, 30000); // Check every 30 seconds
    checkConnectivity(); // Check immediately

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!showAlert && isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-amber-50 border-2 border-amber-400 rounded-lg shadow-lg p-4 flex items-start gap-3">
        {isOnline ? (
          <>
            <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 mb-1">
                Connection Issue
              </p>
              <p className="text-sm text-amber-800">
                Cannot reach Supabase server. This may be due to network restrictions in your environment.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Try: Refresh page, check firewall, or deploy to production
              </p>
            </div>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 mb-1">
                No Internet Connection
              </p>
              <p className="text-sm text-red-800">
                Please check your internet connection and try again.
              </p>
            </div>
          </>
        )}
        <button
          onClick={() => setShowAlert(false)}
          className="text-amber-600 hover:text-amber-800 font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
}
