import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { auth as authApi } from "../lib/api";
import Toast from "../components/Toast";
import { useToast } from "../lib/hooks/useToast";

const PRIMARY = "#D95D39";

const OP_AVATAR_COLORS = [
  "#3730A3",
  "#0F766E",
  "#7C3AED",
  "#B45309",
  "#0369A1",
  "#15803D",
];

function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return OP_AVATAR_COLORS[Math.abs(hash) % OP_AVATAR_COLORS.length];
}

export default function SelectOperators() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const colors = useColors();

  const [operators, setOperators] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialSelection, setInitialSelection] = useState(new Set());

  useEffect(() => {
    const init = async () => {
      try {
        let joined = [];
        try {
          const res = await authApi.getProfile();
          const profile = res?.data || res?.user || res;
          if (
            Array.isArray(profile?.joinedOperators) &&
            profile.joinedOperators.length > 0
          ) {
            joined = profile.joinedOperators;
          }
        } catch {}
        if (joined.length === 0) {
          const stored = await AsyncStorage.getItem("user");
          if (stored) {
            const u = JSON.parse(stored);
            if (Array.isArray(u.joinedOperators)) joined = u.joinedOperators;
          }
        }
        const joinedIds = new Set(
          joined.map((op) =>
            typeof op === "object" ? String(op._id) : String(op),
          ),
        );
        setSelected(joinedIds);
        setInitialSelection(joinedIds);
        const ops = await authApi.getPublicOperators();
        setOperators(ops);
      } catch (e) {
        showToast(e.message || "Could not load operators");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(operators.map((o) => o._id)));
  const clearAll = () => setSelected(new Set());

  const hasChanges = () => {
    if (selected.size !== initialSelection.size) return true;
    for (const id of selected) {
      if (!initialSelection.has(id)) return true;
    }
    return false;
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const selectedIds = Array.from(selected);
      await authApi.joinOperators(selectedIds);
      const selectedOperators = operators.filter((op) => selected.has(op._id));
      const stored = await AsyncStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : {};
      user.joinedOperators = selectedOperators;
      await AsyncStorage.setItem("user", JSON.stringify(user));
      showToast(
        selectedIds.length === 0
          ? "All operators removed."
          : "Operators saved!",
        "success",
      );
      setTimeout(() => router.replace("/(tabs)"), 800);
    } catch (e) {
      showToast(e.message || "Failed to save selection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isFirstTime = initialSelection.size === 0;
  const onSkip = () => router.replace("/(tabs)");

  const s = useMemo(() => makeStyles(colors), [colors]);

  const renderOperator = ({ item }) => {
    const isSelected = selected.has(item._id);
    const name = item.businessName || item.name || "";
    const initial = name.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(name);

    return (
      <TouchableOpacity
        style={[s.card, isSelected && s.cardSelected]}
        onPress={() => toggle(item._id)}
        activeOpacity={0.8}
        testID={`operator-${item._id}`}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={s.avatar} />
        ) : (
          <View
            style={[
              s.avatar,
              {
                backgroundColor: avatarColor,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={[s.cardName, isSelected && { color: PRIMARY }]}>
            {item.businessName || item.name}
          </Text>
          {item.businessName && item.name !== item.businessName && (
            <Text style={s.cardSub}>{item.name}</Text>
          )}
          <Text style={s.tourCount}>
            {item.tourCount} {item.tourCount === 1 ? "tour" : "tours"} available
          </Text>
        </View>

        <View style={[s.check, isSelected && s.checkSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Flat header — no card */}
      <View style={s.topHeader}>
        <Text style={s.om}>ॐ</Text>
        <Text style={s.topTitle}>Choose your operators</Text>
        <Text style={s.topSub}>
          Select the tour operators you want to follow
        </Text>
      </View>

      {/* Gray band separator */}
      {/* <View style={s.grayBand} /> */}

      {/* Selection controls */}
      <View style={s.controls}>
        <Text style={s.selCount}>
          {selected.size} of {operators.length} selected
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={selectAll}>
            <Text style={s.controlLink}>Select all</Text>
          </TouchableOpacity>
          {selected.size > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={[s.controlLink, { color: colors.textDisabled }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : operators.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Ionicons name="bus-outline" size={56} color={colors.textDisabled} />
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 16,
              color: colors.textPrimary,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No operators available yet
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.textDisabled,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            Check back later — new operators are added regularly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={operators}
          keyExtractor={(item) => item._id}
          renderItem={renderOperator}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Bottom actions */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={onSkip}
          testID="skip-btn"
        >
          <Text style={s.cancelTxt}>
            {isFirstTime ? "Skip for now" : "Cancel"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.saveBtn,
            !hasChanges() && !isFirstTime && s.saveBtnDisabled,
          ]}
          onPress={onSave}
          disabled={saving || (isFirstTime && selected.size === 0)}
          testID="continue-btn"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.saveBtnTxt}>
                {isFirstTime ? "Continue" : "Save changes"}
              </Text>
              <Ionicons
                name={isFirstTime ? "arrow-forward" : "checkmark"}
                size={16}
                color="#fff"
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    grayBand: { height: 10, backgroundColor: colors.elevated },
    topHeader: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      alignItems: "center",
    },
    om: {
      fontSize: 36,
      color: PRIMARY,
      fontFamily: fonts.heading,
      marginBottom: 6,
    },
    topTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: 4,
    },
    topSub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textDisabled,
      textAlign: "center",
      marginTop: 6,
    },

    controls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    selCount: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
    controlLink: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: PRIMARY,
    },

    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    cardSelected: {
      borderColor: PRIMARY,
      backgroundColor: "#FEF3F0",
      borderWidth: 1.5,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    avatarInitial: {
      fontFamily: fonts.bodyBold,
      fontSize: 20,
      color: "#fff",
    },
    cardName: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    cardSub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textDisabled,
      marginBottom: 2,
    },
    tourCount: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
    },
    check: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    checkSelected: {
      backgroundColor: PRIMARY,
      borderColor: PRIMARY,
    },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderSubtle,
    },
    cancelBtn: {
      flex: 1,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    cancelTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    saveBtn: {
      flex: 2,
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: PRIMARY,
      borderRadius: 12,
    },
    saveBtnDisabled: {
      backgroundColor: colors.textDisabled,
    },
    saveBtnTxt: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },
  });
