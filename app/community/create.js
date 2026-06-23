import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';

const PRIMARY = '#D95D39';
const POST_TYPES = ['post', 'memory', 'travel_tip', 'experience'];

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [type, setType] = useState('post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!content.trim()) { showToast('Content is required', 'error'); return; }
    setSubmitting(true);
    try {
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/community', { type, title: title.trim() || undefined, content: content.trim(), tags: tagArr, isPublic: true });
      router.back();
    } catch { showToast('Failed to create post', 'error'); }
    setSubmitting(false);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create post</Text>
        <TouchableOpacity
          style={[s.postBtn, !content.trim() && s.postBtnDisabled]}
          onPress={submit}
          disabled={!content.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={s.postBtnTxt}>Post</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type */}
        <View>
          <Text style={s.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {POST_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[s.typeChip, type === t && s.typeChipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[s.typeChipText, type === t && s.typeChipTextActive]}>
                  {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Title */}
        <View>
          <Text style={s.label}>Title <Text style={s.labelOpt}>(optional)</Text></Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Add a title..."
            placeholderTextColor="#C0C0C0"
          />
        </View>

        {/* Content */}
        <View>
          <Text style={s.label}>Content <Text style={s.labelReq}>*</Text></Text>
          <TextInput
            style={[s.input, s.contentInput]}
            value={content}
            onChangeText={setContent}
            placeholder="Share your experience, tips, or memories..."
            placeholderTextColor="#C0C0C0"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Tags */}
        <View>
          <Text style={s.label}>Tags <Text style={s.labelOpt}>(comma separated)</Text></Text>
          <TextInput
            style={s.input}
            value={tags}
            onChangeText={setTags}
            placeholder="e.g. vrindavan, mathura, yatra"
            placeholderTextColor="#C0C0C0"
          />
        </View>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  cancelBtn: { paddingHorizontal: 4, minWidth: 60 },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: '#6B7280',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: '#111827',
    textAlign: 'center',
  },
  postBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: { backgroundColor: '#E5E7EB' },
  postBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: 'white',
  },

  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  labelOpt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#9CA3AF',
  },
  labelReq: {
    color: PRIMARY,
  },

  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
  },
  typeChipActive: {
    backgroundColor: PRIMARY,
  },
  typeChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: '#6B7280',
  },
  typeChipTextActive: {
    color: 'white',
    fontFamily: fonts.bodyBold,
  },

  input: {
    backgroundColor: '#F2F0ED',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#111827',
  },
  contentInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
