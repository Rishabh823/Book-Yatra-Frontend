import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { api } from "../lib/api";
import { colors, fonts, radius, shadow } from "../lib/theme";

const buildMapHtml = (lat, lng, driverName) => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>body{margin:0;padding:0}#map{width:100%;height:100vh}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map').setView([${lat},${lng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OSM'}).addTo(map);
var icon=L.divIcon({html:'<div style="width:36px;height:36px;background:#D95D39;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="color:white;font-size:16px">🚌</span></div>',iconSize:[36,36],iconAnchor:[18,18]});
var marker=L.marker([${lat},${lng}],{icon:icon}).addTo(map).bindPopup('${driverName || "Bus"}').openPopup();
window.updateMarker=function(lat,lng){marker.setLatLng([lat,lng]);map.setView([lat,lng],14)};
</script></body></html>`;

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tourId } = useLocalSearchParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);
  const intervalRef = useRef(null);

  const loadTracking = useCallback(async () => {
    try {
      const res = await api.get("/tracking/tour/" + tourId);
      setTracking(res.data);
    } catch {}
    setLoading(false);
  }, [tourId]);

  useEffect(() => {
    loadTracking();
    intervalRef.current = setInterval(loadTracking, 15000);
    return () => clearInterval(intervalRef.current);
  }, [loadTracking]);

  useEffect(() => {
    if (tracking?.currentLocation && webViewRef.current) {
      const { lat, lng } = tracking.currentLocation;
      webViewRef.current.injectJavaScript(
        `window.updateMarker && window.updateMarker(${lat},${lng});true;`,
      );
    }
  }, [tracking]);

  const lat = tracking?.currentLocation?.lat || 26.9124;
  const lng = tracking?.currentLocation?.lng || 75.7873;
  const driverName = tracking?.driverId?.name || "Driver";

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.meta, { marginTop: 12 }]}>
          Loading live tracking...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                tracking?.status === "in_progress" ? "#DCFCE7" : "#FEF3C7",
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  tracking?.status === "in_progress" ? "#16A34A" : "#D97706",
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  tracking?.status === "in_progress" ? "#16A34A" : "#D97706",
              },
            ]}
          >
            {tracking?.status === "in_progress"
              ? "Live"
              : tracking?.status || "No Data"}
          </Text>
        </View>
      </View>

      {tracking ? (
        <>
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: buildMapHtml(lat, lng, driverName) }}
              style={{ flex: 1 }}
              javaScriptEnabled
            />
          </View>
          <ScrollView
            style={styles.infoPanel}
            contentContainerStyle={{ padding: 16, gap: 12 }}
          >
            <View style={styles.statsRow}>
              <View style={[styles.statCard, shadow.soft]}>
                <Ionicons name="person" size={20} color={colors.primary} />
                <Text style={styles.statValue}>{driverName}</Text>
                <Text style={styles.statLabel}>Driver</Text>
              </View>
              <View style={[styles.statCard, shadow.soft]}>
                <Ionicons name="bus" size={20} color={colors.primary} />
                <Text style={styles.statValue}>
                  {tracking?.vehicleId?.registrationNo || "N/A"}
                </Text>
                <Text style={styles.statLabel}>Vehicle</Text>
              </View>
              <View style={[styles.statCard, shadow.soft]}>
                <Ionicons name="navigate" size={20} color={colors.primary} />
                <Text style={styles.statValue}>
                  {tracking?.currentLocation?.lat ? lat.toFixed(4) : "N/A"}
                </Text>
                <Text style={styles.statLabel}>Latitude</Text>
              </View>
            </View>
            {tracking?.currentLocation?.address && (
              <View style={[styles.locationCard, shadow.soft]}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.locationText}>
                  {tracking.currentLocation.address}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.sosBtn}
              onPress={() => router.push("/sos?tourId=" + tourId)}
            >
              <Ionicons name="alert-circle" size={20} color="white" />
              <Text style={styles.sosBtnText}>Emergency SOS</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      ) : (
        <View style={styles.noTracking}>
          <Ionicons
            name="navigate-outline"
            size={60}
            color={colors.textDisabled}
          />
          <Text style={styles.noTrackingTitle}>Tracking Not Active</Text>
          <Text style={styles.noTrackingText}>
            Live tracking will appear here once the tour starts.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  mapContainer: { height: 280 },
  infoPanel: { flex: 1 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
  },
  locationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  sosBtn: {
    backgroundColor: "#DC2626",
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
  },
  sosBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },
  noTracking: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  noTrackingTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  noTrackingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  meta: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
