import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const DOC_TYPES = {
  aadhaar: { icon: "card", label: "Aadhaar", color: "#2563EB", bg: "#DBEAFE" },
  passport: {
    icon: "airplane",
    label: "Passport",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  visa: { icon: "earth", label: "Visa", color: "#0891B2", bg: "#CFFAFE" },
  driving_license: {
    icon: "car",
    label: "License",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  pan: {
    icon: "document-text",
    label: "PAN Card",
    color: "#16A34A",
    bg: "#DCFCE7",
  },
  other: { icon: "document", label: "Other", color: "#6B7280", bg: "#F3F4F6" },
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const getExpiryStatus = (expiresAt) => {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000);
  if (days <= 0) return { color: "#DC2626", label: "Expired" };
  if (days <= 30) return { color: "#DC2626", label: days + " days left" };
  if (days <= 90) return { color: "#D97706", label: days + " days left" };
  return { color: "#16A34A", label: fmtDate(expiresAt) };
};

export default function DocumentVaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/documents");
      setDocs(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (doc) => {
    Alert.alert(
      "Delete Document",
      'Delete "' + doc.title + '"? This cannot be undone.',
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.del("/documents/" + doc._id);
              setDocs((prev) => prev.filter((d) => d._id !== doc._id));
            } catch {
              Alert.alert("Error", "Failed to delete");
            }
          },
        },
      ],
    );
  };

  const renderDoc = ({ item }) => {
    const type = DOC_TYPES[item.type] || DOC_TYPES.other;
    const expiry = getExpiryStatus(item.expiresAt);
    return (
      <View style={[styles.docCard, shadow.soft]}>
        <View style={[styles.docIcon, { backgroundColor: type.bg }]}>
          <Ionicons name={type.icon} size={22} color={type.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.docHeader}>
            <Text style={styles.docTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.docType}>{type.label}</Text>
          {expiry && (
            <Text style={[styles.docExpiry, { color: expiry.color }]}>
              Expires: {expiry.label}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Document Vault</Text>
          <Text style={styles.subtitle}>
            {docs.length} document{docs.length !== 1 ? "s" : ""} stored
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/document-vault/add")}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderDoc}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary} colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={40}
                  color={colors.textDisabled}
                />
              </View>
              <Text style={styles.emptyTitle}>Your vault is empty</Text>
              <Text style={styles.emptySub}>
                Securely store your travel documents here
              </Text>
              <TouchableOpacity
                style={styles.addDocBtn}
                onPress={() => router.push("/document-vault/add")}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.addDocText}>Add Document</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Philosopher_700Bold", fontSize: 22, color: "white" },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  docTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  verifiedText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#16A34A" },
  docType: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  docExpiry: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  addDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  addDocText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
});
