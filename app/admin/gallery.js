import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, TextInput, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AdminShell } from '../../lib/AdminScreen';
import { fonts, radius } from '../../lib/theme';
import { gallery as galleryApi, api } from '../../lib/api';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import { useColors } from "../../lib/ThemeContext";

export default function AdminGallery() {
  const colors = useColors();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', type: 'photo', uri: null, videoUrl: '' });
  const [filter, setFilter] = useState('all'); // all | photo | video
  const { toast, showToast, hideToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = async () => {
    try {
      const res = await galleryApi.list();
      setItems(Array.isArray(res) ? res : res?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Please allow access to your photo library.', "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewItem((n) => ({ ...n, uri: result.assets[0].uri }));
    }
  };

  const uploadItem = async () => {
    if (!newItem.title.trim()) {
      showToast('Please enter a title', "error");
      return;
    }
    if (newItem.type === 'photo' && !newItem.uri) {
      showToast('Please select a photo to upload', "error");
      return;
    }
    if (newItem.type === 'video' && !newItem.videoUrl.trim()) {
      showToast('Please enter a video URL (YouTube embed URL)', "error");
      return;
    }

    setUploading(true);
    try {
      if (newItem.type === 'photo') {
        await galleryApi.upload(newItem.uri, newItem.title, 'photo');
      } else {
        await api.post('/gallery', { type: 'video', src: newItem.videoUrl.trim(), title: newItem.title.trim() });
      }
      showToast('Gallery item added successfully', "success");
      setShowModal(false);
      setNewItem({ title: '', type: 'photo', uri: null, videoUrl: '' });
      load();
    } catch (e) {
      showToast(e.message || 'Please try again', "error");
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = (item) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);
    try {
      await galleryApi.delete(deleteTarget._id);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
    } catch (e) {
      showToast(e.message || 'Failed to delete', "error");
    }
    setDeleteTarget(null);
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  return (
    <AdminShell title="Gallery" subtitle={`${items.length} items`}>
      {/* Filter tabs + upload button */}
      <View style={s.toolbar}>
        <View style={s.filterRow}>
          {['all', 'photo', 'video'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.uploadBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.uploadBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it._id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="images-outline" size={48} color={colors.textDisabled} />
              <Text style={{ fontFamily: fonts.body, color: colors.textSecondary, marginTop: 8 }}>No gallery items</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
                <Text style={s.emptyBtnText}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.gridItem}>
              {item.type === 'photo' ? (
                <Image source={{ uri: item.src }} style={s.gridImg} resizeMode="cover" />
              ) : (
                <View style={[s.gridImg, s.videoPlaceholder]}>
                  <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
              )}
              <View style={s.gridOverlay}>
                <Text style={s.gridTitle} numberOfLines={1}>{item.title}</Text>
                <TouchableOpacity style={s.deleteIcon} onPress={() => deleteItem(item)}>
                  <Ionicons name="trash" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              {item.type === 'video' && (
                <View style={s.videoBadge}>
                  <Ionicons name="videocam" size={10} color="#fff" />
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Upload Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add to Gallery</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type selector */}
              <Text style={s.modalLabel}>Type</Text>
              <View style={s.typeRow}>
                {['photo', 'video'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, newItem.type === t && s.typeChipActive]}
                    onPress={() => setNewItem((n) => ({ ...n, type: t, uri: null, videoUrl: '' }))}
                  >
                    <Ionicons name={t === 'photo' ? 'image-outline' : 'videocam-outline'} size={16} color={newItem.type === t ? '#fff' : colors.textSecondary} />
                    <Text style={[s.typeChipText, newItem.type === t && { color: '#fff' }]}>
                      {t === 'photo' ? 'Photo' : 'Video'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={s.modalLabel}>Title</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.modalInput}
                  value={newItem.title}
                  onChangeText={(v) => setNewItem((n) => ({ ...n, title: v }))}
                  placeholder="Enter a title for this item"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              {newItem.type === 'photo' ? (
                <>
                  <Text style={s.modalLabel}>Photo</Text>
                  <TouchableOpacity style={s.pickImageBtn} onPress={pickImage}>
                    {newItem.uri ? (
                      <Image source={{ uri: newItem.uri }} style={s.previewImg} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                        <Text style={s.pickImageText}>Tap to select photo</Text>
                        <Text style={s.pickImageHint}>Uploads to Cloudinary</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {newItem.uri && (
                    <TouchableOpacity style={s.changePhotoLink} onPress={pickImage}>
                      <Text style={s.changePhotoText}>Change photo</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <Text style={s.modalLabel}>YouTube Embed URL</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={s.modalInput}
                      value={newItem.videoUrl}
                      onChangeText={(v) => setNewItem((n) => ({ ...n, videoUrl: v }))}
                      placeholder="https://youtube.com/embed/..."
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                </>
              )}

              <TouchableOpacity style={s.uploadCta} onPress={uploadItem} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#fff" />
                    <Text style={s.uploadCtaText}>Upload & Add to Gallery</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete?"
        message={`Remove "${deleteTarget?.title}" from gallery?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive
      />
    </AdminShell>
  );
}

const GRID_W = 160;
const makeStyles = (colors) => StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 999 },
  uploadBtnText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 999 },
  emptyBtnText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },

  gridItem: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.borderSubtle },
  gridImg: { width: '100%', aspectRatio: 1 },
  videoPlaceholder: { backgroundColor: '#1E1B4B', alignItems: 'center', justifyContent: 'center' },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 6 },
  gridTitle: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#fff', flex: 1 },
  deleteIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(220,38,38,0.85)', alignItems: 'center', justifyContent: 'center' },
  videoBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  modalLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 14 },
  inputWrap: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  modalInput: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  pickImageBtn: { height: 160, borderRadius: 20, borderWidth: 2, borderColor: colors.primary + "40", borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  pickImageText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary, marginTop: 8 },
  pickImageHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  changePhotoLink: { alignItems: 'center', marginTop: 8 },
  changePhotoText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  uploadCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 999, backgroundColor: colors.primary, marginTop: 24, marginBottom: 8 },
  uploadCtaText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  cancelBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
});
