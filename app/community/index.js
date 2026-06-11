import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const TYPES = [
  { k: 'all',        label: 'All' },
  { k: 'post',       label: 'Post' },
  { k: 'memory',     label: 'Memory' },
  { k: 'travel_tip', label: 'Travel Tip' },
  { k: 'experience', label: 'Experience' },
  { k: 'review',     label: 'Review' },
];

const TYPE_COLORS = {
  post:        { bg: '#EDE9FE', color: '#7C3AED' },
  memory:      { bg: '#FEE8E2', color: '#D95D39' },
  travel_tip:  { bg: '#DBEAFE', color: '#2563EB' },
  experience:  { bg: '#DCFCE7', color: '#16A34A' },
  review:      { bg: '#FEF3C7', color: '#D97706' },
};

const fmtTime = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000)  return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + 'd ago';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

function Avatar({ name, size = 38 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.42, color: 'white' }}>{(name || 'U')[0].toUpperCase()}</Text>
    </View>
  );
}

const PostCard = ({ post, onLike, onPress }) => {
  const authorName = (typeof post.authorId === 'object' ? post.authorId?.name : null) || post.author?.name || 'Anonymous';
  const tc = TYPE_COLORS[post.type] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <TouchableOpacity style={[s.card, shadow?.card]} onPress={onPress} activeOpacity={0.92}>
      <View style={s.authorRow}>
        <Avatar name={authorName} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>{authorName}</Text>
          <Text style={s.postTime}>{fmtTime(post.createdAt)}</Text>
        </View>
        <View style={[s.typeBadge, { backgroundColor: tc.bg }]}>
          <Text style={[s.typeText, { color: tc.color }]}>{post.type?.replace('_', ' ')}</Text>
        </View>
      </View>

      {post.title && <Text style={s.postTitle} numberOfLines={2}>{post.title}</Text>}
      <Text style={s.postContent} numberOfLines={3}>{post.content}</Text>

      {post.images?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }}>
          {post.images.map((img, i) => (
            <Image key={i} source={{ uri: img }} style={s.postImage} />
          ))}
        </ScrollView>
      )}

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.action} onPress={() => onLike(post._id)}>
          <Ionicons name="heart-outline" size={16} color="#EF4444" />
          <Text style={s.actionText}>{post.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={s.actionText}>{post.commentCount || post.comments?.length || 0}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {post.tags?.slice(0, 2).map(tag => (
          <View key={tag} style={s.tag}><Text style={s.tagText}>#{tag}</Text></View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (reset = false, postType = type) => {
    if (reset) { setLoading(true); setPosts([]); }
    try {
      const p = reset ? 1 : page;
      const res = await api.get('/community?page=' + p + '&type=' + postType + '&limit=10');
      // backend returns { success, data: [], total, ... }
      const newPosts = Array.isArray(res) ? res : (res.data || []);
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 10);
      if (!reset) setPage(p + 1);
      else setPage(2);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [page, type]);

  useFocusEffect(useCallback(() => { fetchPosts(true, 'all'); setType('all'); }, []));

  const changeType = (t) => {
    setType(t);
    setPage(1);
    fetchPosts(true, t);
  };

  const handleLike = async (postId) => {
    try {
      await api.post('/community/' + postId + '/like', {});
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p));
    } catch {}
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={s.header}>
        <View>
          <Text style={s.title}>Community</Text>
          <Text style={s.subtitle}>Share your journey</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/community/create')}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filter chips — horizontal */}
      <View style={s.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersContent}
        >
          {TYPES.map(t => (
            <TouchableOpacity
              key={t.k}
              style={[s.filterChip, type === t.k && s.filterChipActive]}
              onPress={() => changeType(t.k)}
            >
              <Text style={[s.filterText, type === t.k && s.filterTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item._id)}
          renderItem={({ item }) => (
            <PostCard post={item} onLike={handleLike} onPress={() => router.push('/community/' + item._id)} />
          )}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(true); }} tintColor={colors.primary} />
          }
          onEndReached={() => hasMore && !loading && fetchPosts()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Be the first to share!</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/community/create')}>
                <Ionicons name="add" size={16} color="white" />
                <Text style={s.emptyBtnText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  createBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  filtersWrapper: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filtersContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#F3F4F6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  filterTextActive: { color: 'white' },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, gap: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  postTime: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  typeText: { fontFamily: fonts.bodyMedium, fontSize: 11, textTransform: 'capitalize' },
  postTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  postContent: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  postImage: { width: 160, height: 120, borderRadius: radius.lg, marginLeft: 14, marginRight: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#FEE8E2' },
  tagText: { fontFamily: fonts.body, fontSize: 11, color: colors.primary },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.pill, marginTop: 4 },
  emptyBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'white' },
});
