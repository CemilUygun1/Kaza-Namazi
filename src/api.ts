import { City, District, PrayerTimesData } from './constants';
import { TURKEY_DATA } from './turkeyData';

async function fetchWithTimeout(url: string, headers: Record<string, string> = {}, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export function getCities(): City[] {
  return Object.entries(TURKEY_DATA)
    .map(([id, data]) => ({
      SehirID: id,
      SehirAdi: data.name,
      SehirAdiEn: data.nameEn,
    }))
    .sort((a, b) => a.SehirAdi.localeCompare(b.SehirAdi, 'tr'));
}

export function getDistricts(cityId: string): District[] {
  const city = TURKEY_DATA[cityId];
  if (!city) return [];
  return city.districts.map((d) => ({
    IlceID: d.id,
    IlceAdi: d.name,
  }));
}

export function getCityNameEn(cityId: string): string {
  return TURKEY_DATA[cityId]?.nameEn || 'Istanbul';
}

export async function fetchPrayerTimes(
  districtId: string,
  cityNameEn?: string,
): Promise<PrayerTimesData> {
  // Try Aladhan API first (method 13 = Diyanet calculation, most reliable for direct API)
  const city = cityNameEn || 'Istanbul';
  try {
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(
      city,
    )}&country=Turkey&method=13`;
    const json = await fetchWithTimeout(url, {});
    if (json?.code === 200 && json?.data?.timings) {
      const t = json.data.timings;
      const c = (v: string) => (v || '00:00').split(' ')[0].slice(0, 5);
      return {
        imsak: c(t.Imsak || t.Fajr),
        gunes: c(t.Sunrise),
        ogle: c(t.Dhuhr),
        ikindi: c(t.Asr),
        aksam: c(t.Maghrib),
        yatsi: c(t.Isha),
      };
    }
  } catch {}

  // Fallback: try Diyanet proxy APIs
  const proxyBases = [
    'https://ezanvakti.herokuapp.com',
    'https://ezanvakti.onrender.com',
  ];
  for (const base of proxyBases) {
    try {
      const data = await fetchWithTimeout(`${base}/vakitler/${encodeURIComponent(districtId)}`, {});
      if (Array.isArray(data) && data.length > 0) {
        const today = data[0];
        const c = (v: string | undefined) => (v || '00:00').slice(0, 5);
        return {
          imsak: c(today.Imsak),
          gunes: c(today.Gunes),
          ogle: c(today.Ogle),
          ikindi: c(today.Ikindi),
          aksam: c(today.Aksam),
          yatsi: c(today.Yatsi),
        };
      }
    } catch {}
  }

  throw new Error('Namaz vakitleri alınamadı');
}
