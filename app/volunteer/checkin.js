import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../../lib/api";
import { colors, fonts, radius } from "../../lib/theme";

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tourId } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleScan = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    Vibration.vibrate(200);
    try {
      const res = await api.post("/volunteer/scan-qr", {
        qrData: data,
        tourId,
      });
      setLastResult({
        success: true,
        name: res.data?.passengerName || "Passenger",
        seat: res.data?.seatNumber,
      });
      Vibration.vibrate([100, 100, 100]);
    } catch (err) {
      setLastResult({
        success: false,
        message: err.message || "Invalid QR code",
      });
      Vibration.vibrate(500);
    }
    setLoading(false);
  };

  const resetScan = () => {
    setScanned(false);
    setLastResult(null);
  };

  if (!permission)
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Loading camera...</Text>
      </View>
    );

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR</Text>
        </View>
        <View style={styles.permContainer}>
          <Ionicons
            name="camera-outline"
            size={64}
            color={colors.textDisabled}
          />
          <Text style={styles.permTitle}>Camera Permission Required</Text>
          <Text style={styles.permSub}>
            Please allow camera access to scan QR codes
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={[styles.headerOverlay, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnOverlay}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.titleOverlay}>Scan Passenger QR</Text>
          <TouchableOpacity
            onPress={() =>
              router.push("/volunteer/passengers?tourId=" + tourId)
            }
            style={styles.listBtn}
          >
            <Ionicons name="list" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.bottomPanel}>
          {loading && <Text style={styles.scanStatus}>Processing...</Text>}
          {!scanned && !loading && (
            <Text style={styles.scanHint}>
              Point camera at passenger's QR code
            </Text>
          )}

          {lastResult && (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: lastResult.success ? "#DCFCE7" : "#FEE2E2" },
              ]}
            >
              <Ionicons
                name={lastResult.success ? "checkmark-circle" : "close-circle"}
                size={32}
                color={lastResult.success ? "#16A34A" : "#DC2626"}
              />
              {lastResult.success ? (
                <View style={styles.resultText}>
                  <Text style={[styles.resultTitle, { color: "#16A34A" }]}>
                    Checked In!
                  </Text>
                  <Text style={styles.resultSub}>
                    {lastResult.name}{" "}
                    {lastResult.seat ? "• Seat " + lastResult.seat : ""}
                  </Text>
                </View>
              ) : (
                <View style={styles.resultText}>
                  <Text style={[styles.resultTitle, { color: "#DC2626" }]}>
                    Failed
                  </Text>
                  <Text style={styles.resultSub}>{lastResult.message}</Text>
                </View>
              )}
            </View>
          )}

          {scanned && (
            <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
              <Text style={styles.scanAgainText}>Scan Next Passenger</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER = 24;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: "#1E0A0A",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  title: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: "white" },
  permContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  permTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  permSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  permText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  permBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },
  overlay: { flex: 1, backgroundColor: "transparent" },
  headerOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backBtnOverlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleOverlay: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 20,
    color: "white",
  },
  listBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: { flex: 1, margin: 60, position: "relative" },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#D95D39",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  bottomPanel: {
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 24,
    gap: 14,
    alignItems: "center",
    paddingBottom: 40,
  },
  scanStatus: { fontFamily: fonts.bodyMedium, fontSize: 15, color: "white" },
  scanHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  resultCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radius.xl,
    padding: 16,
  },
  resultText: { flex: 1, gap: 4 },
  resultTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  resultSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  scanAgainBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  scanAgainText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },
});
