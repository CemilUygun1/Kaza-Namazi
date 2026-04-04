import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Vibration } from 'react-native';
import { THEME } from '../constants';
import { Storage } from '../storage';

export default function ZikirmatikScreen() {
  const [count, setCount] = useState(0);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    Storage.loadZikirCount().then(setCount);
  }, []);

  const handleTap = useCallback(() => {
    setCount((c) => {
      const next = c + 1;
      Storage.saveZikirCount(next);
      return next;
    });
    setHistory((h) => [...h, 1]);
    if (vibrationOn) Vibration.vibrate(30);
  }, [vibrationOn]);

  const handleBack = useCallback(() => {
    setCount((c) => {
      const next = Math.max(0, c - 1);
      Storage.saveZikirCount(next);
      return next;
    });
    setHistory((h) => h.slice(0, -1));
  }, []);

  const handleReset = useCallback(() => {
    setCount(0);
    setHistory([]);
    Storage.saveZikirCount(0);
  }, []);

  const displayCount = String(count).padStart(3, '0');

  return (
    <View style={s.container}>
      <Text style={s.title}>Zikirmatik</Text>

      {/* Counter Display */}
      <View style={s.counterArea}>
        <Text style={s.counterText}>{displayCount}</Text>
      </View>

      {/* Tap Area */}
      <Pressable style={s.tapCircle} onPress={handleTap}>
        <Text style={s.tapIcon}>☽</Text>
        <Text style={s.tapText}>Zikir Çek</Text>
      </Pressable>

      {/* Controls */}
      <View style={s.controlsRow}>
        <Pressable style={s.controlBtn} onPress={handleReset}>
          <Text style={s.controlBtnText}>Sıfırla</Text>
        </Pressable>
        <Pressable style={[s.controlBtn, s.controlBtnBack]} onPress={handleBack}>
          <Text style={s.controlBtnText}>Geri</Text>
        </Pressable>
      </View>

      {/* Vibration Toggle */}
      <Pressable
        style={s.vibrationToggle}
        onPress={() => setVibrationOn((v) => !v)}
      >
        <Text style={s.vibrationText}>
          📳 Titreşim: {vibrationOn ? 'Açık' : 'Kapalı'}
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: THEME.background, alignItems: 'center',
    paddingTop: 52,
  },
  title: {
    fontSize: 24, fontWeight: '800', color: THEME.text, marginBottom: 24,
  },

  counterArea: {
    marginBottom: 30,
  },
  counterText: {
    fontSize: 80, fontWeight: '900', color: THEME.text,
    fontVariant: ['tabular-nums'], letterSpacing: 4,
  },

  tapCircle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: THEME.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 30,
  },
  tapIcon: {
    fontSize: 48, color: THEME.white, marginBottom: 4,
  },
  tapText: {
    fontSize: 18, fontWeight: '800', color: THEME.white,
  },

  controlsRow: {
    flexDirection: 'row', gap: 16, marginBottom: 20,
  },
  controlBtn: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
    backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border,
  },
  controlBtnBack: {
    backgroundColor: THEME.primaryVeryLight, borderColor: THEME.primaryLight,
  },
  controlBtnText: {
    fontSize: 15, fontWeight: '700', color: THEME.text,
  },

  vibrationToggle: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border,
  },
  vibrationText: {
    fontSize: 14, fontWeight: '600', color: THEME.textSecondary,
  },
});
