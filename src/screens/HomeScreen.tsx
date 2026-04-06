import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Modal, Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  THEME, Counts, PrayerKey, PrayerTimesData, LocationData,
  PRAYERS, PRAYER_TIME_LABELS, City, District,
} from '../constants';
import { getDailyContent } from '../data';
import { getCities, getDistricts, getCityNameEn } from '../api';
import { Storage } from '../storage';

type Props = {
  counts: Counts;
  setCounts: (fn: (c: Counts) => Counts) => void;
  location: LocationData | null;
  setLocation: (l: LocationData) => void;
  prayerTimes: PrayerTimesData | null;
  timesLoading: boolean;
};

type NextPrayer = { label: string; time: string; diffMs: number };

type KerahatInfo = {
  active: boolean;
  name: string;
  remainingMs: number;
  nextName: string | null;
  nextStartMs: number | null;
};

const PRAYER_KEYS_FOR_NEXT: Array<{ key: keyof PrayerTimesData; label: string }> = [
  { key: 'imsak', label: 'İmsak' },
  { key: 'gunes', label: 'Güneş' },
  { key: 'ogle', label: 'Öğle' },
  { key: 'ikindi', label: 'İkindi' },
  { key: 'aksam', label: 'Akşam' },
  { key: 'yatsi', label: 'Yatsı' },
];

