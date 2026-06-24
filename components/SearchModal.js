import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { fonts, radius, shadow } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { tours as toursApi, search as searchApi } from "../lib/api";
import {
  MAPBOX_TOKEN,
  MAPBOX_GEOCODE_URL,
  MAPBOX_COUNTRIES,
} from "../lib/config";

// ── Try-require voice module (optional: install @react-native-voice/voice) ────
let Voice = null;
try {
  Voice = require("@react-native-voice/voice").default;
} catch {}

const { height: SCREEN_H } = Dimensions.get("window");

// ── Filter chip definitions ───────────────────────────────────────────────────
const FILTERS = [
  { key: "all", label: "All" },
  { key: "places", label: "Places" },
  { key: "tours", label: "Tours" },
  { key: "pickups", label: "Pickup Points" },
  { key: "operators", label: "Operators" },
];

// ── Mapbox geocoding ──────────────────────────────────────────────────────────
async function fetchMapboxPlaces(q) {
  if (!MAPBOX_TOKEN) return [];
  try {
    const url =
      `${MAPBOX_GEOCODE_URL}/${encodeURIComponent(q)}.json` +
      `?access_token=${MAPBOX_TOKEN}` +
      `&country=${MAPBOX_COUNTRIES}` +
      `&types=place,locality,poi,neighborhood,region` +
      `&language=en&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f) => ({
      id: f.id,
      name: f.text,
      address: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    }));
  } catch {
    return [];
  }
}

// ── Reverse geocode for "Near Me" ─────────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  if (MAPBOX_TOKEN) {
    try {
      const url = `${MAPBOX_GEOCODE_URL}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      return data.features?.[0]?.text || null;
    } catch {}
  }
  try {
    const [addr] = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    return addr?.city || addr?.subregion || addr?.region || null;
  } catch {
    return null;
  }
}

// ── Skeleton loader row ───────────────────────────────────────────────────────
function SkeletonRow() {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 16,
        },
        { opacity: anim },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.borderSubtle,
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            height: 13,
            borderRadius: 6,
            backgroundColor: colors.borderSubtle,
            width: "70%",
          }}
        />
        <View
          style={{
            height: 11,
            borderRadius: 5,
            backgroundColor: colors.elevated,
            width: "50%",
          }}
        />
      </View>
    </Animated.View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, color, label, count }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 6,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color + "22",
        }}
      >
        <Ionicons name={icon} size={12} color={color} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.bodySemiBold,
          fontSize: 12,
          color: colors.textSecondary,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {count > 0 && (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: colors.textDisabled,
          }}
        >
          {count}
        </Text>
      )}
    </View>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  place: { bg: "#EFF6FF", icon: "location-outline", color: "#3B82F6" },
  tour: { bg: "#FFF4EC", icon: "bus-outline", color: "#D95D39" },
  pickup: { bg: "#ECFDF5", icon: "location-sharp", color: "#16A34A" },
  operator: { bg: "#F5F3FF", icon: "business-outline", color: "#7C3AED" },
};

