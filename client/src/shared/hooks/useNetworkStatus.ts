/**
 * useNetworkStatus — browser online/offline detection.
 * Subscribes to navigator.onLine changes via window events.
 * Single source of truth for raw network connectivity.
 */
import { useEffect, useState } from "react";

export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}