export default function HomeScreen({
  counts, setCounts, location, setLocation, prayerTimes, timesLoading,
}: Props) {
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [remaining, setRemaining] = useState('--:--');
  const [kerahat, setKerahat] = useState<KerahatInfo | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [cities] = useState<City[]>(() => getCities());
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedCityId, setSelectedCityId] = useState(location?.cityId || '539');
  const [selectedDistrictName, setSelectedDistrictName] = useState(location?.districtName || '');

  useEffect(() => {
    const d = getDistricts(selectedCityId);
    setDistricts(d);
    if (!d.find((x) => x.IlceAdi === selectedDistrictName)) {
      setSelectedDistrictName(d.length > 0 ? d[0].IlceAdi : '');
    }
  }, [selectedCityId]);

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
    const parseTime = (t: string) => {
      const [h, m] = (t || '00:00').split(':').map(Number);
      return { h, m, totalMin: h * 60 + m };
    };
    const tick = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const nowMs = now.getTime();

      // Next prayer
      let found: NextPrayer | null = null;
      for (const p of PRAYER_KEYS_FOR_NEXT) {
        const { h, m, totalMin: pMin } = parseTime(prayerTimes[p.key]);
        if (pMin > nowMin) {
          const d = new Date(now);
          d.setHours(h, m, 0, 0);
          found = { label: p.label, time: prayerTimes[p.key], diffMs: d.getTime() - nowMs };
          break;
        }
      }
      if (!found) {
        const { h, m } = parseTime(prayerTimes.imsak);
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(h, m, 0, 0);
        found = { label: 'İmsak', time: prayerTimes.imsak, diffMs: d.getTime() - nowMs };
      }
      setNextPrayer(found);
      setRemaining(formatDiff(found.diffMs));

      // Kerahat times calculation
      const gunes = parseTime(prayerTimes.gunes);
      const ogle = parseTime(prayerTimes.ogle);
      const aksam = parseTime(prayerTimes.aksam);

      // Kerahat 1 - Tulû: güneş doğuşundan ~45 dk sonrasına kadar
      const tulu_start = gunes.totalMin;
      const tulu_end = gunes.totalMin + 45;
      // Kerahat 2 - İstivâ/Zeval: öğleden ~15 dk öncesi
      const zeval_start = ogle.totalMin - 15;
      const zeval_end = ogle.totalMin;
      // Kerahat 3 - Gurûb: akşamdan ~45 dk öncesi
      const gurub_start = aksam.totalMin - 45;
      const gurub_end = aksam.totalMin;

      const kerahats = [
        { name: 'Tulû (Güneş Doğarken)', start: tulu_start, end: tulu_end },
        { name: 'İstivâ (Zeval Vakti)', start: zeval_start, end: zeval_end },
        { name: 'Gurûb (Güneş Batarken)', start: gurub_start, end: gurub_end },
      ];

      const toMs = (min: number) => {
        const d = new Date(now);
        d.setHours(Math.floor(min / 60), min % 60, 0, 0);
        return d.getTime();
      };

      let kInfo: KerahatInfo | null = null;

      // Check if currently in kerahat
      for (let i = 0; i < kerahats.length; i++) {
        const k = kerahats[i];
        if (nowMin >= k.start && nowMin < k.end) {
          const nextK = kerahats[i + 1] || null;
          kInfo = {
            active: true,
            name: k.name,
            remainingMs: toMs(k.end) - nowMs,
            nextName: nextK ? nextK.name : null,
            nextStartMs: nextK ? toMs(nextK.start) - nowMs : null,
          };
          break;
        }
      }

      // If not active, find next kerahat
      if (!kInfo) {
        for (let i = 0; i < kerahats.length; i++) {
          const k = kerahats[i];
          if (nowMin < k.start) {
            kInfo = {
              active: false,
              name: k.name,
              remainingMs: toMs(k.start) - nowMs,
              nextName: null,
              nextStartMs: toMs(k.start) - nowMs,
            };
            break;
          }
        }
        // All kerahats passed today
        if (!kInfo) {
          const tomorrowTulu = toMs(tulu_start) + 86400000;
          kInfo = {
            active: false,
            name: 'Tulû (Güneş Doğarken)',
            remainingMs: tomorrowTulu - nowMs,
            nextName: null,
            nextStartMs: tomorrowTulu - nowMs,
          };
        }
      }
      setKerahat(kInfo);
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

  const handleLocationSave = async () => {
    const district = districts.find((d) => d.IlceAdi === selectedDistrictName);
    const cityNameEn = getCityNameEn(selectedCityId);
    const newLocation: LocationData = {
      cityId: selectedCityId,
      cityName: cityNameEn,
      districtId: district?.IlceID || '',
      districtName: district?.IlceAdi || '',
    };
    setLocation(newLocation);
    await Storage.saveLocation(newLocation);
    setShowLocationModal(false);
  };

  const handlePrayedAll = useCallback(() => {
    setCounts((c) => {
      const next = { ...c };
      let changed = false;
      // Beş vakit namazın her birinden bir eksilt
      PRAYERS.forEach((p) => {
        if (next[p.key] > 0) {
          next[p.key] -= 1;
          Storage.logCompletion(p.key);
          changed = true;
        }
      });
      if (changed) {
        Storage.saveCounts(next);
      }
      return next;
    });
  }, [setCounts]);

  const cityDisplay = location
    ? `${location.districtName || location.cityName}`
    : 'Konum seçilmedi';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.headerRow} onPress={() => {
          if (location) {
            setSelectedCityId(location.cityId);
            setSelectedDistrictName(location.districtName);
          }
          setShowLocationModal(true);
        }}>
          <Text style={s.headerLocation}>📍 {cityDisplay}</Text>
          <Text style={{ fontSize: 16, color: THEME.white }}>Değiştir ›</Text>
        </Pressable>

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

        {/* Kerahat Banner */}
        {kerahat && (
          <View style={kerahat.active ? s.kerahatBannerActive : s.kerahatBannerIdle}>
            {kerahat.active ? (
              <>
                <Text style={s.kerahatText}>⛔ KERAHAT VAKTİ: {kerahat.name}</Text>
                <Text style={s.kerahatSub}>Bitimine {formatDiff(kerahat.remainingMs)} kaldı</Text>
              </>
            ) : (
              <>
                <Text style={s.kerahatText}>⏳ Sonraki kerahat: {kerahat.name}</Text>
                <Text style={s.kerahatSub}>{formatDiff(kerahat.nextStartMs || kerahat.remainingMs)} sonra</Text>
              </>
            )}
          </View>
        )}

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

      {/* Kerahat Bilgi Kartı */}
      <View style={s.kerahatInfoCard}>
        <Text style={s.kerahatInfoTitle}>🕌 Kerahat Vakitleri</Text>
        <Text style={s.kerahatInfoSubtitle}>Namaz kılınmayacak zamanlar (Tahrîmen Mekruh)</Text>
        <View style={s.kerahatInfoRow}>
          <View style={[s.kerahatInfoItem, { borderLeftColor: '#F59E0B' }]}>
            <Text style={s.kerahatInfoIcon}>🌅</Text>
            <Text style={s.kerahatInfoName}>Tulû (Güneş Doğarken)</Text>
            <Text style={s.kerahatInfoDesc}>Güneş doğmaya başlayıp bir mızrak boyu yükselinceye kadar (~45-50 dk)</Text>
            {prayerTimes && <Text style={s.kerahatInfoTime}>{prayerTimes.gunes} - {(() => { const [h,m] = prayerTimes.gunes.split(':').map(Number); const t = h*60+m+45; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; })()}</Text>}
          </View>
          <View style={[s.kerahatInfoItem, { borderLeftColor: '#EF4444' }]}>
            <Text style={s.kerahatInfoIcon}>☀️</Text>
            <Text style={s.kerahatInfoName}>İstivâ (Zeval Vakti)</Text>
            <Text style={s.kerahatInfoDesc}>Güneş tam tepedeyken, öğle ezanına 10-15 dk kala başlar</Text>
            {prayerTimes && <Text style={s.kerahatInfoTime}>{(() => { const [h,m] = prayerTimes.ogle.split(':').map(Number); const t = h*60+m-15; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; })()} - {prayerTimes.ogle}</Text>}
          </View>
          <View style={[s.kerahatInfoItem, { borderLeftColor: '#8B5CF6' }]}>
            <Text style={s.kerahatInfoIcon}>🌇</Text>
            <Text style={s.kerahatInfoName}>Gurûb (Güneş Batarken)</Text>
            <Text style={s.kerahatInfoDesc}>Güneş sararıp batmaya başladığında, batana kadar (~45 dk)</Text>
            {prayerTimes && <Text style={s.kerahatInfoTime}>{(() => { const [h,m] = prayerTimes.aksam.split(':').map(Number); const t = h*60+m-45; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; })()} - {prayerTimes.aksam}</Text>}
          </View>
        </View>
        <Text style={s.kerahatInfoNote}>* Farz ve vacip namazlar kılınmaz. Sünnet kılınabilir.</Text>
      </View>

      {/* Kerahat Görseli */}
      <View style={s.kerahatImageCard}>
        <Image
          source={require('../../assets/kerahat.png')}
          style={s.kerahatImage}
          resizeMode="contain"
        />
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

      {/* Bugün Tüm Namazları Kıldım Butonu */}
      <Pressable 
        style={s.prayedAllBtn} 
        onPress={handlePrayedAll}
        disabled={total === 0}
      >
        <Text style={s.prayedAllBtnText}>✓ Bugün Bütün Namazlarımı Kıldım</Text>
      </Pressable>

      {/* Location Change Modal */
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>📍 Konum Değiştir</Text>

            <Text style={s.modalLabel}>İl Seçin</Text>
            <View style={s.modalPickerWrap}>
              <Picker
                selectedValue={selectedCityId}
                onValueChange={(v) => setSelectedCityId(String(v))}
                style={s.modalPicker}
              >
                {cities.map((c) => (
                  <Picker.Item key={c.SehirID} label={c.SehirAdi} value={c.SehirID} />
                ))}
              </Picker>
            </View>

            <Text style={s.modalLabel}>İlçe Seçin</Text>
            <View style={s.modalPickerWrap}>
              {districts.length === 0 ? (
                <Text style={{ padding: 14, color: THEME.textSecondary, textAlign: 'center' }}>
                  İlçe bulunamadı
                </Text>
              ) : (
                <Picker
                  selectedValue={selectedDistrictName}
                  onValueChange={(v) => setSelectedDistrictName(String(v))}
                  style={s.modalPicker}
                >
                  {districts.map((d, i) => (
                    <Picker.Item key={`${d.IlceID}_${i}`} label={d.IlceAdi} value={d.IlceAdi} />
                  ))}
                </Picker>
              )}
            </View>

            <Pressable style={s.modalSaveBtn} onPress={handleLocationSave}>
              <Text style={s.modalSaveBtnText}>Kaydet</Text>
            </Pressable>
            <Pressable style={s.modalCancelBtn} onPress={() => setShowLocationModal(false)}>
              <Text style={s.modalCancelBtnText}>İptal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

  kerahatBannerActive: {
    backgroundColor: '#DC2626', borderRadius: 12, padding: 12, marginTop: 10,
    alignItems: 'center',
  },
  kerahatBannerIdle: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, marginTop: 10,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  kerahatText: { color: THEME.white, fontSize: 13, fontWeight: '700' },
  kerahatSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },

  nextBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E76F51', borderRadius: 12, padding: 12, marginTop: 10,
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

  prayedAllBtn: {
    backgroundColor: '#E76F51', 
    borderRadius: 14, 
    padding: 16,
    marginHorizontal: 16, 
    marginTop: 16, 
    alignItems: 'center',
  },
  prayedAllBtnText: { 
    color: THEME.white, 
    fontWeight: '800', 
    fontSize: 16 
  },

  kerahatInfoCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16, margin: 16,
    marginBottom: 8, borderWidth: 1, borderColor: THEME.border,
  },
  kerahatInfoTitle: { fontSize: 17, fontWeight: '800', color: THEME.text, marginBottom: 4 },
  kerahatInfoSubtitle: { fontSize: 12, color: THEME.textSecondary, marginBottom: 14 },
  kerahatInfoRow: { gap: 10 },
  kerahatInfoItem: {
    backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12,
    borderLeftWidth: 4,
  },
  kerahatInfoIcon: { fontSize: 20, marginBottom: 4 },
  kerahatInfoName: { fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 2 },
  kerahatInfoDesc: { fontSize: 12, color: THEME.textSecondary, lineHeight: 18 },
  kerahatInfoTime: { fontSize: 13, fontWeight: '800', color: '#B45309', marginTop: 6 },
  kerahatInfoNote: { fontSize: 11, color: THEME.textSecondary, marginTop: 12, fontStyle: 'italic', textAlign: 'center' },

  kerahatImageCard: {
    backgroundColor: THEME.card, borderRadius: 16, marginHorizontal: 16,
    marginBottom: 8, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden',
  },
  kerahatImage: {
    width: '100%', height: 220, borderRadius: 16,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20, fontWeight: '800', color: THEME.text, marginBottom: 16, textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 6, marginTop: 8,
  },
  modalPickerWrap: {
    backgroundColor: THEME.background, borderRadius: 14, borderWidth: 1,
    borderColor: THEME.border, overflow: 'hidden', marginBottom: 8, minHeight: 50,
    justifyContent: 'center',
  },
  modalPicker: { color: THEME.text },
  modalSaveBtn: {
    backgroundColor: THEME.primary, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 16,
  },
  modalSaveBtnText: { color: THEME.white, fontWeight: '800', fontSize: 16 },
  modalCancelBtn: {
    borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: THEME.border,
  },
  modalCancelBtnText: { color: THEME.textSecondary, fontWeight: '700', fontSize: 15 },
});
