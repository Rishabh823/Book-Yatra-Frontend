import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const TYPES = ['bus', 'mini-bus', 'tempo', 'car', 'van'];

export default function VehiclesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ registrationNo: '', type: 'bus', capacity: '', make: '', model: '' });
  const { toast, showToast, hideToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditing(null); setForm({ registrationNo: '', type: 'bus', capacity: '', make: '', model: '' }); setShowModal(true); };
  const openEdit = (v) => { setEditing(v); setForm({ registrationNo: v.registrationNo, type: v.type, capacity: String(v.capacity), make: v.make || '', model: v.model || '' }); setShowModal(true); };

  const save = async () => {
    if (!form.registrationNo || !form.capacity) { showToast('Registration and capacity are required', "error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) };
      if (editing) await api.put('/vehicles/' + editing._id, payload);
      else await api.post('/vehicles', payload);
      setShowModal(false);
      load();
    } catch { showToast('Failed to save vehicle', "error"); }
    setSaving(false);
  };

  const remove = (v) => {
    setDeleteTarget(v);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);
    try {
      await api.del('/vehicles/' + deleteTarget._id);
      load();
    } catch {}
    setDeleteTarget(null);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, shadow.soft]}>
      <View style={styles.cardRow}>
        <View style={styles.vehicleIcon}><Ionicons name="bus" size={20} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.regNo}>{item.registrationNo}</Text>
          <Text style={styles.vehicleMeta}>{item.type} • {item.capacity} seats • {item.make} {item.model}</Text>
          {item.currentDriverId && <Text style={styles.driverInfo}>Driver: {item.currentDriverId.name}</Text>}
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#16A34A' : '#DC2626' }]} />
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}><Ionicons name="pencil" size={14} color={colors.primary} /><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.error }]} onPress={() => remove(item)}><Ionicons name="trash-outline" size={14} color={colors.error} /><Text style={[styles.actionText, { color: colors.error }]}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="white" /></TouchableOpacity>
        <Text style={styles.title}>Vehicles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}><Ionicons name="add" size={22} color="white" /></TouchableOpacity>
      </LinearGradient>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={vehicles} keyExtractor={item => String(item._id)} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="bus-outline" size={40} color={colors.textDisabled} /><Text style={styles.emptyText}>No vehicles added yet</Text></View>}
        />
      )}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>Cancel</Text></TouchableOpacity>
            </View>
            <View style={styles.form}>
              <TextInput style={styles.input} value={form.registrationNo} onChangeText={t => setForm(f => ({ ...f, registrationNo: t.toUpperCase() }))} placeholder="Registration No. (e.g. RJ14AB1234)" placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
              <View style={styles.typeRow}>
                {TYPES.map(t => (<TouchableOpacity key={t} style={[styles.typeChip, form.type === t && styles.typeChipActive]} onPress={() => setForm(f => ({ ...f, type: t }))}><Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>{t}</Text></TouchableOpacity>))}
              </View>
              <TextInput style={styles.input} value={form.capacity} onChangeText={t => setForm(f => ({ ...f, capacity: t }))} placeholder="Capacity (seats)" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} value={form.make} onChangeText={t => setForm(f => ({ ...f, make: t }))} placeholder="Make (e.g. Ashok Leyland)" placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} value={form.model} onChangeText={t => setForm(f => ({ ...f, model: t }))} placeholder="Model" placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>{editing ? 'Update Vehicle' : 'Add Vehicle'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Vehicle"
        message={`Remove ${deleteTarget?.registrationNo}?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  regNo: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  vehicleMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  driverInfo: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  modalClose: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },
  form: { gap: 12 },
  input: { backgroundColor: '#F3F4F6', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: colors.surface },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  typeTextActive: { color: 'white' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
});
