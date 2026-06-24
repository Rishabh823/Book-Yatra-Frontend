import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Modal,
  Dimensions, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts, radius, shadow } from '../lib/theme';
import { gallery as galleryApi } from '../lib/api';
import { useLang } from '../lib/LanguageContext';
import { useColors } from '../lib/ThemeContext';

const { width } = Dimensions.get('window');
const COL = 2;
const GAP = 10;
const TILE = (width - 48 - GAP) / COL;

const FALLBACK = [
  { _id: 'f1', type: 'image', title: 'Khatu Darshan', src: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800' },
  { _id: 'f2', type: 'image', title: 'Falgun Mela', src: 'https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg' },
  { _id: 'f3', type: 'image', title: 'Aarti', src: 'https://images.pexels.com/photos/31331442/pexels-photo-31331442.jpeg' },
  { _id: 'f4', type: 'image', title: 'Bhajan Sandhya', src: 'https://images.unsplash.com/photo-1646765495885-8a61595cb9cf?crop=entropy&cs=srgb&fm=jpg&q=85&w=800' },
  { _id: 'f5', type: 'image', title: 'Yatra', src: 'https://images.unsplash.com/photo-1577701517740-ad4aa1fc1000?crop=entropy&cs=srgb&fm=jpg&q=85&w=800' },
  { _id: 'f6', type: 'image', title: 'Temple', src: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?crop=entropy&cs=srgb&fm=jpg&q=85&w=800' },
];

export default function Gallery() {
  const router = useRouter();
  const { t } = useLang();
  const colors = useColors();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState(null);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = async () => {
    try {
      const data = await galleryApi.list();
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setItems(arr.length ? arr : FALLBACK);
    } catch {
      setItems(FALLBACK);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} testID="gallery-back"><Ionicons name="arrow-back" size={20} color={colors.textSecondary} /></TouchableOpacity>
        <View>
          <Text style={s.title}>Gallery</Text>
          <Text style={s.sub}>{t.gallerySub}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={items}
          numColumns={COL}
          keyExtractor={(it, i) => String(it._id || it.id || i)}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Ionicons name="images-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>Gallery is empty</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActive(item)}
              style={[s.tile, { height: index % 3 === 0 ? TILE * 1.3 : TILE }]}
              testID={`gallery-tile-${index}`}
            >
              <Image source={{ uri: item.src }} style={s.img} />
              {item.title ? (
                <View style={s.tileLabel}>
                  <Text style={s.tileLabelText} numberOfLines={1}>{item.title}</Text>
                </View>
              ) : null}
              {item.type === 'video' && (
                <View style={s.playBadge}><Ionicons name="play" size={14} color="#fff" /></View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Lightbox */}
      <Modal visible={!!active} transparent animationType="fade" onRequestClose={() => setActive(null)}>
        <View style={s.lightbox}>
          <TouchableOpacity style={s.close} onPress={() => setActive(null)} testID="lightbox-close">
            <Text style={s.closeText}>Close</Text>
          </TouchableOpacity>
          {active && (
            <>
              <Image source={{ uri: active.src }} style={s.lightImg} resizeMode="contain" />
              {active.title ? <Text style={s.lightTitle}>{active.title}</Text> : null}
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.textSecondary, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

  tile: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.elevated, ...shadow.soft },
  img: { width: '100%', height: '100%' },
  tileLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  tileLabelText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
  playBadge: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  close: { position: 'absolute', top: 50, right: 20, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 1 },
  closeText: { color: '#fff', fontFamily: 'Manrope_500Medium', fontSize: 14 },
  lightImg: { width: '100%', height: '80%' },
  lightTitle: { color: '#fff', fontFamily: fonts.heading, fontSize: 18, marginTop: 16, textAlign: 'center' },
});
