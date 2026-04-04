import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { THEME } from '../constants';
import { getDailyContent } from '../data';

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function CalendarScreen() {
  const now = new Date();
  const content = useMemo(() => getDailyContent(now), []);

  const dateStr = `${now.getDate()} ${MONTHS_TR[now.getMonth()]} ${now.getFullYear()}`;
  const dayStr = DAYS_TR[now.getDay()];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Günün Takvimi</Text>

      {/* Date Display */}
      <View style={s.dateCard}>
        <Text style={s.dateIcon}>📅</Text>
        <Text style={s.dateText}>{dateStr}</Text>
        <Text style={s.dayText}>{dayStr}</Text>
      </View>

      {/* Günün Ayeti */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>📖</Text>
          <Text style={s.cardTitle}>Günün Ayeti</Text>
        </View>
        <Text style={s.cardContent}>*{content.verse.text}*</Text>
        <Text style={s.cardSource}>({content.verse.source})</Text>
      </View>

      {/* Günün Hadisi */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>🕌</Text>
          <Text style={s.cardTitle}>Günün Hadisi</Text>
        </View>
        <Text style={s.cardContent}>*{content.hadith.text}*</Text>
        <Text style={s.cardSource}>({content.hadith.source})</Text>
      </View>

      {/* Fıkıh Bilgisi */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>🔖</Text>
          <Text style={s.cardTitle}>Bir Fıkıh Bilgisi</Text>
        </View>
        <Text style={s.cardContent}>{content.fiqh}</Text>
      </View>

      {/* Tarihte Bugün */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>🏛️</Text>
          <Text style={s.cardTitle}>Tarihte Bugün</Text>
        </View>
        <Text style={s.cardContent}>{content.history}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  title: {
    fontSize: 24, fontWeight: '800', color: THEME.text,
    textAlign: 'center', paddingTop: 52, paddingBottom: 16,
  },

  dateCard: {
    backgroundColor: THEME.primaryDark, borderRadius: 18, padding: 24,
    marginHorizontal: 16, marginBottom: 16, alignItems: 'center',
  },
  dateIcon: { fontSize: 28, marginBottom: 8 },
  dateText: { fontSize: 24, fontWeight: '800', color: THEME.white, marginBottom: 4 },
  dayText: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  card: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 12, borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: THEME.text },
  cardContent: {
    fontSize: 14, color: THEME.text, lineHeight: 22, fontStyle: 'italic',
  },
  cardSource: { fontSize: 12, color: THEME.textSecondary, marginTop: 6 },
});
