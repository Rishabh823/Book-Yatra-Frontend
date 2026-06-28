import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

let DateTimePicker = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {}
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseDisplay(value) {
  if (!value) return "Select date";
  const d = new Date(value + "T12:00:00");
  if (isNaN(d.getTime())) return "Select date";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// value: "YYYY-MM-DD" string | ""
// onChange: (v: string) => void
export function DateInput({ label, value, onChange, minDate, maxDate, style }) {
  const themeColors = useColors();
  const [show, setShow] = useState(false);
  const [iosTemp, setIosTemp] = useState(null);

  const dateObj = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value + "T12:00:00");
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const confirmIos = () => {
    onChange(toISO(iosTemp || dateObj));
    setShow(false);
    setIosTemp(null);
  };

  const cancelIos = () => {
    setShow(false);
    setIosTemp(null);
  };

  // Web: native HTML date input
  if (Platform.OS === "web" || !DateTimePicker) {
    return (
      <View style={style}>
        {!!label && (
          <Text style={[cs.label, { color: themeColors.textSecondary }]}>{label}</Text>
        )}
        <View style={[cs.btn, { backgroundColor: themeColors.elevated, borderColor: themeColors.borderSubtle }, !!value && { borderColor: themeColors.primary + "80" }]}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={value ? themeColors.primary : themeColors.textDisabled}
          />
          <input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || "")}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "inherit",
              fontSize: 13,
              color: value ? themeColors.textPrimary : themeColors.textDisabled,
              cursor: "pointer",
              width: "100%",
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={style}>
      {!!label && (
        <Text style={[cs.label, { color: themeColors.textSecondary }]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[cs.btn, { backgroundColor: themeColors.elevated, borderColor: themeColors.borderSubtle }, !!value && { borderColor: themeColors.primary + "80" }]}
        onPress={() => {
          setIosTemp(null);
          setShow(true);
        }}
        activeOpacity={0.75}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={value ? themeColors.primary : themeColors.textDisabled}
        />
        <Text style={[cs.btnTxt, { color: themeColors.textPrimary }, !value && { color: themeColors.textDisabled }]}>
          {parseDisplay(value)}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={13}
          color={themeColors.textDisabled}
        />
      </TouchableOpacity>

      {/* iOS: bottom sheet modal with spinner */}
      {show && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={cancelIos}
        >
          <Pressable style={cs.overlay} onPress={cancelIos} />
          <View style={[cs.sheet, { backgroundColor: themeColors.surface }]}>
            <View style={[cs.bar, { borderBottomColor: themeColors.borderSubtle }]}>
              <TouchableOpacity onPress={cancelIos}>
                <Text style={[cs.cancelTxt, { color: themeColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[cs.barTitle, { color: themeColors.textPrimary }]}>{label || "Select Date"}</Text>
              <TouchableOpacity onPress={confirmIos}>
                <Text style={cs.doneTxt}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={iosTemp || dateObj}
              mode="date"
              display="spinner"
              onChange={(_, d) => d && setIosTemp(d)}
              minimumDate={minDate}
              maximumDate={maxDate}
              style={{ backgroundColor: themeColors.surface }}
            />
          </View>
        </Modal>
      )}

      {/* Android: Material Design calendar dialog */}
      {show && Platform.OS === "android" && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (event.type !== "dismissed" && selectedDate)
              onChange(toISO(selectedDate));
          }}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  label: {
    fontFamily: fonts.accent,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  btnTxt: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { paddingBottom: 34 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  cancelTxt: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  doneTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#D95D39" },
});
