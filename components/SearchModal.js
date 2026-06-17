import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  Keyboard,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { fonts, colors, radius, shadow } from "../lib/theme";

const STORAGE_KEY = "tripkart_recent_searches";
const MAX_RECENT = 15;
const DEBOUNCE_DELAY = 300;

const POPULAR_DESTINATIONS = [
  "Kedarnath",
  "Varanasi",
  "Haridwar",
  "Vrindavan",
  "Tirupati",
  "Shirdi",
  "Mathura",
  "Ayodhya",
  "Puri",
  "Dwarka",
];

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function filterTours(tours, query) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  return (tours || []).filter((tour) => {
    return (
      tour.title?.toLowerCase().includes(q) ||
      tour.destination?.toLowerCase().includes(q) ||
      tour.fromCity?.toLowerCase().includes(q) ||
      tour.toCity?.toLowerCase().includes(q) ||
      tour.category?.toLowerCase().includes(q)
    );
  });
}

export default function SearchModal({
  visible,
  onClose,
  onSelectResult,
  onSearch,
  tours = [],
}) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Load recent searches from AsyncStorage
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (_) {}
  };

  const saveRecentSearches = async (searches) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    } catch (_) {}
  };

  const addRecentSearch = useCallback(
    async (term) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const updated = [
        trimmed,
        ...recentSearches.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase()
        ),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await saveRecentSearches(updated);
    },
    [recentSearches]
  );

  const removeRecentSearch = async (index) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    await saveRecentSearches(updated);
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    await saveRecentSearches([]);
  };

  // Debounced search
  const performSearch = useCallback(
    debounce((q) => {
      setIsSearching(true);
      const results = filterTours(tours, q);
      // Simulate brief async feel
      setTimeout(() => {
        setSearchResults(results);
        setIsSearching(false);
      }, 150);
    }, DEBOUNCE_DELAY),
    [tours]
  );

  useEffect(() => {
    if (query.trim().length > 0) {
      setIsSearching(true);
      performSearch(query);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [query]);

  // Modal open/close animations
  useEffect(() => {
    if (visible) {
      loadRecentSearches();
      setQuery("");
      setSearchResults([]);
      setIsSearching(false);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    Keyboard.dismiss();
    onSearch?.(trimmed);
    handleClose();
  };

  const handleSelectTour = (tour) => {
    addRecentSearch(tour.title || tour.destination || "");
    Keyboard.dismiss();
    onSelectResult?.(tour);
    handleClose();
  };

  const handleSelectRecent = (term) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleSelectDestination = (dest) => {
    addRecentSearch(dest);
    setQuery(dest);
    inputRef.current?.focus();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  const showHome = query.trim().length === 0;
  const showResults = query.trim().length > 0;

  const formatPrice = (price) => {
    if (!price) return "";
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const renderTourCard = ({ item }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleSelectTour(item)}
      activeOpacity={0.75}
    >
      <View style={styles.resultIconBox}>
        <Ionicons name="bus-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title || item.destination}
        </Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {[item.destination, item.fromCity && `From ${item.fromCity}`]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      {item.price ? (
        <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View
        style={[
          styles.container,
          {
            opacity: headerOpacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Search tours, destinations..."
              placeholderTextColor={colors.textDisabled}
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
              autoCorrect={false}
              autoCapitalize="none"
              selectionColor={colors.primary}
              underlineColorAndroid="transparent"
            />
            {query.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.headerDivider} />

        {/* Body */}
        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          {/* ── Home state: recent + popular ── */}
          {showHome && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={clearAllRecent}>
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>

                  {recentSearches.map((term, idx) => (
                    <View key={idx} style={styles.recentRow}>
                      <TouchableOpacity
                        style={styles.recentLeft}
                        onPress={() => handleSelectRecent(term)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={colors.textSecondary}
                          style={styles.recentIcon}
                        />
                        <Text style={styles.recentText} numberOfLines={1}>
                          {term}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeRecentSearch(idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={colors.textDisabled}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Popular Destinations */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Popular Destinations</Text>
                </View>
                <View style={styles.destinationGrid}>
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <TouchableOpacity
                      key={dest}
                      style={styles.destChip}
                      onPress={() => handleSelectDestination(dest)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={colors.primary}
                        style={styles.destIcon}
                      />
                      <Text style={styles.destText}>{dest}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* ── Search results state ── */}
          {showResults && (
            <View style={styles.section}>
              {isSearching ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <>
                  <Text style={styles.resultsCount}>
                    {searchResults.length}{" "}
                    {searchResults.length === 1 ? "result" : "results"} found
                  </Text>
                  {searchResults.map((item) => (
                    <View key={item._id || item.title}>
                      {renderTourCard({ item })}
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons
                      name="search-outline"
                      size={36}
                      color={colors.borderStrong}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try a different keyword or browse popular destinations
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    marginRight: 4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    includeFontPadding: false,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
  },
  headerDivider: {
    height: 1.5,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 16,
    marginBottom: 4,
  },

  // ── Body ──
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 40,
  },

  // ── Section ──
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  clearAllText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },

  // ── Recent Searches ──
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  recentIcon: {
    marginRight: 10,
  },
  recentText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },

  // ── Popular Destinations ──
  destinationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    margin: "1%",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#FFF4EC",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FDECE7",
  },
  destIcon: {
    marginRight: 5,
  },
  destText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.secondary,
    flexShrink: 1,
  },

  // ── Search Results ──
  resultsCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
    ...shadow.soft,
  },
  resultIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: "#FDECE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
    marginRight: 8,
  },
  resultTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  resultMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultPrice: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },

  // ── Loading ──
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24,
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 10,
  },

  // ── Empty ──
  emptyBox: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
});
