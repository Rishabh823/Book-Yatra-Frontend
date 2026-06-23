import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { colors, fonts } from "../lib/theme";
import { resolveImageUrl } from "../lib/utils";

const PRIMARY = "#D95D39";
const FALLBACK =
  "https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (reset = false) => {
      if (reset) setLoading(true);
      try {
        const p = reset ? 1 : page;
        const res = await api.get(
          `/preferences/favorites?page=${p}&limit=20&_t=${Date.now()}`,
        );
        setTotal(res.total || 0);
        setHasMore(p < (res.pages || 1));
        setTours((prev) =>
          reset ? res.tours || [] : [...prev, ...(res.tours || [])],
        );
        if (!reset) setPage(p + 1);
      } catch {}
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [page],
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, []),
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    load(false);
  }, [hasMore, loadingMore, load]);

  const handleToggle = useCallback(
    async (id) => {
      const strId = String(id);
      setTours((prev) => prev.filter((t) => String(t._id) !== strId));
      setTotal((prev) => Math.max(0, prev - 1));
      try {
        await api.del(`/preferences/favorites/${strId}`);
      } catch {
        load(true);
      }
    },
    [load],
  );

  const renderItem = ({ item }) => {
    const img = resolveImageUrl?.(item.images?.[0]) || FALLBACK;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push(`/tour/${item._id}`)}
        activeOpacity={0.85}
      >
        <View style={s.imgWrap}>
          <Image
            source={{ uri: img }}
            style={s.img}
            defaultSource={{ uri: FALLBACK }}
          />
          {item.tourType && (
            <View style={s.typeBadge}>
              <Text style={s.typeBadgeText}>{item.tourType}</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.heartBtn}
            onPress={() => handleToggle(item._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <View style={s.info}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={s.row}>
            <Ionicons name="location" size={12} color={PRIMARY} />
            <Text style={s.meta} numberOfLines={1}>
              {item.source} → {item.destination}
            </Text>
          </View>
          <View style={s.row}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
            <Text style={s.meta}>{fmtDate(item.startDate)}</Text>
          </View>
          <View style={s.footer}>
            <Text style={s.price}>{item.price || "₹—"}</Text>
            <Text style={s.favDate}>Saved {fmtDate(item.favoritedAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      {/* Clean white header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>My favorites</Text>
          <Text style={s.headerSub}>
            {total} saved tour{total !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 32,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={PRIMARY}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="heart" size={32} color="#F472B6" />
              </View>
              <Text style={s.emptyTitle}>No favorites yet</Text>
              <Text style={s.emptySub}>
                Tap the heart icon on any tour to save it here
              </Text>
              <TouchableOpacity
                style={s.browseBtn}
                onPress={() => router.push("/(tabs)/tours")}
              >
                <Text style={s.browseBtnTxt}>Browse tours</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F4",
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: "#111827",
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 1,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  imgWrap: { height: 160, position: "relative" },
  img: { width: "100%", height: "100%" },
  typeBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: "white",
    textTransform: "capitalize",
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 14, gap: 5 },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#111827",
    marginBottom: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#9CA3AF",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: PRIMARY,
  },
  favDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#D1D5DB",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FCE7F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: "#111827",
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 4,
  },
  browseBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#fff",
  },
});
