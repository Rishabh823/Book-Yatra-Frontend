import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Pressable,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../lib/theme";

let DateTimePicker = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {}
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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

  // Web: native HTML date input (gives clean YYYY-MM-DD, no malformed strings)
  if (Platform.OS === "web" || !DateTimePicker) {
    return (
      <View style={style}>
        {!!label && <Text style={cs.label}>{label}</Text>}
        <View style={[cs.btn, !!value && cs.btnActive]}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={value ? colors.secondary : colors.textDisabled}
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
              color: value ? colors.textPrimary : colors.textDisabled,
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
      {!!label && <Text style={cs.label}>{label}</Text>}
      <TouchableOpacity
        style={[cs.btn, !!value && cs.btnActive]}
        onPress={() => {
          setIosTemp(null);
          setShow(true);
        }}
        activeOpacity={0.75}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={value ? colors.secondary : colors.textDisabled}
        />
        <Text style={[cs.btnTxt, !value && cs.placeholder]}>
          {parseDisplay(value)}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={13}
          color={colors.textDisabled}
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
          <View style={cs.sheet}>
            <View style={cs.bar}>
              <TouchableOpacity onPress={cancelIos}>
                <Text style={cs.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <Text style={cs.barTitle}>{label || "Select Date"}</Text>
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
              style={{ backgroundColor: "#fff" }}
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
    color: colors.textSecondary,
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
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnActive: { borderColor: colors.secondary + "80" },
  btnTxt: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  placeholder: { color: colors.textDisabled },
  webInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", paddingBottom: 34 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  barTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#1F2937" },
  cancelTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  doneTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
});
