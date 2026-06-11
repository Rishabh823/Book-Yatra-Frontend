import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QRCodeDisplay({ value, size = 160, label }) {
  return (
    <View style={[styles.container, { width: size + 24, height: size + 24 }]}>
      <View style={[styles.inner, { width: size, height: size }]}>
        <Ionicons name="qr-code" size={size * 0.45} color="#1A1A1A" />
        {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  inner: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: '#1A1A1A', letterSpacing: 1 },
});
