import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function SOSButton({ tourId, size = 60 }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef(null);

  const onPressIn = useCallback(() => {
    setHolding(true);
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
    }).start();
    holdTimer.current = setTimeout(() => {
      Vibration.vibrate([200, 100, 200]);
      Alert.alert(
        "Trigger SOS?",
        "This will alert all administrators and tour guides immediately.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send SOS",
            style: "destructive",
            onPress: () =>
              router.push("/sos" + (tourId ? "?tourId=" + tourId : "")),
          },
        ],
      );
    }, 2000);
  }, [tourId, router, scaleAnim]);

  const onPressOut = useCallback(() => {
    setHolding(false);
    clearTimeout(holdTimer.current);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.btn,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
      >
        <Text style={[styles.text, { fontSize: size * 0.26 }]}>SOS</Text>
        {holding && <Text style={styles.hint}>Hold...</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  text: { color: "white", fontFamily: "Manrope_700Bold", fontWeight: "bold" },
  hint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9,
    position: "absolute",
    bottom: "15%",
  },
});
