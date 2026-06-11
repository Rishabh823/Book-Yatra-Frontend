import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';

export default function NotificationBell({ color = '#1A1A1A', size = 24 }) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setCount(res.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchCount();
    const interval = setInterval(() => { if (mounted) fetchCount(); }, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [fetchCount]);

  return (
    <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.container}>
      <Ionicons name={count > 0 ? 'notifications' : 'notifications-outline'} size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#DC2626', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: 'white', fontSize: 9, fontFamily: 'Manrope_700Bold' },
});
