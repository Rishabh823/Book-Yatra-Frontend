import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PointsBadge({ points = 0, size = 'md' }) {
  const isSmall = size === 'sm';
  return (
    <View style={[styles.container, isSmall && styles.containerSm]}>
      <Ionicons name="star" size={isSmall ? 10 : 14} color="#D97706" />
      <Text style={[styles.text, isSmall && styles.textSm]}>{(points || 0).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  containerSm: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#D97706' },
  textSm: { fontSize: 11 },
});
