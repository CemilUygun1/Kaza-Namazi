import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { THEME, Counts, PRAYERS, CompletionLog, PrayerKey } from '../constants';
import { Storage } from '../storage';

type Props = {
  counts: Counts;
  initialCounts: Counts;
};

const PRAYER_COLORS: Record<PrayerKey, string> = {
  sabah: '#F59E0B',
  ogle: '#3B82F6',
  ikindi: '#10B981',
  aksam: '#EF4444',
  yatsi: '#8B5CF6',
  vitir: '#EC4899',
};

export default function StatisticsScreen({ counts, initialCounts }: Props) {
  const [log, setLog] = useState<CompletionLog>({});

  useEffect(() => {
    Storage.loadCompletionLog().then(setLog);
  }, [counts]);

  const totalDebt = useMemo(
    () => Object.values(initialCounts).reduce((a, b) => a + b, 0), [initialCounts],
  );
  const currentDebt = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0), [counts],
  );
  const totalCompleted = Math.max(0, totalDebt - currentDebt);

  // Weekly data for last 12 weeks
  const weeklyData = useMemo(() => {
    const weeks: number[] = [];
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      let weekTotal = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (w * 7 + d));
        const key = date.toISOString().slice(0, 10);
        if (log[key]) {
          weekTotal += Object.values(log[key]).reduce((a, b) => a + b, 0);
        }
      }
      weeks.push(weekTotal);
    }
    return weeks;
  }, [log]);

  const maxWeekly = Math.max(...weeklyData, 1);

  // Prayer distribution (completed by type)
  const distribution = useMemo(() => {
    const totals: Record<PrayerKey, number> = {
      sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0,
    };
    Object.values(log).forEach((day) => {
      (Object.keys(day) as PrayerKey[]).forEach((k) => {
        totals[k] += day[k];
      });
    });
    return totals;
  }, [log]);

  const distTotal = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>İstatistik</Text>

      {/* Summary Cards */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Toplam Borç:</Text>
          <Text style={s.summaryValue}>{totalDebt.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Kılınan Toplam:</Text>
          <Text style={[s.summaryValue, { color: THEME.primary }]}>
            {totalCompleted.toLocaleString('tr-TR')}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.progressCard}>
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>İlerleme</Text>
          <Text style={s.progressPercent}>
            %{totalDebt > 0 ? Math.round((totalCompleted / totalDebt) * 100) : 0}
          </Text>
        </View>
        <View style={s.progressBarBg}>
          <View
            style={[
              s.progressBarFg,
              { width: `${totalDebt > 0 ? Math.min(100, (totalCompleted / totalDebt) * 100) : 0}%` },
            ]}
          />
        </View>
      </View>

      {/* Monthly Progress Chart */}
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>Haftalık İlerleme</Text>
        <View style={s.chartArea}>
          <View style={s.chartYAxis}>
            <Text style={s.yLabel}>{maxWeekly}</Text>
            <Text style={s.yLabel}>{Math.round(maxWeekly / 2)}</Text>
            <Text style={s.yLabel}>0</Text>
          </View>
          <View style={s.barsContainer}>
            {weeklyData.map((val, i) => (
              <View key={i} style={s.barCol}>
                <View style={s.barSpace}>
                  <View
                    style={[
                      s.bar,
                      {
                        height: `${Math.max(2, (val / maxWeekly) * 100)}%`,
                        backgroundColor: i === weeklyData.length - 1
                          ? THEME.primary : THEME.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Text style={s.barLabel}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={s.chartXLabel}>Hafta</Text>
      </View>

      {/* Prayer Distribution */}
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>Namaz Dağılımı</Text>
        {/* Stacked Bar */}
        <View style={s.stackedBarBg}>
          {PRAYERS.map((p) => {
            const pct = (distribution[p.key] / distTotal) * 100;
            if (pct < 1) return null;
            return (
              <View
                key={p.key}
                style={[
                  s.stackedSegment,
                  { width: `${pct}%`, backgroundColor: PRAYER_COLORS[p.key] },
                ]}
              />
            );
          })}
        </View>
        {/* Legend */}
        <View style={s.legendGrid}>
          {PRAYERS.map((p) => {
            const pct = Math.round((distribution[p.key] / distTotal) * 100);
            return (
              <View key={p.key} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: PRAYER_COLORS[p.key] }]} />
                <Text style={s.legendText}>
                  {p.label} %{pct} ({distribution[p.key]})
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Per-prayer remaining */}
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>Namaz Bazında Kalan Borç</Text>
        {PRAYERS.map((p) => (
          <View key={p.key} style={s.debtRow}>
            <View style={s.debtLeft}>
              <View style={[s.legendDot, { backgroundColor: PRAYER_COLORS[p.key] }]} />
              <Text style={s.debtLabel}>{p.label}</Text>
            </View>
            <Text style={s.debtValue}>{counts[p.key].toLocaleString('tr-TR')}</Text>
          </View>
        ))}
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

  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: THEME.card, borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: THEME.border,
  },
  summaryLabel: {
    fontSize: 13, fontWeight: '600', color: THEME.textSecondary, marginBottom: 6,
  },
  summaryValue: { fontSize: 28, fontWeight: '900', color: THEME.text },

  progressCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: THEME.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '700', color: THEME.text },
  progressPercent: { fontSize: 14, fontWeight: '800', color: THEME.primary },
  progressBarBg: {
    height: 10, backgroundColor: THEME.border, borderRadius: 5, overflow: 'hidden',
  },
  progressBarFg: {
    height: '100%', backgroundColor: THEME.primary, borderRadius: 5,
  },

  chartCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: THEME.border,
  },
  chartTitle: { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 14 },
  chartArea: { flexDirection: 'row', height: 160 },
  chartYAxis: { width: 30, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 },
  yLabel: { fontSize: 10, color: THEME.textLight },
  barsContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  barSpace: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 9, color: THEME.textLight, marginTop: 4 },
  chartXLabel: { textAlign: 'center', color: THEME.textLight, fontSize: 11, marginTop: 8 },

  stackedBarBg: {
    flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden',
    backgroundColor: THEME.border, marginBottom: 12,
  },
  stackedSegment: { height: '100%' },

  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: THEME.textSecondary, fontWeight: '600' },

  debtRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  debtLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  debtLabel: { fontSize: 14, fontWeight: '600', color: THEME.text },
  debtValue: { fontSize: 16, fontWeight: '800', color: THEME.text },
});
