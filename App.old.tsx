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
  const [counts, setCounts] = React.useState<Counts>(DEFAULT_COUNTS);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [nextPrayer, setNextPrayer] = React.useState<NextPrayer | null>(null);
  const [remaining, setRemaining] = React.useState<string>('--:--:--');
  const [kerahatText, setKerahatText] = React.useState<string>('');
  const [prayerTimes, setPrayerTimes] =
    React.useState<PrayerTimes>(DEFAULT_PRAYER_TIMES);
  const [timesLoading, setTimesLoading] = React.useState<boolean>(true);
  const [timesError, setTimesError] = React.useState<string | null>(null);
  const [sourceUsed, setSourceUsed] = React.useState<string>('—');
  const [districtId, setDistrictId] = React.useState('9541'); // İstanbul - Fatih
  const [editDistrictId, setEditDistrictId] = React.useState('9541');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Counts>;
        if (!mounted) return;
        setCounts((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch {
        // ignore corrupted storage
      } finally {
        if (mounted) setIsLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counts)).catch(() => {
      // ignore write errors
    });
  }, [counts, isLoaded]);

  const inc = (key: PrayerKey) =>
    setCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));

  const dec = (key: PrayerKey) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));

  const total = React.useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts]
  );

  const resetAll = () => setCounts(DEFAULT_COUNTS);

  // NAMAZ VAKİTLERİNİ DİYANET KAYNAĞINDAN ÇEK (ezanvakti API) + robust fallback
  React.useEffect(() => {
    const loadTimes = async () => {
      try {
        setTimesLoading(true);
        setTimesError(null);
        let success = false;
        const failures: string[] = [];
        const cityName =
          DISTRICT_OPTIONS.find((d) => d.id === districtId)?.city || 'Istanbul';

        for (const source of SOURCES) {
          try {
            const url =
              source.type === 'diyanet'
                ? source.build(districtId)
                : source.build(cityName);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (source.type === 'diyanet' && Array.isArray(data) && data.length > 0) {
              const today = data[0] as Record<string, string>;
              const clean = (val: string | undefined): string => {
                if (!val) return '00:00';
                return val.slice(0, 5);
              };
              const nextTimes: PrayerTimes = {
                sabah: clean(today.Imsak),
                ogle: clean(today.Ogle),
                ikindi: clean(today.Ikindi),
                aksam: clean(today.Aksam),
                yatsi: clean(today.Yatsi),
              };
              setPrayerTimes(nextTimes);
              setSourceUsed(source.name);
              success = true;
              break;
            }

            if (source.type === 'aladhan' && data?.code === 200 && data?.data?.timings) {
              const t = data.data.timings as Record<string, string>;
              const clean = (val: string | undefined): string => {
                if (!val) return '00:00';
                const base = val.split(' ')[0];
                return base.slice(0, 5);
              };
              const nextTimes: PrayerTimes = {
                sabah: clean(t.Fajr),
                ogle: clean(t.Dhuhr),
                ikindi: clean(t.Asr),
                aksam: clean(t.Maghrib),
                yatsi: clean(t.Isha),
              };
              setPrayerTimes(nextTimes);
              setSourceUsed(source.name);
              success = true;
              break;
            }
          } catch (err: any) {
            failures.push(`${source.name}: ${err?.message || 'error'}`);
          }
        }

        if (!success) {
          throw new Error(failures.join(' | '));
        }
      } catch (e) {
        setTimesError('Vakitler alınamadı, varsayılan saatler kullanılıyor.');
        setPrayerTimes(DEFAULT_PRAYER_TIMES);
        setSourceUsed('defaults');
      } finally {
        setTimesLoading(false);
      }
    };

    loadTimes();
  }, [districtId]);

  // LOKASYONU STORAGE'DAN YÜKLE
  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { districtId?: string };
        if (parsed.districtId) {
          setDistrictId(parsed.districtId);
          setEditDistrictId(parsed.districtId);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveLocation = () => {
    const next = editDistrictId || '9541';
    setDistrictId(next);
    AsyncStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ districtId: next })
    ).catch(() => {});
  };

  React.useEffect(() => {
    const computeNext = (): NextPrayer => {
      const now = new Date();
      const timesToday = PRAYERS.map((p) => {
        const [h, m] = prayerTimes[p.key].split(':').map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return { ...p, date: d };
      });

      let upcoming = timesToday.find((t) => t.date > now);
      if (!upcoming) {
        const first = timesToday[0];
        const d = new Date(first.date);
        d.setDate(d.getDate() + 1);
        upcoming = { ...first, date: d };
      }

      return {
        key: upcoming.key,
        label: upcoming.label,
        at: upcoming.date,
        diffMs: upcoming.date.getTime() - now.getTime(),
      };
    };

    const formatDiff = (ms: number) => {
      if (ms < 0) ms = 0;
      const totalSec = Math.floor(ms / 1000);
      const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    const computeKerahat = (now: Date) => {
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const nowMin = now.getHours() * 60 + now.getMinutes();
      const todays = KERAHAT_RANGES.map((r) => ({
        ...r,
        startMin: toMinutes(r.start),
        endMin: toMinutes(r.end),
      }));

      const current = todays.find(
        (r) => nowMin >= r.startMin && nowMin < r.endMin
      );
      if (current) {
        setKerahatText(`${current.label} içindesin.`);
        return;
      }

      const upcoming = todays
        .filter((r) => r.startMin > nowMin)
        .sort((a, b) => a.startMin - b.startMin)[0];

      if (!upcoming) {
        setKerahatText('Bugün kalan keraat vakti yok.');
        return;
      }

      const target = new Date(now);
      target.setHours(Math.floor(upcoming.startMin / 60), upcoming.startMin % 60, 0, 0);
      const diff = target.getTime() - now.getTime();
      setKerahatText(
        `Keraat vaktine (${upcoming.label}) ${formatDiff(diff)} kaldı.`
      );
    };

    const tick = () => {
      const np = computeNext();
      setNextPrayer(np);
      setRemaining(formatDiff(np.diffMs));
      computeKerahat(new Date());
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayerTimes]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View>
              <Text style={styles.locationTitle}>İlçe (Diyanet kaynağı)</Text>
              <Text style={styles.locationHint}>
                İlçe seç, “Uygula” de; Diyanet verisi yenilenir.
              </Text>
            </View>
            {timesLoading && <ActivityIndicator size="small" color="#A5B4FC" />}
          </View>

          <View style={styles.locationInputs}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>İlçe seç</Text>
              <Picker
                selectedValue={editDistrictId}
                onValueChange={(v) => setEditDistrictId(String(v))}
                style={styles.picker}
                dropdownIconColor="#E5E7EB"
              >
                {DISTRICT_OPTIONS.map((d) => (
                  <Picker.Item
                    key={d.id}
                    label={d.label}
                    value={d.id}
                    color="#111"
                  />
                ))}
              </Picker>
            </View>
            <Pressable
              onPress={saveLocation}
              style={({ pressed }) => [
                styles.applyBtn,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
              ]}
            >
              <Text style={styles.applyBtnText}>Uygula</Text>
            </Pressable>
          </View>

          <Text style={styles.locationCurrent}>
            Şu an: {DISTRICT_OPTIONS.find((d) => d.id === districtId)?.label || '—'}
          </Text>
          <Text style={styles.locationCurrent}>
            Kaynak: {timesLoading ? 'yükleniyor…' : sourceUsed}
          </Text>
          {timesError && <Text style={styles.locationError}>{timesError}</Text>}

          <View style={styles.presetChips}>
            {DISTRICT_OPTIONS.map((d) => {
              const isActive = d.id === districtId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => {
                    setEditDistrictId(d.id);
                    setDistrictId(d.id);
                    AsyncStorage.setItem(
                      LOCATION_STORAGE_KEY,
                      JSON.stringify({ districtId: d.id })
                    ).catch(() => {});
                  }}
                  style={[
                    styles.chip,
                    isActive && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {d.label.split(' - ')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.timesBar}>
          {PRAYERS.map((p) => (
            <View key={p.key} style={styles.timeItem}>
              <Text style={styles.timeName}>{p.label}</Text>
              <Text style={styles.timeValue}>
                {timesLoading ? '--:--' : prayerTimes[p.key]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.nextCard}>
          <View>
            <Text style={styles.nextLabel}>Sıradaki vakit</Text>
            <Text style={styles.nextName}>
              {nextPrayer ? nextPrayer.label : '—'}
            </Text>
          </View>
          <View style={styles.nextRight}>
            <Text style={styles.nextCountdown}>{remaining}</Text>
            {nextPrayer && (
              <Text style={styles.nextHour}>
                {timesLoading ? '--:--' : prayerTimes[nextPrayer.key]}’de
              </Text>
            )}
            {!!kerahatText && (
              <Text style={styles.kerahatText}>{kerahatText}</Text>
            )}
          </View>
        </View>

        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Kaza Namazı</Text>
              <Text style={styles.subtitle}>
                Sabah • Öğle • İkindi • Akşam • Yatsı
              </Text>
            </View>

            <View style={styles.totalPill}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>{total}</Text>
            </View>
          </View>

          <Pressable
            onPress={resetAll}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
            ]}
          >
            <Text style={styles.resetBtnText}>Sıfırla</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {PRAYERS.map((p, idx) => {
            const value = counts[p.key];
            const isMinusDisabled = value <= 0;
            const isLast = idx === PRAYERS.length - 1;
            return (
              <View
                key={p.key}
                style={[styles.row, isLast && styles.rowLast]}
              >
                <View>
                  <Text style={styles.prayerName}>{p.label}</Text>
                  <Text style={styles.prayerHint}>Kaza adedi</Text>
                </View>

                <View style={styles.controls}>
                  <Pressable
                    onPress={() => dec(p.key)}
                    disabled={isMinusDisabled}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      styles.btnMinus,
                      isMinusDisabled && styles.btnDisabled,
                      pressed && !isMinusDisabled && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.iconBtnText}>-</Text>
                  </Pressable>

                  <View style={styles.countPill}>
                    <Text style={styles.countText}>{value}</Text>
                  </View>

                  <Pressable
                    onPress={() => inc(p.key)}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      styles.btnPlus,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.iconBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.hint}>Sayaçlar cihazda kaydedilir.</Text>

        <View style={styles.kerahatBanner}>
          <Text style={styles.kerahatTitle}>Keraat Vakitleri</Text>
          <Text style={styles.kerahatDiagram}>
            Sabah ▸ Güneş ▸ Öğle ▸ İkindi ▸ Akşam ▸ Yatsı
          </Text>
          <Text style={styles.kerahatNote}>
            Kırmızı bölgeler: kılınmaması mekruh olan zaman dilimleri
            (detay için kendi kaynaklarına bakmayı unutma).
          </Text>
        </View>
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#070B16',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  timesBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  timeItem: {
    alignItems: 'center',
    gap: 2,
  },
  timeName: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerCard: {
    backgroundColor: '#0D1630',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    marginBottom: 10,
  },
  totalPill: {
    alignItems: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 12,
    fontWeight: '700',
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  resetBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nextCard: {
    backgroundColor: '#0D1426',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nextName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  nextRight: {
    alignItems: 'flex-end',
  },
  nextCountdown: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  nextHour: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  kerahatText: {
    color: 'rgba(248, 250, 252, 0.85)',
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#111B32',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  prayerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  prayerHint: {
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnPlus: {
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
  },
  btnMinus: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.95,
  },
  iconBtnText: {
    color: '#0B1220',
    fontSize: 22,
    fontWeight: '900',
  },
  countPill: {
    minWidth: 54,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  locationCard: {
    backgroundColor: '#0D1426',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
    gap: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  locationHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  locationInputs: {
    gap: 8,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pickerLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '700',
  },
  picker: {
    color: '#0B1220',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 44,
  },
  applyBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#0B1220',
    fontWeight: '800',
  },
  locationCurrent: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  locationError: {
    color: '#F87171',
    fontSize: 12,
  },
  presetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  chipText: {
    color: '#E5E7EB',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#0B1220',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 14,
  },
  kerahatBanner: {
    marginTop: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  kerahatTitle: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  kerahatDiagram: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  kerahatNote: {
    color: 'rgba(209,213,219,0.9)',
    fontSize: 11,
  },
});
