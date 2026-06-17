import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

export default function NewChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const search = async (text) => {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get('/users/search?q=' + encodeURIComponent(text));
      setResults(Array.isArray(res) ? res : res.users || res.data || []);
    } catch {}
    setSearching(false);
  };

  const toggleSelect = (user) => {
    setSelected(prev => {
      const exists = prev.find(u => u._id === user._id);
      return exists ? prev.filter(u => u._id !== user._id) : [...prev, user];
    });
  };

  const startChat = async () => {
    if (!selected.length) { showToast("Select at least one person", "error"); return; }
    setCreating(true);
    try {
      const type = selected.length > 1 ? 'group' : 'direct';
      const res = await api.post('/chat', { participantIds: selected.map(u => u._id), type, name: selected.length > 1 ? groupName || selected.map(u => u.name).join(', ') : undefined });
      router.replace('/chat/' + res.data._id);
    } catch (err) {
      showToast("Failed to create chat", "error");
    }
    setCreating(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <TouchableOpacity style={[styles.startBtn, !selected.length && styles.startBtnDisabled]} onPress={startChat} disabled={!selected.length || creating}>
          {creating ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.startText}>Start</Text>}
        </TouchableOpacity>
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search by name..." value={query} onChangeText={search} placeholderTextColor={colors.textSecondary} autoFocus />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      {selected.length > 1 && (
        <View style={styles.groupNameRow}>
          <TextInput style={styles.groupNameInput} placeholder="Group name (optional)" value={groupName} onChangeText={setGroupName} placeholderTextColor={colors.textSecondary} />
        </View>
      )}
      {selected.length > 0 && (
        <ScrollView horizontal style={styles.selectedRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} showsHorizontalScrollIndicator={false}>
          {selected.map(u => (
            <TouchableOpacity key={u._id} style={styles.selectedChip} onPress={() => toggleSelect(u)}>
              <Text style={styles.selectedName}>{u.name}</Text>
              <Ionicons name="close-circle" size={14} color="white" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {results.map(user => (
          <TouchableOpacity key={user._id} style={[styles.userRow, shadow.soft, selected.find(u => u._id === user._id) && styles.userRowSelected]} onPress={() => toggleSelect(user)}>
            <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{(user.name || 'U')[0].toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userRole}>{user.role || 'user'}</Text>
            </View>
            {selected.find(u => u._id === user._id) && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
        {!results.length && query.length >= 2 && !searching && (
          <View style={styles.empty}><Text style={styles.emptyText}>No users found</Text></View>
        )}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.secondary },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: 'white' },
  startBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  startBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.3)' },
  startText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'white' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  groupNameRow: { paddingHorizontal: 16, marginBottom: 8 },
  groupNameInput: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  selectedRow: { maxHeight: 50, marginBottom: 4 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  selectedName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'white' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12 },
  userRowSelected: { borderWidth: 1.5, borderColor: colors.primary },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontFamily: fonts.bodyBold, fontSize: 16, color: 'white' },
  userName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  userRole: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
