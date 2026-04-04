import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  THEME, Counts, PrayerKey, PrayerTimesData, LocationData,
  PRAYERS, PRAYER_TIME_LABELS,
} from '../constants';
import { getDailyContent } from '../data';
import { Storage } from '../storage';

type Props = {
  counts: Counts;
  setCounts: (fn: (c: Counts) => Counts) => void;
  location: LocationData | null;
  prayerTimes: PrayerTimesData | null;
  timesLoading: boolean;
};

type NextPrayer = { label: string; time: string; diffMs: number };

const PRAYER_KEYS_FOR_NEXT: Array<{ key: keyof PrayerTimesData; label: string }> = [
  { key: 'imsak', label: 'İmsak' },
  { key: 'gunes', label: 'Güneş' },
  { key: 'ogle', label: 'Öğle' },
  { key: 'ikindi', label: 'İkindi' },
  { key: 'aksam', label: 'Akşam' },
  { key: 'yatsi', label: 'Yatsı' },
];

export default function HomeScreen({
  counts, setCounts, location, prayerTimes, timesLoading,
}: Props) {
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [remaining, setRemaining] = useState('--:--');
  const [saved, setSaved] = useState(false);

  const dailyContent = useMemo(() => getDailyContent(new Date()), []);
  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0), [counts],
  );

  const formatDiff = (ms: number) => {
    if (ms < 0) return '00:00';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h} sa ${String(m).padStart(2, '0')} dk`;
    return `${m} dk`;
  };

  useEffect(() => {
    if (!prayerTimes) return;
    const tick = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let found: NextPrayer | null = null;
      for (const p of PRAYER_KEYS_FOR_NEXT) {
        const [h, m] = (prayerTimes[p.key] || '00:00').split(':').map(Number);
        const pMin = h * 60 + m;
        if (pMin > nowMin) {
          const d = new Date(now);
          d.setHours(h, m, 0, 0);
          const diffMs = d.getTime() - now.getTime();
          found = { label: p.label, time: prayerTimes[p.key], diffMs };
          break;
        }
      }
      if (!found) {
        const [h, m] = (prayerTimes.imsak || '00:00').split(':').map(Number);
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(h, m, 0, 0);
        found = { label: 'İmsak', time: prayerTimes.imsak, diffMs: d.getTime() - now.getTime() };
      }
      setNextPrayer(found);
      setRemaining(formatDiff(found.diffMs));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [prayerTimes]);

  const dec = useCallback((key: PrayerKey) => {
    setCounts((c) => {
      if (c[key] <= 0) return c;
      const next = { ...c, [key]: c[key] - 1 };
      Storage.saveCounts(next);
      Storage.logCompletion(key);
      return next;
    });
  }, [setCounts]);

  const inc = useCallback((key: PrayerKey) => {
    setCounts((c) => {
      const next = { ...c, [key]: c[key] + 1 };
      Storage.saveCounts(next);
      return next;
    });
  }, [setCounts]);

  const handleSave = async () => {
    await Storage.saveCounts(counts);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const cityDisplay = location
    ? `${location.cityName}${location.districtName ? ' / ' + location.districtName : ''}`
    : 'Konum seçilmedi';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerLocation}>Konum: {cityDisplay}</Text>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </View>

        {/* Prayer Times */}
        <View style={s.timesCard}>
          <Text style={s.timesTitle}>Namaz Vakitleri <Text style={s.timesSub}>(Diyanet Uyumlu)</Text></Text>
          {timesLoading ? (
            <ActivityIndicator color={THEME.white} style={{ marginVertical: 8 }} />
          ) : prayerTimes ? (
            <View style={s.timesRow}>
              {PRAYER_TIME_LABELS.map((p) => (
                <View key={p.key} style={s.timeItem}>
                  <Text style={s.timeLabel}>{p.label}</Text>
                  <Text style={s.timeValue}>{prayerTimes[p.key] || '--:--'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.timesError}>Vakitler alınamadı</Text>
          )}
        </View>

        {/* Next Prayer Banner */}
        {nextPrayer && (
          <View style={s.nextBanner}>
            <Text style={s.nextText}>
              Sıradaki: {nextPrayer.label} - {remaining}
            </Text>
            <Text style={{ fontSize: 16 }}>🔔</Text>
          </View>
        )}
      </View>

      {/* Daily Quote */}
      <View style={s.quoteCard}>
        <Text style={s.quoteIcon}>❝</Text>
        <Text style={s.quoteTitle}>Günün Sözü</Text>
        <Text style={s.quoteText}>*{dailyContent.quote.text}*</Text>
        <Text style={s.quoteSource}>({dailyContent.quote.source})</Text>
      </View>

      {/* Kaza Prayers */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Kaza Namazları</Text>
      </View>

      <View style={s.kazaGrid}>
        {PRAYERS.map((p) => (
          <View key={p.key} style={s.kazaItem}>
            <Text style={s.kazaLabel}>{p.label}</Text>
            <View style={s.kazaControls}>
              <Text style={s.kazaCount}>{counts[p.key]}</Text>
              <View style={s.kazaBtns}>
                <Pressable
                  style={[s.kazaBtn, { backgroundColor: THEME.red }]}
                  onPress={() => dec(p.key)}
                  disabled={counts[p.key] <= 0}
                >
                  <Text style={s.kazaBtnText}>−</Text>
                </Pressable>
                <Pressable
                  style={[s.kazaBtn, { backgroundColor: THEME.primary }]}
                  onPress={() => inc(p.key)}
                >
                  <Text style={s.kazaBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={s.updateBtn} onPress={handleSave}>
        <Text style={s.updateBtnText}>{saved ? '✓ Kaydedildi!' : 'Güncelle'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },

  header: {
    backgroundColor: THEME.primaryDark,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  headerLocation: {
    color: THEME.white, fontSize: 16, fontWeight: '700',
  },

  timesCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, padding: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timesTitle: {
    color: THEME.white, fontSize: 14, fontWeight: '700', marginBottom: 8,
  },
  timesSub: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.7)' },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeItem: { alignItems: 'center', gap: 2 },
  timeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  timeValue: { color: THEME.white, fontSize: 14, fontWeight: '800' },
  timesError: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', paddingVertical: 8 },

  nextBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: THEME.primaryLight, borderRadius: 12, padding: 12, marginTop: 10,
  },
  nextText: { color: THEME.white, fontSize: 14, fontWeight: '700' },

  quoteCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16, margin: 16,
    marginBottom: 8, borderWidth: 1, borderColor: THEME.border,
  },
  quoteIcon: { fontSize: 28, color: THEME.primary, marginBottom: 4 },
  quoteTitle: { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 6 },
  quoteText: { fontSize: 14, color: THEME.text, lineHeight: 22, fontStyle: 'italic' },
  quoteSource: { fontSize: 12, color: THEME.textSecondary, marginTop: 6 },

  sectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: THEME.text },

  kazaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10,
  },
  kazaItem: {
    width: '47%',
    backgroundColor: THEME.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: THEME.border,
  },
  kazaLabel: { fontSize: 14, fontWeight: '700', color: THEME.textSecondary, marginBottom: 6 },
  kazaControls: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  kazaCount: { fontSize: 24, fontWeight: '900', color: THEME.text },
  kazaBtns: { flexDirection: 'row', gap: 8 },
  kazaBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  kazaBtnText: { color: THEME.white, fontSize: 20, fontWeight: '800' },

  updateBtn: {
    backgroundColor: THEME.primary, borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginTop: 16, alignItems: 'center',
  },
  updateBtnText: { color: THEME.white, fontWeight: '800', fontSize: 16 },
});
