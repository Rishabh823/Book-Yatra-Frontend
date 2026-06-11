import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import { colors, fonts, radius, shadow } from "../lib/theme";

const HISTORY_KEY = "search_history_local";
const MAX_LOCAL = 10;

let debounceTimer = null;

export default function SmartSearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Search tours, destinations…",
  onClear,
  style,
}) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [fetching, setFetching] = useState(false);
  const inputRef = useRef(null);
  const dropAnim = useRef(new Animated.Value(0)).current;

  // Load local history
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (raw) setHistory(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const showDrop = (show) => {
    Animated.spring(dropAnim, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  useEffect(() => {
    showDrop(focused);
  }, [focused]);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    setFetching(true);
    try {
      const res = await api.get(
        `/preferences/search-suggestions?q=${encodeURIComponent(q)}`,
      );
      setSuggestions(res?.suggestions || []);
    } catch {}
    setFetching(false);
  }, []);

  const handleChange = useCallback(
    (text) => {
      onChangeText(text);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchSuggestions(text), 280);
    },
    [onChangeText, fetchSuggestions],
  );

  const saveToHistory = useCallback(async (q) => {
    if (!q?.trim()) return;
    const prev = await AsyncStorage.getItem(HISTORY_KEY)
      .then((r) => (r ? JSON.parse(r) : []))
      .catch(() => []);
    const next = [q.trim(), ...prev.filter((h) => h !== q.trim())].slice(
      0,
      MAX_LOCAL,
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
    // Also save to backend (non-blocking)
    api
      .post("/preferences/search-history", { query: q.trim() })
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(
    (q) => {
      const query = (q || value || "").trim();
      if (!query) return;
      saveToHistory(query);
      Keyboard.dismiss();
      setFocused(false);
      onSubmit?.(query);
    },
    [value, saveToHistory, onSubmit],
  );

  const handleSuggestionPress = useCallback(
    (text) => {
      onChangeText(text);
      handleSubmit(text);
    },
    [onChangeText, handleSubmit],
  );

  const handleClearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  const showDropdown =
    focused && (suggestions.length > 0 || (history.length > 0 && !value));

  return (
    <View style={[styles.wrap, style]}>
      {/* Input row */}
      <View style={[styles.bar, focused && styles.barFocused]}>
        <Ionicons
          name="search"
          size={18}
          color={focused ? colors.primary : colors.textSecondary}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onSubmitEditing={() => handleSubmit()}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!value && (
          <TouchableOpacity
            onPress={() => {
              onChangeText("");
              setSuggestions([]);
              onClear?.();
            }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {fetching && !value && <View style={styles.dot} />}
      </View>

      {/* Dropdown */}
      {showDropdown && (
        <Animated.View
          style={[
            styles.dropdown,
            shadow.card,
            {
              opacity: dropAnim,
              transform: [
                {
                  translateY: dropAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Search suggestions from API */}
          {suggestions.length > 0 && (
            <>
              <Text style={styles.dropSection}>Suggestions</Text>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.dropItem}
                  onPress={() => handleSuggestionPress(s.text)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dropIcon,
                      {
                        backgroundColor:
                          s.type === "history"
                            ? "#F3F4F6"
                            : colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        s.type === "history" ? "time-outline" : "search-outline"
                      }
                      size={14}
                      color={
                        s.type === "history"
                          ? colors.textSecondary
                          : colors.primary
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropText} numberOfLines={1}>
                      {s.text}
                    </Text>
                    {s.meta && (
                      <Text style={styles.dropMeta} numberOfLines={1}>
                        {s.meta}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => onChangeText(s.text)}>
                    <Ionicons
                      name="arrow-up-back"
                      size={14}
                      color={colors.textDisabled}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Local history (shown when search is empty) */}
          {!value && history.length > 0 && (
            <>
              <View style={styles.historyHead}>
                <Text style={styles.dropSection}>Recent Searches</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {history.slice(0, 6).map((h, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.dropItem}
                  onPress={() => handleSuggestionPress(h)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.dropIcon, { backgroundColor: "#F3F4F6" }]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[styles.dropText, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {h}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const next = history.filter((_, j) => j !== i);
                      setHistory(next);
                      await AsyncStorage.setItem(
                        HISTORY_KEY,
                        JSON.stringify(next),
                      );
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={colors.textDisabled}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 100 },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  barFocused: { borderColor: colors.primary, backgroundColor: "#FFFAF8" },

  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    height: 46,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },

  dropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    maxHeight: 320,
  },

  dropSection: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },

  historyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  clearText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },

  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dropText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  dropMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
