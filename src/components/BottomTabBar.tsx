import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { THEME, TabName } from '../constants';

type Props = {
  currentTab: TabName;
  onTabChange: (tab: TabName) => void;
};

const TABS: Array<{ key: TabName; label: string; icon: string }> = [
  { key: 'home', label: 'Ana Sayfa', icon: '🏠' },
  { key: 'statistics', label: 'İstatistik', icon: '📊' },
  { key: 'zikirmatik', label: 'Zikirmatik', icon: '📿' },
  { key: 'calendar', label: 'Takvim', icon: '📅' },
];

export default function BottomTabBar({ currentTab, onTabChange }: Props) {
  return (
    <View style={s.bar}>
      {TABS.map((tab) => {
        const active = currentTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={s.tab}
            onPress={() => onTabChange(tab.key)}
          >
            <Text style={[s.icon, active && s.iconActive]}>{tab.icon}</Text>
            <Text style={[s.label, active && s.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: THEME.white,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textLight,
  },
  labelActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
});
