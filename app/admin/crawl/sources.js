import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, useWindowDimensions, Modal, Switch, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AdminShell, SectionHeader } from '../../../lib/AdminScreen';
import { colors, fonts } from '../../../lib/theme';
import { crawlApi } from '../../../lib/api';

const STATUS_COLOR = {
  active: { bg: '#F0FDF4', text: '#16A34A' },
  paused: { bg: '#FFFBEB', text: '#D97706' },
  error:  { bg: '#FEF2F2', text: '#DC2626' },
};

const CATEGORIES = ['religious', 'adventure', 'cultural', 'nature', 'heritage', 'pilgrimage', 'wellness', 'other'];
const CRAWL_TYPES = ['static', 'dynamic'];

const DEFAULT_FORM = {
  name: '', url: '', description: '', crawlType: 'static', frequency: '60',
  maxPages: '5', category: 'religious', enabled: true,
  selectors: { container: '', title: '', description: '', price: '', image: '', link: '', location: '', duration: '', nextPage: '' },
};

export default function CrawlSources() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 24 : 16;

  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(null);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('basic'); // 'basic' | 'selectors'

  const load = useCallback(async () => {
    try {
      const res = await crawlApi.getSources();
      setSources(res.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  function openAdd() {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setTab('basic');
    setModal(true);
  }

  function openEdit(src) {
    setEditId(src._id);
    setForm({
      name: src.name || '',
      url: src.url || '',
      description: src.description || '',
      crawlType: src.crawlType || 'static',
      frequency: String(src.frequency || 60),
      maxPages: String(src.maxPages || 5),
      category: src.category || 'religious',
      enabled: src.enabled !== false,
      selectors: {
        container: src.selectors?.container || '',
        title: src.selectors?.title || '',
        description: src.selectors?.description || '',
        price: src.selectors?.price || '',
        image: src.selectors?.image || '',
        link: src.selectors?.link || '',
        location: src.selectors?.location || '',
        duration: src.selectors?.duration || '',
        nextPage: src.selectors?.nextPage || '',
      },
    });
    setTab('basic');
    setModal(true);
  }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        frequency: parseInt(form.frequency) || 60,
        maxPages: parseInt(form.maxPages) || 5,
      };
      if (editId) {
        await crawlApi.updateSource(editId, payload);
      } else {
        await crawlApi.createSource(payload);
      }
      setModal(false);
      await load();
    } catch {}
    finally { setSaving(false); }
  }

  async function handleToggle(src) {
    try {
      await crawlApi.toggleSource(src._id);
      await load();
    } catch {}
  }

  async function handleSync(src) {
    setSyncing(src._id);
    try {
      await crawlApi.syncSource(src._id);
      await load();
    } catch {}
    finally { setSyncing(null); }
  }

  async function handleDelete(src) {
    try {
      await crawlApi.deleteSource(src._id);
      await load();
    } catch {}
  }

  function setSelector(key, val) {
    setForm(f => ({ ...f, selectors: { ...f.selectors, [key]: val } }));
  }

  const SELECTOR_FIELDS = [
    { key: 'container',   label: 'Container',   hint: 'e.g. .tour-card' },
    { key: 'title',       label: 'Title',        hint: 'e.g. h2.title' },
    { key: 'description', label: 'Description',  hint: 'e.g. .desc' },
    { key: 'price',       label: 'Price',        hint: 'e.g. .price' },
    { key: 'image',       label: 'Image',        hint: 'e.g. img' },
    { key: 'link',        label: 'Link (href)',   hint: 'e.g. a.book-link' },
    { key: 'location',    label: 'Location',     hint: 'e.g. .from-city' },
    { key: 'duration',    label: 'Duration',     hint: 'e.g. .days' },
    { key: 'nextPage',    label: 'Next Page',    hint: 'e.g. .pagination a.next' },
  ];

  return (
    <AdminShell title="Crawl Sources" subtitle="Configure websites to aggregate" rightIcon="add" onRightPress={openAdd}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : sources.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="globe-outline" size={40} color="#D1D5DB" />
            <Text style={s.emptyTitle}>No sources yet</Text>
            <Text style={s.emptySub}>Add your first crawl source to start aggregating tours</Text>
            <TouchableOpacity style={s.addBtn} onPress={openAdd}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addBtnTxt}>Add Source</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: px, paddingTop: 4 }}>
            <SectionHeader title={`${sources.length} Source${sources.length !== 1 ? 's' : ''}`} action="+ Add" onAction={openAdd} />
            {sources.map((src) => {
              const sc = STATUS_COLOR[src.status] || STATUS_COLOR.paused;
              return (
                <View key={src._id} style={s.card}>
                  <View style={s.cardHead}>
                    <View style={[s.cardIcon, { backgroundColor: src.enabled ? '#F5F3FF' : '#F3F4F6' }]}>
                      <Ionicons name="globe-outline" size={20} color={src.enabled ? '#7C3AED' : '#9CA3AF'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName} numberOfLines={1}>{src.name}</Text>
                      <Text style={s.cardUrl} numberOfLines={1}>{src.url}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusTxt, { color: sc.text }]}>{src.status}</Text>
                    </View>
                  </View>

                  <View style={s.cardStats}>
                    <StatChip icon="download-outline" label={`${src.totalImported ?? 0} imported`} />
                    <StatChip icon="refresh-outline" label={`${src.totalUpdated ?? 0} updated`} />
                    <StatChip icon="time-outline" label={`${src.frequency ?? 60}min`} />
                    <StatChip icon="copy-outline" label={`${src.maxPages ?? 5} pages`} />
                  </View>

                  {src.lastCrawledAt && (
                    <Text style={s.lastCrawled}>
                      Last crawled: {new Date(src.lastCrawledAt).toLocaleString()}
                    </Text>
                  )}
                  {src.lastErrorMessage && src.status === 'error' && (
                    <View style={s.errRow}>
                      <Ionicons name="warning-outline" size={13} color="#DC2626" />
                      <Text style={s.errTxt} numberOfLines={1}>{src.lastErrorMessage}</Text>
                    </View>
                  )}

                  <View style={s.cardActions}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: src.enabled ? '#FFFBEB' : '#F0FDF4' }]}
                      onPress={() => handleToggle(src)}
                    >
                      <Ionicons name={src.enabled ? 'pause' : 'play'} size={14} color={src.enabled ? '#D97706' : '#16A34A'} />
                      <Text style={[s.actionTxt, { color: src.enabled ? '#D97706' : '#16A34A' }]}>
                        {src.enabled ? 'Pause' : 'Resume'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#F0F9FF' }]}
                      onPress={() => handleSync(src)}
                      disabled={syncing === src._id}
                    >
                      {syncing === src._id ? (
                        <ActivityIndicator size="small" color="#0284C7" />
                      ) : (
                        <Ionicons name="sync-outline" size={14} color="#0284C7" />
                      )}
                      <Text style={[s.actionTxt, { color: '#0284C7' }]}>Sync Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F5F3FF' }]} onPress={() => openEdit(src)}>
                      <Ionicons name="pencil-outline" size={14} color="#7C3AED" />
                      <Text style={[s.actionTxt, { color: '#7C3AED' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(src)}>
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={[s.actionTxt, { color: '#DC2626' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Modal Header */}
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => setModal(false)} style={s.mClose}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={s.mTitle}>{editId ? 'Edit Source' : 'Add Source'}</Text>
            <TouchableOpacity style={s.mSave} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.mSaveTxt}>Save</Text>}
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            {['basic', 'selectors'].map(t => (
              <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t === 'basic' ? 'Basic Info' : 'CSS Selectors'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
            {tab === 'basic' ? (
              <>
                <Field label="Source Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Make My Trip Tours" />
                <Field label="Website URL *" value={form.url} onChangeText={v => setForm(f => ({ ...f, url: v }))} placeholder="https://example.com/tours" keyboardType="url" />
                <Field label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief description" multiline />

                <Text style={s.fieldLabel}>Crawl Type</Text>
                <View style={s.segRow}>
                  {CRAWL_TYPES.map(t => (
                    <TouchableOpacity key={t} style={[s.seg, form.crawlType === t && s.segActive]} onPress={() => setForm(f => ({ ...f, crawlType: t }))}>
                      <Text style={[s.segTxt, form.crawlType === t && s.segTxtActive]}>{t === 'static' ? 'Static (Cheerio)' : 'Dynamic (Playwright)'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {CATEGORIES.map(c => (
                      <TouchableOpacity key={c} style={[s.chip, form.category === c && s.chipActive]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                        <Text style={[s.chipTxt, form.category === c && s.chipTxtActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={s.rowFields}>
                  <View style={{ flex: 1 }}>
                    <Field label="Frequency (min)" value={form.frequency} onChangeText={v => setForm(f => ({ ...f, frequency: v }))} keyboardType="numeric" placeholder="60" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Max Pages" value={form.maxPages} onChangeText={v => setForm(f => ({ ...f, maxPages: v }))} keyboardType="numeric" placeholder="5" />
                  </View>
                </View>

                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Enabled</Text>
                  <Switch value={form.enabled} onValueChange={v => setForm(f => ({ ...f, enabled: v }))} trackColor={{ true: colors.primary }} />
                </View>
              </>
            ) : (
              <>
                <View style={s.selectorInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
                  <Text style={s.selectorInfoTxt}>
                    Enter CSS selectors to extract data from the website. Use browser DevTools to find the right selectors.
                  </Text>
                </View>
                {SELECTOR_FIELDS.map(({ key, label, hint }) => (
                  <Field
                    key={key}
                    label={label}
                    value={form.selectors[key]}
                    onChangeText={v => setSelector(key, v)}
                    placeholder={hint}
                    mono
                  />
                ))}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </AdminShell>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, mono }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 }, mono && { fontFamily: 'monospace', fontSize: 12 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function StatChip({ icon, label }) {
  return (
    <View style={s.chip2}>
      <Ionicons name={icon} size={11} color="#6B7280" />
      <Text style={s.chip2Txt}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { paddingTop: 80, alignItems: 'center' },
  empty:  { paddingTop: 80, alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#111827', marginTop: 16 },
  emptySub:   { fontFamily: fonts.body, fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#D95D39', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addBtnTxt:  { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },

  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, padding: 14 },
  cardHead:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardName:   { fontFamily: fonts.bodyBold, fontSize: 14, color: '#111827' },
  cardUrl:    { fontFamily: fonts.body, fontSize: 11, color: '#6B7280', marginTop: 1 },
  statusBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusTxt:  { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },

  cardStats:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip2:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chip2Txt:   { fontFamily: fonts.body, fontSize: 10, color: '#6B7280' },

  lastCrawled:{ fontFamily: fonts.body, fontSize: 10, color: '#9CA3AF', marginBottom: 4 },
  errRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  errTxt:     { fontFamily: fonts.body, fontSize: 10, color: '#DC2626', flex: 1 },

  cardActions:{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#F2F2F2', paddingTop: 10, marginTop: 4 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionTxt:  { fontFamily: fonts.bodyBold, fontSize: 11 },

  // Modal
  mHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  mClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  mTitle:   { flex: 1, fontFamily: fonts.heading, fontSize: 18, color: '#111827', marginLeft: 12 },
  mSave:    { backgroundColor: '#D95D39', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  mSaveTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' },

  tabRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab:       { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#D95D39' },
  tabTxt:    { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#6B7280' },
  tabTxtActive:{ color: '#D95D39', fontFamily: fonts.bodyBold },

  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#374151', marginBottom: 6, letterSpacing: 0.3 },
  input:      { backgroundColor: '#F2F0ED', borderRadius: 10, paddingHorizontal: 14, height: 48, fontFamily: fonts.body, fontSize: 14, color: '#111827' },
  rowFields:  { flexDirection: 'row', gap: 10 },
  switchRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F2F2F2', marginTop: 4 },
  switchLabel:{ fontFamily: fonts.bodyBold, fontSize: 14, color: '#111827' },

  segRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  seg:      { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff' },
  segActive:{ backgroundColor: '#FEF3F0', borderColor: '#D95D39' },
  segTxt:   { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6B7280' },
  segTxtActive:{ color: '#D95D39', fontFamily: fonts.bodyBold },

  chip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive:{ backgroundColor: '#FEF3F0', borderColor: '#D95D39' },
  chipTxt:  { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  chipTxtActive:{ color: '#D95D39', fontFamily: fonts.bodyBold },

  selectorInfo:  { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 16 },
  selectorInfoTxt:{ flex: 1, fontFamily: fonts.body, fontSize: 12, color: '#1E40AF', lineHeight: 18 },
});
