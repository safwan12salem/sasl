/**
 * Sasl Region Governor — Multi-layer country verification
 * Checks IP, GPS, and SIM card to prevent VPN bypass
 */
export async function getDeviceCountry(): Promise<{
  ipCountry: string | null;
  gpsCountry: string | null;
  simCountry: string | null;
  resolvedCountry: string;
  isVpnDetected: boolean;
}> {
  let ipCountry: string | null = null;
  let gpsCountry: string | null = null;
  let simCountry: string | null = null;

  // 1. IP-based (fastest)
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    ipCountry = data.country_code || null;
  } catch {}

  // 2. GPS (requires location permission)
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    // Reverse geocode GPS to country
    const { latitude, longitude } = pos.coords;
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
    const data = await res.json();
    gpsCountry = data.countryCode || null;
  } catch {}

  // 3. SIM card (Android only via Capacitor)
  try {
    const { Capacitor } = (window as any);
    if (Capacitor?.getPlatform() === 'android') {
      const plugin = Capacitor?.Plugins?.Device || Capacitor?.getPlugin?.('Device');
      if (plugin) {
        const info = await plugin.getInfo();
        // Some Android devices expose SIM country via device info
        simCountry = (info as any)?.simCountry || null;
      }
    }
  } catch {}

  // Resolve: if all three disagree with IP, VPN is likely
  const allCountries = [ipCountry, gpsCountry, simCountry].filter(Boolean) as string[];
  const uniqueCountries = new Set(allCountries);
  const isVpnDetected = uniqueCountries.size > 1;
  
  // Use GPS first (hardest to fake), then SIM, then IP
  const resolvedCountry = gpsCountry || simCountry || ipCountry || 'UNKNOWN';

  return {
    ipCountry,
    gpsCountry,
    simCountry,
    resolvedCountry,
    isVpnDetected,
  };
}

export async function checkWaveMeshAccess(countryCode: string): Promise<{
  enabled: boolean;
  message: string;
  blocked: boolean;
}> {
  try {
    const apiBase = (window as any).REACT_APP_API_URL || 'https://sasl-api-i34r.onrender.com';
    const res = await fetch(`${apiBase}/api/mesh/check-access/?country=${countryCode}`);
    const data = await res.json();
    return {
      enabled: data.enabled,
      message: data.message || '',
      blocked: !data.enabled,
    };
  } catch {
    // If backend unreachable, allow WaveMesh (offline-first)
    return { enabled: true, message: 'Offline mode', blocked: false };
  }
}
