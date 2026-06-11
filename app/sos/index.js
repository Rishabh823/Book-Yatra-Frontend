import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Vibration,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const SOS_TYPES = [
  { key: "medical", label: "Medical", icon: "medical" },
  { key: "safety", label: "Safety", icon: "shield" },
  { key: "accident", label: "Accident", icon: "car" },
  { key: "lost", label: "Lost", icon: "location" },
  { key: "other", label: "Other", icon: "alert-circle" },
];

export default function SOSScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tourId } = useLocalSearchParams();
  const [selectedType, setSelectedType] = useState("other");
  const [message, setMessage] = useState("");
  const [holding, setHolding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const holdTimer = useRef(null);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerSOS = useCallback(async () => {
    setSubmitting(true);
    try {
      let location = {};
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
      const res = await api.post("/sos", {
        type: selectedType,
        message,
        ...location,
        tourId,
      });
      Vibration.vibrate([200, 100, 200, 100, 200]);
      router.replace("/sos/active?sosId=" + res.data._id);
    } catch (err) {
      Alert.alert("Error", "Failed to send SOS. Please call 112 directly.");
    }
    setSubmitting(false);
  }, [selectedType, message, tourId, router]);

  const onPressIn = useCallback(() => {
    setHolding(true);
    Animated.parallel([
      Animated.timing(holdProgress, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true }),
    ]).start();
    holdTimer.current = setTimeout(() => {
      Vibration.vibrate(500);
      triggerSOS();
    }, 3000);
  }, [triggerSOS, holdProgress, scaleAnim]);

  const onPressOut = useCallback(() => {
    setHolding(false);
    clearTimeout(holdTimer.current);
    holdProgress.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  }, [holdProgress, scaleAnim]);

  const ringSize = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [130, 170],
  });
  const ringOpacity = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 20, alignItems: "center" }}
      >
        <Text style={styles.instruction}>
          Hold the button for 3 seconds to trigger emergency alert
        </Text>

        <View style={styles.sosWrapper}>
          <Animated.View
            style={[
              styles.ringPulse,
              {
                width: ringSize,
                height: ringSize,
                opacity: ringOpacity,
                borderRadius: 999,
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.sosCircle}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              activeOpacity={1}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <Ionicons name="alert-circle" size={48} color="white" />
                  <Text style={styles.sosText}>SOS</Text>
                  {holding && <Text style={styles.holdText}>Sending...</Text>}
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.typesContainer}>
          <Text style={styles.sectionTitle}>Type of Emergency</Text>
          <View style={styles.typesRow}>
            {SOS_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeChip,
                  selectedType === t.key && styles.typeChipActive,
                ]}
                onPress={() => setSelectedType(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={
                    selectedType === t.key ? "white" : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === t.key && styles.typeLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.messageBox, shadow.soft]}>
          <Text style={styles.sectionTitle}>Additional Message (optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Describe your emergency..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.contactsCard}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {[
            { label: "National Emergency", number: "112" },
            { label: "Ambulance", number: "108" },
            { label: "Police", number: "100" },
          ].map((c) => (
            <TouchableOpacity
              key={c.number}
              style={styles.contactRow}
              onPress={() => Linking.openURL("tel:" + c.number)}
            >
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text style={styles.contactLabel}>{c.label}</Text>
              <Text style={styles.contactNumber}>{c.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A0505" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: "white",
  },
  instruction: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  sosWrapper: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  ringPulse: { position: "absolute", backgroundColor: "#DC2626" },
  sosCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  sosText: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: "white",
    marginTop: 4,
  },
  holdText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  typesContainer: { width: "100%", gap: 10 },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
  },
  typesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  typeLabelActive: { color: "white" },
  messageBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  messageInput: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "white",
    minHeight: 80,
    textAlignVertical: "top",
  },
  contactsCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  contactNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
});
