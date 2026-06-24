import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import { fonts, radius, shadow } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useMembers } from "../lib/hooks/useMembers";

function MemberCard({ item, colors, s }) {
  const initials = (item.fullName || "S P")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <View style={s.card}>
      <View style={s.avatar}>
        <Text style={s.initials}>{initials}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{item.fullName}</Text>
        {item.occupation ? <Text style={s.meta}>{item.occupation}</Text> : null}
        {item.address ? (
          <View style={s.locationRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={s.meta}>{item.address}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.badge}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      </View>
    </View>
  );
}

export default function Members() {
  const router = useRouter();
  const colors = useColors();
  const { data, loading, error, refetch } = useMembers("approved");
  const [search, setSearch] = useState("");

  const s = useMemo(() => makeStyles(colors), [colors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (m) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.occupation?.toLowerCase().includes(q) ||
        m.address?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View style={s.head}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.iconBtn}
          testID="members-back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Our Members</Text>
          <Text style={s.subtitle}>{data.length} approved members</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.textSecondary}
        />
        <TextInput
          testID="members-search"
          style={s.searchInput}
          placeholder="Search by name or occupation..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={s.center}>
          <Text style={s.loadingText}>Loading members...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="wifi-outline" size={40} color={colors.textDisabled} />
          <Text style={s.errorText}>Could not load members</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={({ item }) => <MemberCard item={item} colors={colors} s={s} />}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.textDisabled}
              />
              <Text style={s.emptyText}>
                {search ? "No members found" : "No approved members yet"}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.secondary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    height: 48,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    gap: 14,
    ...shadow.soft,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.heading, fontSize: 18, color: "#fff" },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  badge: { padding: 4 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  retryText: { color: "#fff", fontFamily: fonts.bodyMedium, fontSize: 13 },
});
