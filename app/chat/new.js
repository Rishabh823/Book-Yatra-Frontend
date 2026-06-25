import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../lib/api';
import { fonts, radius } from '../../lib/theme';
import { useColors } from '../../lib/ThemeContext';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';

const ROLE_LABEL = {
  user: 'Users',
  volunteer: 'Volunteers',
  admin: 'Admins',
  operator: 'Operators',
  super_admin: 'Super Admins',
};

const ROLE_COLOR = {
  user: '#0284C7',
  volunteer: '#7C3AED',
  admin: '#D95D39',
  operator: '#16A34A',
  super_admin: '#DC2626',
};

const getInitials = (name) =>
  (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function NewChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { toast, showToast, hideToast } = useToast();

  const [allUsers, setAllUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load initial user list on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users/chat-list');
        setAllUsers(res.data || res || []);
      } catch {
        showToast('Could not load users', 'error');
      }
      setLoadingUsers(false);
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/users/chat-list?q=' + encodeURIComponent(query.trim()));
        setAllUsers(res.data || res || []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // When query is cleared, reload full list
  useEffect(() => {
    if (query.trim()) return;
    (async () => {
      setSearching(true);
      try {
        const res = await api.get('/users/chat-list');
        setAllUsers(res.data || res || []);
      } catch {}
      setSearching(false);
    })();
  }, [query]);

  const toggleSelect = useCallback((user) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      return exists ? prev.filter((u) => u._id !== user._id) : [...prev, user];
    });
  }, []);

  const startChat = async () => {
    if (!selected.length) { showToast('Select at least one person', 'error'); return; }
    setCreating(true);
    try {
      const type = selected.length > 1 ? 'group' : 'direct';
      const res = await api.post('/chat', {
        participantIds: selected.map((u) => u._id),
        type,
        name: selected.length > 1
          ? groupName || selected.map((u) => u.name).join(', ')
          : undefined,
      });
      router.replace('/chat/' + res.data._id);
    } catch {
      showToast('Failed to create chat', 'error');
    }
    setCreating(false);
  };

  // Group users by role for SectionList
  const sections = useMemo(() => {
    const grouped = {};
    for (const u of allUsers) {
      const role = u.role || 'user';
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(u);
    }
    const order = ['user', 'volunteer', 'admin', 'operator', 'super_admin'];
    return order
      .filter((r) => grouped[r]?.length > 0)
      .map((r) => ({ title: ROLE_LABEL[r] || r, role: r, data: grouped[r] }));
  }, [allUsers]);

  const renderUser = useCallback(({ item }) => {
    const isSelected = !!selected.find((u) => u._id === item._id);
    const roleColor = ROLE_COLOR[item.role] || '#6B7280';
    return (
      <TouchableOpacity
        style={[s.userRow, isSelected && s.userRowSelected]}
        onPress={() => toggleSelect(item)}
        activeOpacity={0.75}
      >
        <View style={[s.avatar, { backgroundColor: roleColor + '22' }]}>
          <Text style={[s.avatarText, { color: roleColor }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.userName} numberOfLines={1}>{item.name}</Text>
          <View style={s.userMeta}>
            <View style={[s.rolePill, { backgroundColor: roleColor + '18' }]}>
              <Text style={[s.roleText, { color: roleColor }]}>
                {ROLE_LABEL[item.role] || item.role}
              </Text>
            </View>
            {item.email ? (
              <Text style={s.userEmail} numberOfLines={1}>{item.email}</Text>
            ) : null}
          </View>
        </View>
        {isSelected ? (
          <View style={s.checkCircle}>
            <Ionicons name="checkmark" size={14} color="white" />
          </View>
        ) : (
          <View style={s.emptyCircle} />
        )}
      </TouchableOpacity>
    );
  }, [selected, s, toggleSelect]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={s.sectionHeader}>
      <View style={[s.sectionDot, { backgroundColor: ROLE_COLOR[section.role] || '#6B7280' }]} />
      <Text style={s.sectionTitle}>{section.title}</Text>
      <Text style={s.sectionCount}>{section.data.length}</Text>
    </View>
  ), [s]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>New Message</Text>
        <TouchableOpacity
          style={[s.startBtn, !selected.length && s.startBtnDisabled]}
          onPress={startChat}
          disabled={!selected.length || creating}
        >
          {creating
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={s.startText}>Start</Text>}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
        />
        {(searching) ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Group name (when multiple selected) */}
      {selected.length > 1 && (
        <View style={s.groupNameRow}>
          <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={s.groupNameInput}
            placeholder="Group name (optional)"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <View style={s.selectedBar}>
          <FlatList
            horizontal
            data={selected}
            keyExtractor={(u) => u._id}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.chip} onPress={() => toggleSelect(item)}>
                <View style={[s.chipAvatar, { backgroundColor: (ROLE_COLOR[item.role] || '#6B7280') + '22' }]}>
                  <Text style={[s.chipAvatarText, { color: ROLE_COLOR[item.role] || '#6B7280' }]}>
                    {getInitials(item.name)}
                  </Text>
                </View>
                <Text style={s.chipName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                <Ionicons name="close-circle" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* User list */}
      {loadingUsers ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading users...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={44} color={colors.textDisabled} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No users found</Text>
          {query.length > 0 && (
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>Try a different search term</Text>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, paddingTop: 4 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  startBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 64,
    alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: colors.borderSubtle },
  startText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'white' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    height: 46,
    paddingHorizontal: 14,
    margin: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },

  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    height: 44,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  groupNameInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },

  selectedBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    maxWidth: 140,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: { fontFamily: fonts.bodyBold, fontSize: 9 },
  chipName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, flex: 1 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingTop: 14,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sectionCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textDisabled,
    backgroundColor: colors.elevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },

  // User rows
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  userRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0A',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  userName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  roleText: { fontFamily: fonts.bodyMedium, fontSize: 10 },
  userEmail: { flex: 1, fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  loadingText: { fontFamily: fonts.body, fontSize: 14, marginTop: 8 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  emptySub: { fontFamily: fonts.body, fontSize: 13 },
});