function ResultRow({ type, title, subtitle, onPress, highlight }) {
  const colors = useColors();
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.tour;
  const parts = highlight
    ? (title || "").split(
        new RegExp(
          `(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
          "i",
        ),
      )
    : null;
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: cfg.bg,
        }}
      >
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 14,
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {parts
            ? parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                  <Text
                    key={i}
                    style={{ fontFamily: fonts.bodyBold, color: "#D95D39" }}
                  >
                    {part}
                  </Text>
                ) : (
                  part
                ),
              )
            : title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SearchModal({ visible, onClose }) {
  const router = useRouter();
  const colors = useColors();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const doSearchRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState([]);
  const [tours, setTours] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [operators, setOperators] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isListening, setIsListening] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);

  // ── Open / close animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setTimeout(() => inputRef.current?.focus(), 50));
      loadHomeData();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // ── Mic pulse ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const s = useMemo(() => makeStyles(colors), [colors]);

  // ── Voice listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!Voice) return;
    Voice.onSpeechResults = (e) => {
      const text = (e.value?.[0] || "").trim();
      if (text) {
        setQuery(text);
        // Defer search so React commits setQuery first, then run search
        setTimeout(() => doSearchRef.current?.(text), 100);
      }
      setIsListening(false);
    };
    Voice.onSpeechError = () => setIsListening(false);
    return () => {
      try {
        Voice?.destroy?.();
      } catch {}
    };
  }, []);

  // ── Load home data ──────────────────────────────────────────────────────────
  const loadHomeData = useCallback(async () => {
    const [hist, trend] = await Promise.allSettled([
      searchApi.getHistory(),
      searchApi.getTrending(),
    ]);
    if (hist.status === "fulfilled") {
      setRecentSearches((hist.value?.data || []).slice(0, 8));
    }
    setTrending(
      trend.status === "fulfilled" && trend.value?.data?.length
        ? trend.value.data
        : [
            "Kedarnath",
            "Goa",
            "Manali",
            "Varanasi",
            "Tirupati",
            "Haridwar",
            "Vrindavan",
            "Shirdi",
          ],
    );
  }, []);

  // ── Debounced query handler ─────────────────────────────────────────────────
  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 2) {
      setPlaces([]);
      setTours([]);
      setPickupPoints([]);
      setOperators([]);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(text), 300);
  };

  // ── Multi-source search ─────────────────────────────────────────────────────
  const doSearch = async (q) => {
    const t = q.trim();
    if (!t || t.length < 2) return;
    setLoading(true);
    try {
      const [mapboxRes, backendRes] = await Promise.allSettled([
        fetchMapboxPlaces(t),
        searchApi.unified(t),
      ]);
      setPlaces(mapboxRes.status === "fulfilled" ? mapboxRes.value : []);
      const bd =
        backendRes.status === "fulfilled" ? backendRes.value?.data || {} : {};
      if (!bd.tours?.length) {
        try {
          const fb = await toursApi.search({ q: t, limit: 8 });
          setTours(fb?.data || fb || []);
        } catch {
          setTours([]);
        }
      } else {
        setTours(bd.tours);
      }
      setPickupPoints(bd.pickupPoints || []);
      setOperators(bd.operators || []);
    } finally {
      setLoading(false);
    }
  };

  // Always keep ref pointing to the latest doSearch (safe to call from stale voice callbacks)
  doSearchRef.current = doSearch;

  // ── Save to history ─────────────────────────────────────────────────────────
  const saveHistory = async (term) => {
    if (!term?.trim()) return;
    try {
      await searchApi.saveHistory(term.trim());
    } catch {}
    loadHomeData();
  };

  // ── Close modal ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    Keyboard.dismiss();
    setQuery("");
    setPlaces([]);
    setTours([]);
    setPickupPoints([]);
    setOperators([]);
    setActiveFilter("all");
    onClose?.();
  };

  // ── Navigate to tour ────────────────────────────────────────────────────────
  const goTour = async (tour) => {
    await saveHistory(tour.title || tour.destination);
    handleClose();
    router.push(`/tour/${tour._id}`);
  };

  // ── Select place / pickup / operator → re-search ────────────────────────────
  const selectItem = async (term) => {
    await saveHistory(term);
    setQuery(term);
    doSearch(term);
    setActiveFilter("tours");
  };

  // ── Near Me ────────────────────────────────────────────────────────────────
  const handleNearMe = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const city = await reverseGeocode(
        loc.coords.latitude,
        loc.coords.longitude,
      );
      if (city) {
        setQuery(city);
        doSearch(city);
      }
    } catch {
    } finally {
      setLocLoading(false);
    }
  };

  // ── Delete / clear recent ───────────────────────────────────────────────────
  const deleteRecent = async (item) => {
    try {
      await searchApi.deleteHistory(item._id);
    } catch {}
    setRecentSearches((prev) => prev.filter((s) => s._id !== item._id));
  };

  const clearAllRecent = async () => {
    try {
      await searchApi.clearHistory();
    } catch {}
    setRecentSearches([]);
  };

  // ── Voice toggle ────────────────────────────────────────────────────────────
  const webRecognitionRef = useRef(null);

  const toggleVoice = async () => {
    // Native voice (works in bare React Native builds)
    if (Voice) {
      if (isListening) {
        try {
          await Voice.stop();
        } catch {}
        setIsListening(false);
      } else {
        try {
          setIsListening(true);
          await Voice.start("en-IN");
        } catch {
          setIsListening(false);
        }
      }
      return;
    }

    // Web Speech API (works in browser / Expo web)
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        if (isListening) {
          webRecognitionRef.current?.stop();
          setIsListening(false);
          return;
        }
        const recognition = new SpeechRecognition();
        webRecognitionRef.current = recognition;
        recognition.lang = "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (e) => {
          const transcript = (e.results[0]?.[0]?.transcript || "").trim();
          if (transcript) {
            setQuery(transcript);
            setIsListening(false);
            setTimeout(() => doSearchRef.current?.(transcript), 100);
          }
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        try {
          setIsListening(true);
          recognition.start();
        } catch {
          setIsListening(false);
        }
        return;
      }
    }

    // No voice support available — show hint
    setVoiceUnsupported(true);
    setTimeout(() => setVoiceUnsupported(false), 3000);
  };

  // ── Derived flags ───────────────────────────────────────────────────────────
  const hasQuery = query.trim().length >= 2;
  const totalResults =
    places.length + tours.length + pickupPoints.length + operators.length;
  const showPlaces =
    (activeFilter === "all" || activeFilter === "places") && places.length > 0;
  const showTours =
    (activeFilter === "all" || activeFilter === "tours") && tours.length > 0;
  const showPickups =
    (activeFilter === "all" || activeFilter === "pickups") &&
    pickupPoints.length > 0;
  const showOps =
    (activeFilter === "all" || activeFilter === "operators") &&
    operators.length > 0;
  const noResults = hasQuery && !loading && totalResults === 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[s.backdrop, { opacity: opacityAnim }]}
        pointerEvents="none"
      />

      {/* Sheet */}
      <Animated.View
        style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {voiceUnsupported && (
          <View style={s.voiceErrorBanner}>
            <Ionicons name="mic-off-outline" size={15} color="#fff" />
            <Text style={s.voiceErrorTxt}>Voice not available — try typing instead</Text>
          </View>
        )}
        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={s.inputWrap}>
            <Ionicons
              name="search-outline"
              size={17}
              color={colors.textSecondary}
            />
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Search destinations, tours, pickup points..."
              placeholderTextColor={colors.textDisabled}
              value={query}
              onChangeText={handleQueryChange}
              returnKeyType="search"
              onSubmitEditing={() => query.trim() && saveHistory(query.trim())}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setPlaces([]);
                  setTours([]);
                  setPickupPoints([]);
                  setOperators([]);
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[s.voiceBtn, isListening && s.voiceBtnActive]}
            onPress={toggleVoice}
            activeOpacity={0.75}
          >
            {isListening && (
              <Animated.View
                style={[s.voicePulse, { transform: [{ scale: pulseAnim }] }]}
              />
            )}
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={19}
              color={isListening ? "#EF4444" : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* FILTER CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filterScroll}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, activeFilter === f.key && s.chipActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[s.chipTxt, activeFilter === f.key && s.chipTxtActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CONTENT */}
        <ScrollView
          style={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ── HOME STATE ───────────────────────────────────────────────── */}
          {!hasQuery && (
            <>
              {/* Near Me */}
              <TouchableOpacity
                style={s.nearMeCard}
                onPress={handleNearMe}
                activeOpacity={0.8}
              >
                <View style={s.nearMeIcon}>
                  {locLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons
                      name="navigate"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.nearMeTitle}>Near Me</Text>
                  <Text style={s.nearMeSub}>
                    Find tours near your current location
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>

              {/* Recent */}
              {recentSearches.length > 0 && (
                <View>
                  <View style={s.secHead}>
                    <View style={s.secLeft}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={s.secTitle}>Recent Searches</Text>
                    </View>
                    <TouchableOpacity onPress={clearAllRecent}>
                      <Text style={s.clearAll}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((item) => (
                    <TouchableOpacity
                      key={item._id || item.query}
                      style={s.recentRow}
                      onPress={() => {
                        setQuery(item.query);
                        doSearch(item.query);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={s.recentDot}>
                        <Ionicons
                          name="search-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                      </View>
                      <Text style={s.recentTxt} numberOfLines={1}>
                        {item.query}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteRecent(item)}
                        hitSlop={12}
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color={colors.textDisabled}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Trending */}
              {trending.length > 0 && (
                <View>
                  <View style={s.secHead}>
                    <View style={s.secLeft}>
                      <Text style={{ fontSize: 13 }}>🔥</Text>
                      <Text style={s.secTitle}>Trending Destinations</Text>
                    </View>
                  </View>
                  <View style={s.trendGrid}>
                    {trending.map((dest, i) => (
                      <TouchableOpacity
                        key={`${dest}-${i}`}
                        style={s.trendChip}
                        onPress={() => {
                          setQuery(dest);
                          doSearch(dest);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={s.trendTxt}>{dest}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── LOADING ──────────────────────────────────────────────────── */}
          {hasQuery && loading && (
            <View>
              {[...Array(6)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </View>
          )}

          {/* ── NO RESULTS ───────────────────────────────────────────────── */}
          {noResults && (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={s.emptyTitle}>No results for "{query}"</Text>
              <Text style={s.emptySub}>
                Try a different destination, tour name, or pickup point
              </Text>
            </View>
          )}

          {/* ── RESULTS ──────────────────────────────────────────────────── */}
          {hasQuery && !loading && totalResults > 0 && (
            <>
              {showPlaces && (
                <View>
                  <SectionHeader
                    icon="location-outline"
                    color="#3B82F6"
                    label="Places"
                    count={places.length}
                  />
                  {places.map((p) => (
                    <ResultRow
                      key={p.id}
                      type="place"
                      title={p.name}
                      subtitle={p.address}
                      highlight={query.trim()}
                      onPress={() => selectItem(p.name)}
                    />
                  ))}
                </View>
              )}

              {showTours && (
                <View>
                  <SectionHeader
                    icon="bus-outline"
                    color={colors.primary}
                    label="Tours"
                    count={tours.length}
                  />
                  {tours.map((t) => (
                    <ResultRow
                      key={t._id}
                      type="tour"
                      title={t.title}
                      subtitle={[
                        t.source && `From ${t.source}`,
                        t.destination && `→ ${t.destination}`,
                        t.price &&
                          `₹${Number(t.price).toLocaleString("en-IN")}`,
                      ]
                        .filter(Boolean)
                        .join("  •  ")}
                      highlight={query.trim()}
                      onPress={() => goTour(t)}
                    />
                  ))}
                </View>
              )}

              {showPickups && (
                <View>
                  <SectionHeader
                    icon="location-sharp"
                    color="#16A34A"
                    label="Pickup Points"
                    count={pickupPoints.length}
                  />
                  {pickupPoints.map((pp, i) => (
                    <ResultRow
                      key={`${pp.name}-${i}`}
                      type="pickup"
                      title={pp.name}
                      subtitle={pp.address || pp.fromTour || ""}
                      highlight={query.trim()}
                      onPress={() => selectItem(pp.name)}
                    />
                  ))}
                </View>
              )}

              {showOps && (
                <View>
                  <SectionHeader
                    icon="business-outline"
                    color="#7C3AED"
                    label="Operators"
                    count={operators.length}
                  />
                  {operators.map((op) => (
                    <ResultRow
                      key={String(op._id || op.name)}
                      type="operator"
                      title={op.name}
                      subtitle="Tour operator"
                      highlight={query.trim()}
                      onPress={() => selectItem(op.name)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bg,
      paddingTop: Platform.OS === "ios" ? 54 : 36,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
    },
    inputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 14,
      height: 44,
    },
    input: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
      height: 44,
      padding: 0,
    },
    voiceBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
    },
    voiceBtnActive: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
    voicePulse: {
      position: "absolute",
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(239,68,68,0.18)",
    },

    // Filter chips
    filterScroll: { maxHeight: 50 },
    filterRow: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 8,
      flexDirection: "row",
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTxtActive: { color: "#fff", fontFamily: fonts.bodySemiBold },

    // Content
    scroll: { flex: 1 },

    // Near Me
    nearMeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      margin: 14,
      borderRadius: radius.xl,
      padding: 14,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      ...shadow.soft,
    },
    nearMeIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    nearMeTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    nearMeSub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Section headers
    secHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 6,
    },
    secLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    secTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    clearAll: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: colors.primary,
    },

    // Recent rows
    recentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 16,
    },
    recentDot: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    recentTxt: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textPrimary,
    },

    // Trending
    trendGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      gap: 8,
      marginTop: 4,
    },
    trendChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
    },
    trendTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
    },

    // Empty
    empty: {
      alignItems: "center",
      paddingTop: 60,
      paddingHorizontal: 32,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
      textAlign: "center",
    },
    emptySub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    voiceErrorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#DC2626",
      marginHorizontal: 14,
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    voiceErrorTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: "#fff",
      flex: 1,
    },
  });
