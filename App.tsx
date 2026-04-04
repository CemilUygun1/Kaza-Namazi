import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import {
  THEME, Counts, DEFAULT_COUNTS, DEFAULT_PROFILE,
  UserProfile, LocationData, PrayerTimesData, TabName,
} from './src/constants';
import { fetchPrayerTimes } from './src/api';
import { Storage } from './src/storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import ZikirmatikScreen from './src/screens/ZikirmatikScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import BottomTabBar from './src/components/BottomTabBar';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [counts, setCounts] = useState<Counts>(DEFAULT_COUNTS);
  const [initialCounts, setInitialCounts] = useState<Counts>(DEFAULT_COUNTS);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [timesLoading, setTimesLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabName>('home');

  // Load all data on mount
  useEffect(() => {
    (async () => {
      try {
        const [p, c, ic, l] = await Promise.all([
          Storage.loadProfile(),
          Storage.loadCounts(),
          Storage.loadInitialCounts(),
          Storage.loadLocation(),
        ]);
        setProfile(p);
        setCounts(c);
        setInitialCounts(ic);
        setLocation(l);
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  // Fetch prayer times when location changes
  useEffect(() => {
    if (!location?.districtId) return;
    let cancelled = false;
    setTimesLoading(true);
    fetchPrayerTimes(location.districtId, location.cityName)
      .then((times) => { if (!cancelled) setPrayerTimes(times); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTimesLoading(false); });
    return () => { cancelled = true; };
  }, [location?.districtId, location?.cityName]);

  const handleOnboardingComplete = useCallback(
    async (p: UserProfile, c: Counts, l: LocationData) => {
      setProfile(p);
      setCounts(c);
      setInitialCounts(c);
      setLocation(l);
      await Promise.all([
        Storage.saveProfile(p),
        Storage.saveCounts(c),
        Storage.saveInitialCounts(c),
        Storage.saveLocation(l),
      ]);
    },
    [],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </SafeAreaView>
    );
  }

  if (!profile.onboardingComplete) {
    return (
      <SafeAreaView style={styles.safe}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.main}>
        {currentTab === 'home' && (
          <HomeScreen
            counts={counts}
            setCounts={setCounts}
            location={location}
            prayerTimes={prayerTimes}
            timesLoading={timesLoading}
          />
        )}
        {currentTab === 'statistics' && (
          <StatisticsScreen counts={counts} initialCounts={initialCounts} />
        )}
        {currentTab === 'zikirmatik' && <ZikirmatikScreen />}
        {currentTab === 'calendar' && <CalendarScreen />}
        <BottomTabBar currentTab={currentTab} onTabChange={setCurrentTab} />
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  main: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
