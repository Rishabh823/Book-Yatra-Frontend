import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, upload as uploadApi } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';
import { DateInput } from '../../components/DateInput';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const EMPTY_FORM = {
  name: '',
  phone: '',
  licenseNo: '',
  licenseExpiry: '',
  experience: '',
  address: '',
  aadhaarNo: '',
  aadhaarFront: '',
  aadhaarBack: '',
  photo: '',
};

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingKey, setUploadingKey] = useState(null); // 'photo' | 'aadhaarFront' | 'aadhaarBack'
  const { toast, showToast, hideToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.userId?.name || d.name || '',
      phone: d.phone || '',
      licenseNo: d.licenseNo || '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
      experience: d.experience ? String(d.experience) : '',
      address: d.address || '',
      aadhaarNo: d.aadhaarNo || '',
      aadhaarFront: d.aadhaarFront || '',
      aadhaarBack: d.aadhaarBack || '',
      photo: d.photo || '',
    });
    setShowModal(true);
  };

  const pickAndUpload = async (key) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('Allow photo access to upload Aadhaar image.', "error");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingKey(key);
      const res = await uploadApi.image(result.assets[0].uri);
      if (res?.url) f(key, res.url);
      else showToast('Could not get image URL.', "error");
    } catch (e) {
      showToast(e.message || 'Try again.', "error");
    } finally {
      setUploadingKey(null);
    }
  };

  const save = async () => {
    if (!form.name || !form.phone || !form.licenseNo) {
      showToast('Name, phone and license number are required', "error"); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        experience: form.experience ? parseInt(form.experience) : undefined,
      };
      if (editing) {
        await api.put('/drivers/' + editing._id, payload);
      } else {
        await api.post('/drivers', payload);
      }
      setShowModal(false);
      load();
    } catch {
      showToast('Failed to save driver', "error");
    }
    setSaving(false);
  };

  const toggleAvailability = async (d) => {
    // Optimistic update
    setDrivers(prev => prev.map(dr => dr._id === d._id ? { ...dr, isAvailable: !dr.isAvailable } : dr));
    try {
      await api.put('/drivers/' + d._id + '/toggle', {});
    } catch {
      // Revert on failure
      setDrivers(prev => prev.map(dr => dr._id === d._id ? { ...dr, isAvailable: !d.isAvailable } : dr));
      showToast('Failed to update availability', "error");
    }
  };

  const handleDelete = (d) => {
    setDeleteTarget(d);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);
    try {
      await api.del('/drivers/' + deleteTarget._id);
      setDrivers(prev => prev.filter(dr => dr._id !== deleteTarget._id));
    } catch (e) {
      showToast(e.message || 'Failed to delete driver', "error");
    }
    setDeleteTarget(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.driverIcon, { backgroundColor: item.isAvailable ? '#DCFCE7' : '#F3F4F6' }]}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.driverPhoto} />
          ) : (
            <Ionicons
              name="person"
              size={20}
              color={item.isAvailable ? '#16A34A' : colors.textSecondary}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{item.userId?.name || item.name || 'Driver'}</Text>
          <Text style={styles.driverMeta}>License: {item.licenseNo}</Text>
          {item.phone ? <Text style={styles.driverPhone}>{item.phone}</Text> : null}
          {item.experience ? <Text style={styles.driverMeta}>{item.experience} yrs experience</Text> : null}
        </View>
        <View style={[styles.availBadge, { backgroundColor: item.isAvailable ? '#DCFCE7' : '#FEF3C7' }]}>
          <Text style={[styles.availText, { color: item.isAvailable ? '#16A34A' : '#D97706' }]}>
            {item.isAvailable ? 'Available' : 'On Duty'}
          </Text>
        </View>
      </View>
      {(item.aadhaarFront || item.aadhaarBack) && (
        <View style={styles.docRow}>
          <Ionicons name="card-outline" size={13} color="#16A34A" />
          <Text style={styles.docText}>Aadhaar verified</Text>
        </View>
      )}
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
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={14} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Drivers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

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
        onRequestClose={() => !saving && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Driver' : 'Add Driver'}</Text>
              <TouchableOpacity onPress={() => !saving && setShowModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Profile Photo */}
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={styles.photoWrap}
                  onPress={() => pickAndUpload('photo')}
                  activeOpacity={0.8}
                >
                  {form.photo ? (
                    <Image source={{ uri: form.photo }} style={styles.photoImg} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="person" size={36} color={colors.textDisabled} />
                    </View>
                  )}
                  {uploadingKey === 'photo' ? (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.photoBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.photoHint}>Driver profile photo</Text>
              </View>

              {/* Personal Info */}
              <SectionHead label="Personal Information" />
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => f('name', v)}
                placeholder="Full Name *"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={v => f('phone', v)}
                placeholder="Phone Number *"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={v => f('address', v)}
                placeholder="Residential Address"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />

              {/* License Details */}
              <SectionHead label="License Details" />
              <TextInput
                style={styles.input}
                value={form.licenseNo}
                onChangeText={v => f('licenseNo', v.toUpperCase())}
                placeholder="License Number *"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
              <DateInput
                label="License Expiry Date"
                value={form.licenseExpiry}
                onChange={v => f('licenseExpiry', v)}
                minDate={new Date()}
                style={styles.dateField}
              />
              <TextInput
                style={styles.input}
                value={form.experience}
                onChangeText={v => f('experience', v)}
                placeholder="Years of Experience"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Aadhaar */}
              <SectionHead label="Aadhaar Card" />
              <TextInput
                style={styles.input}
                value={form.aadhaarNo}
                onChangeText={v => f('aadhaarNo', v.replace(/\D/g, '').slice(0, 12))}
                placeholder="Aadhaar Number (12 digits)"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
                maxLength={12}
              />
              <View style={styles.aadhaarRow}>
                <AadhaarUpload
                  label="Front Side"
                  uri={form.aadhaarFront}
                  uploading={uploadingKey === 'aadhaarFront'}
                  onPress={() => pickAndUpload('aadhaarFront')}
                />
                <AadhaarUpload
                  label="Back Side"
                  uri={form.aadhaarBack}
                  uploading={uploadingKey === 'aadhaarBack'}
                  onPress={() => pickAndUpload('aadhaarBack')}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editing ? 'Update Driver' : 'Add Driver'}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Driver"
        message={`Remove ${deleteTarget?.name || deleteTarget?.userId?.name || 'this driver'}? This cannot be undone.`}
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

