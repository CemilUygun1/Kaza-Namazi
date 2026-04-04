import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Counts,
  DEFAULT_COUNTS,
  DEFAULT_PROFILE,
  UserProfile,
  LocationData,
  CompletionLog,
  PrayerKey,
  City,
  District,
} from './constants';

const KEYS = {
  profile: '@kaza_profile',
  counts: '@kaza_counts',
  initialCounts: '@kaza_initial_counts',
  location: '@kaza_location',
  completionLog: '@kaza_completion_log',
  zikirCount: '@kaza_zikir',
  citiesCache: '@kaza_cities_cache',
  districtsCache: '@kaza_districts_',
};

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function save(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const Storage = {
  loadProfile: () => load<UserProfile>(KEYS.profile, DEFAULT_PROFILE),
  saveProfile: (p: UserProfile) => save(KEYS.profile, p),

  loadCounts: () => load<Counts>(KEYS.counts, DEFAULT_COUNTS),
  saveCounts: (c: Counts) => save(KEYS.counts, c),

  loadInitialCounts: () => load<Counts>(KEYS.initialCounts, DEFAULT_COUNTS),
  saveInitialCounts: (c: Counts) => save(KEYS.initialCounts, c),

  loadLocation: () => load<LocationData | null>(KEYS.location, null),
  saveLocation: (l: LocationData) => save(KEYS.location, l),

  loadCompletionLog: () => load<CompletionLog>(KEYS.completionLog, {}),
  saveCompletionLog: (l: CompletionLog) => save(KEYS.completionLog, l),

  loadZikirCount: () => load<number>(KEYS.zikirCount, 0),
  saveZikirCount: (n: number) => save(KEYS.zikirCount, n),

  loadCitiesCache: () => load<City[]>(KEYS.citiesCache, []),
  saveCitiesCache: (c: City[]) => save(KEYS.citiesCache, c),

  loadDistrictsCache: (cityId: string) =>
    load<District[]>(`${KEYS.districtsCache}${cityId}`, []),
  saveDistrictsCache: (cityId: string, d: District[]) =>
    save(`${KEYS.districtsCache}${cityId}`, d),

  logCompletion: async (prayer: PrayerKey): Promise<CompletionLog> => {
    const log = await Storage.loadCompletionLog();
    const today = new Date().toISOString().slice(0, 10);
    if (!log[today]) {
      log[today] = { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0 };
    }
    log[today][prayer] += 1;
    await Storage.saveCompletionLog(log);
    return log;
  },
};
