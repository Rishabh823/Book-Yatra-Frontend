import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const POST_TYPES = ['post','memory','travel_tip','experience'];

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [type, setType] = useState('post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!content.trim()) return Alert.alert('Error', 'Content is required');
    setSubmitting(true);
    try {
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/community', { type, title: title.trim() || undefined, content: content.trim(), tags: tagArr, isPublic: true });
      router.back();
    } catch { Alert.alert('Error', 'Failed to create post'); }
    setSubmitting(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
        <TouchableOpacity style={[styles.postBtn, !content.trim() && styles.postBtnDisabled]} onPress={submit} disabled={!content.trim() || submitting}>
          {submitting ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.postText}>Post</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 20 }}>
        <View>
          <Text style={styles.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {POST_TYPES.map(t => (
              <TouchableOpacity key={t} style={[styles.typeChip, type === t && styles.typeChipActive]} onPress={() => setType(t)}>
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View>
          <Text style={styles.label}>Title (optional)</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Add a title..." placeholderTextColor={colors.textSecondary} />
        </View>
        <View>
          <Text style={styles.label}>Content *</Text>
          <TextInput style={[styles.input, styles.contentInput]} value={content} onChangeText={setContent} placeholder="Share your experience, tips, or memories..." placeholderTextColor={colors.textSecondary} multiline />
        </View>
        <View>
          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="e.g. vrindavan, mathura, yatra" placeholderTextColor={colors.textSecondary} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary, textAlign: 'center' },
  postBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  postBtnDisabled: { backgroundColor: '#E5E7EB' },
  postText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'white' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E5E7EB' },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize' },
  typeChipTextActive: { color: 'white' },
  input: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: '#E5E7EB' },
  contentInput: { minHeight: 120, textAlignVertical: 'top' },
});
