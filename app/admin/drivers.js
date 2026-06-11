import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', licenseNumber: '', licenseExpiry: '' });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.userId?.name || '',
      phone: d.phone || '',
      licenseNumber: d.licenseNumber || '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.phone || !form.licenseNumber) {
      return Alert.alert('Error', 'Name, phone and license number are required');
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put('/drivers/' + editing._id, form);
      } else {
        await api.post('/drivers', form);
      }
      setShowModal(false);
      load();
    } catch {
      Alert.alert('Error', 'Failed to save driver');
    }
    setSaving(false);
  };

  const toggleAvailability = async (d) => {
    try {
      await api.put('/drivers/' + d._id + '/availability', {});
      setDrivers(prev =>
        prev.map(dr =>
          dr._id === d._id ? { ...dr, isAvailable: !dr.isAvailable } : dr
        )
      );
    } catch {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, shadow.soft]}>
      <View style={styles.cardRow}>
        <View style={[styles.driverIcon, { backgroundColor: item.isAvailable ? '#DCFCE7' : '#F3F4F6' }]}>
          <Ionicons
            name="person"
            size={20}
            color={item.isAvailable ? '#16A34A' : colors.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{item.userId?.name || item.name || 'Driver'}</Text>
          <Text style={styles.driverMeta}>License: {item.licenseNumber}</Text>
          {item.phone ? <Text style={styles.driverPhone}>{item.phone}</Text> : null}
        </View>
        <View style={[styles.availBadge, { backgroundColor: item.isAvailable ? '#DCFCE7' : '#FEF3C7' }]}>
          <Text style={[styles.availText, { color: item.isAvailable ? '#16A34A' : '#D97706' }]}>
            {item.isAvailable ? 'Available' : 'On Duty'}
          </Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleAvailability(item)}>
          <Ionicons
            name={item.isAvailable ? 'pause-circle-outline' : 'play-circle-outline'}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.actionText}>{item.isAvailable ? 'Set Busy' : 'Set Available'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Ionicons name="pencil" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Drivers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={40} color={colors.textDisabled} />
              <Text style={styles.emptyText}>No drivers added yet</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Driver' : 'Add Driver'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
                placeholder="Full Name"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={t => setForm(f => ({ ...f, phone: t }))}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={form.licenseNumber}
                onChangeText={t => setForm(f => ({ ...f, licenseNumber: t.toUpperCase() }))}
                placeholder="License Number"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                value={form.licenseExpiry}
                onChangeText={t => setForm(f => ({ ...f, licenseExpiry: t }))}
                placeholder="License Expiry (YYYY-MM-DD)"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editing ? 'Update Driver' : 'Add Driver'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  driverMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  driverPhone: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary, marginTop: 2 },
  availBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  availText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  modalClose: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },
  form: { gap: 12 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
});