function SectionHead({ label }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionHeadTxt}>{label}</Text>
    </View>
  );
}

function AadhaarUpload({ label, uri, uploading, onPress }) {
  return (
    <TouchableOpacity style={styles.aadhaarBox} onPress={onPress} activeOpacity={0.8}>
      {uri ? (
        <Image source={{ uri }} style={styles.aadhaarImg} resizeMode="cover" />
      ) : (
        <View style={styles.aadhaarEmpty}>
          <Ionicons name="camera-outline" size={24} color={colors.textDisabled} />
        </View>
      )}
      {uploading && (
        <View style={styles.aadhaarOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
      <View style={styles.aadhaarLabelRow}>
        <Ionicons name="card" size={11} color={colors.primary} />
        <Text style={styles.aadhaarLabel}>{label}</Text>
        {uri && <Ionicons name="checkmark-circle" size={13} color="#16A34A" />}
      </View>
    </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: colors.textPrimary },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  driverMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  driverPhone: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary, marginTop: 2 },
  availBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  availText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  docText: { fontFamily: fonts.body, fontSize: 11, color: '#16A34A' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: colors.primary,
  },
  actionBtnDanger: { borderColor: colors.error },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  modalClose: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },

  photoSection: { alignItems: 'center', marginBottom: 8, marginTop: 4 },
  photoWrap: { position: 'relative', marginBottom: 6 },
  photoImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 2.5, borderColor: colors.primary },
  photoPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  photoHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  driverPhoto: { width: 44, height: 44, borderRadius: 22 },

  sectionHead: { marginTop: 12, marginBottom: 8 },
  sectionHeadTxt: {
    fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF",
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.body, fontSize: 14,
    color: colors.textPrimary, marginBottom: 10,
  },
  dateField: { marginBottom: 10 },

  aadhaarRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  aadhaarBox: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB',
  },
  aadhaarImg: { width: '100%', height: 100 },
  aadhaarEmpty: {
    height: 100, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  aadhaarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  aadhaarLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'white',
  },
  aadhaarLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textPrimary },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16, padding: 14,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
});
