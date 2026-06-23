import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, Switch, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { colors, fonts, radius } from "../../../lib/theme";
import { tours as toursApi } from "../../../lib/api";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_CFG = {
  draft:     { color: "#D97706", bg: "#FEF3C7", icon: "document-outline",    label: "Draft" },
  published: { color: "#16A34A", bg: "#DCFCE7", icon: "checkmark-circle",    label: "Published" },
  cancelled: { color: "#DC2626", bg: "#FEE2E2", icon: "close-circle",        label: "Cancelled" },
  completed: { color: "#0284C7", bg: "#EFF6FF", icon: "flag",                label: "Completed" },
};

const DIFF_COLORS = {
  easy: "#16A34A", moderate: "#D97706", challenging: colors.primary, extreme: "#DC2626",
};

const FACILITIES_LABELS = {
  transportation: "Transportation", accommodation: "Accommodation", meals: "Meals",
  guide: "Guide", insurance: "Insurance", medicalSupport: "Medical Support",
  wifi: "WiFi", chargingPoint: "Charging Points", drinkingWater: "Drinking Water",
};
const FACILITIES_ICONS = {
  transportation: "bus", accommodation: "bed", meals: "restaurant", guide: "person",
  insurance: "shield-checkmark", medicalSupport: "medkit", wifi: "wifi",
  chargingPoint: "flash", drinkingWater: "water",
};

function SectionCard({ icon, title, children, action }) {
  return (
    <View style={c.card}>
      <View style={c.cardHead}>
        <View style={c.cardIconBox}><Ionicons name={icon} size={16} color={colors.primary} /></View>
        <Text style={c.cardTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, icon, valueStyle }) {
  if (!value && value !== 0) return null;
  return (
    <View style={c.infoRow}>
      {icon && <Ionicons name={icon} size={14} color={colors.textSecondary} />}
      <Text style={c.infoLabel}>{label}</Text>
      <Text style={[c.infoValue, valueStyle]}>{String(value)}</Text>
    </View>
  );
}

export default function TourDetailAdmin() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    toursApi.byId(id)
      .then(data => setTour(data?.data || data))
      .catch(() => Alert.alert("Error", "Could not load tour."))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const togglePublish = async () => {
    if (!tour) return;
    const isPublished = tour.status === "published";
    const title = isPublished ? "Unpublish Tour" : "Publish Tour";
    const msg = isPublished
      ? "This will hide the tour from travelers."
      : "Make this tour visible to travelers who follow your operator?";
    const btn = isPublished ? "Unpublish" : "Publish";

    if (!isPublished && (!tour.title || !tour.source || !tour.destination)) {
      return Alert.alert("Incomplete", "Title, Source and Destination are required to publish.");
    }

    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: btn, style: isPublished ? "destructive" : "default", onPress: async () => {
        setPublishing(true);
        try {
          const res = await toursApi.publish(id);
          const newStatus = res?.data?.status || (isPublished ? "draft" : "published");
          setTour(t => ({ ...t, status: newStatus }));
          if (!isPublished) Alert.alert("Published!", "Tour is now live for your followers.");
        } catch (e) { Alert.alert("Error", e.message); }
        setPublishing(false);
      }},
    ]);
  };

  const onDelete = () => {
    Alert.alert("Delete Tour", `Delete "${tour?.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleting(true);
        try { await toursApi.remove(id); router.replace("/admin/tours"); }
        catch (e) { Alert.alert("Error", e.message); setDeleting(false); }
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!tour) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textDisabled} />
        <Text style={{ fontFamily: fonts.body, color: colors.textSecondary, marginTop: 8 }}>Tour not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const st = STATUS_CFG[tour.status] || STATUS_CFG.draft;
  const adultPrice = tour.pricing?.adult || tour.price || 0;
  const totalSeats = tour.totalSeats || tour.seats || 40;
  const itinerary = tour.itinerary || [];
  const buses = tour.buses || [];
  const volunteers = tour.volunteerAssignments || [];
  const pickupPoints = tour.pickupPoints || [];
  const dropPoints = tour.dropPoints || [];
  const inclusions = tour.inclusions || [];
  const exclusions = tour.exclusions || [];
  const requiredDocs = tour.requiredDocuments || [];
  const emergencyContacts = tour.safety?.emergencyContacts || [];
  const facilities = tour.facilities || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Header */}
      <View style={c.header}>
        <TouchableOpacity style={c.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={c.headerTitle} numberOfLines={1}>{tour.title || "Tour Details"}</Text>
          {tour.tourCode ? <Text style={c.headerCode}>#{tour.tourCode}</Text> : null}
        </View>
        <TouchableOpacity style={c.editBtn} onPress={() => router.push(`/admin/tour/create?id=${id}`)}>
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={c.editBtnTxt}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>

        {/* Cover Image */}
        {tour.coverPhotoUrl ? (
          <Image source={{ uri: tour.coverPhotoUrl }} style={c.cover} resizeMode="cover" />
        ) : (
          <View style={c.coverPlaceholder}>
            <Ionicons name="image-outline" size={40} color={colors.textDisabled} />
          </View>
        )}

        {/* Status Bar */}
        <View style={c.statusBar}>
          <View style={[c.statusBadge, { backgroundColor: st.bg }]}>
            <Ionicons name={st.icon} size={13} color={st.color} />
            <Text style={[c.statusTxt, { color: st.color }]}>{st.label}</Text>
          </View>
          {tour.difficulty && (
            <View style={[c.statusBadge, { backgroundColor: (DIFF_COLORS[tour.difficulty] || colors.primary) + "20" }]}>
              <Text style={[c.statusTxt, { color: DIFF_COLORS[tour.difficulty] || colors.primary }]}>
                {tour.difficulty.charAt(0).toUpperCase() + tour.difficulty.slice(1)}
              </Text>
            </View>
          )}
          {tour.category && (
            <View style={[c.statusBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[c.statusTxt, { color: colors.primary }]}>{tour.category}</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={c.statsRow}>
          {[
            { icon: "calendar", val: fmt(tour.startDate), lbl: "Departure" },
            { icon: "flag",     val: fmt(tour.endDate),   lbl: "Return" },
            { icon: "people",   val: totalSeats,           lbl: "Seats" },
            { icon: "pricetag", val: adultPrice ? `₹${adultPrice}` : "—", lbl: "Adult" },
          ].map(stat => (
            <View key={stat.lbl} style={c.statBox}>
              <Ionicons name={stat.icon} size={14} color={colors.primary} />
              <Text style={c.statVal}>{stat.val}</Text>
              <Text style={c.statLbl}>{stat.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Basic Info */}
        <SectionCard icon="information-circle" title="Basic Information">
          {tour.description ? <Text style={c.descText}>{tour.description}</Text> : null}
          <InfoRow label="Tour Type" value={tour.tourType} />
          <InfoRow label="Distance" value={tour.distance ? `${tour.distance} km` : null} />
          <InfoRow label="Est. Duration" value={tour.estimatedDuration} />
          {tour.videoUrl ? (
            <TouchableOpacity style={c.linkRow} onPress={() => WebBrowser.openBrowserAsync(tour.videoUrl)}>
              <Ionicons name="play-circle" size={18} color={colors.primary} />
              <Text style={c.linkTxt}>View Tour Video</Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {tour.pdfBrochure ? (
            <TouchableOpacity style={c.linkRow} onPress={() => WebBrowser.openBrowserAsync(tour.pdfBrochure)}>
              <Ionicons name="document-text" size={18} color="#DC2626" />
              <Text style={[c.linkTxt, { color: "#DC2626" }]}>Open PDF Brochure</Text>
              <Ionicons name="open-outline" size={14} color="#DC2626" />
            </TouchableOpacity>
          ) : null}
        </SectionCard>

        {/* Route */}
        <SectionCard icon="navigate" title="Route">
          <View style={c.routeRow}>
            <View style={c.routeStop}>
              <View style={[c.routeDot, { backgroundColor: "#16A34A" }]} />
              <View style={{ flex: 1 }}>
                <Text style={c.routeLabel}>From</Text>
                <Text style={c.routeCity}>{tour.source || "—"}</Text>
              </View>
            </View>
            <View style={c.routeLine} />
            <View style={c.routeStop}>
              <View style={[c.routeDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={c.routeLabel}>To</Text>
                <Text style={c.routeCity}>{tour.destination || "—"}</Text>
              </View>
            </View>
          </View>
          {pickupPoints.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={c.subLabel}>Pickup Points ({pickupPoints.length})</Text>
              {pickupPoints.map((pt, i) => (
                <View key={i} style={c.pointRow}>
                  <Ionicons name="location-outline" size={14} color="#16A34A" />
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={c.pointName}>{pt.name}</Text>
                    {pt.time ? <Text style={c.pointMeta}>{pt.time}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
          {dropPoints.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={c.subLabel}>Drop Points ({dropPoints.length})</Text>
              {dropPoints.map((pt, i) => (
                <View key={i} style={c.pointRow}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={c.pointName}>{pt.name}</Text>
                    {pt.time ? <Text style={c.pointMeta}>{pt.time}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <SectionCard icon="map" title={`Itinerary (${itinerary.length} days)`}>
            {itinerary.map((day, i) => (
              <View key={i} style={c.dayRow}>
                <View style={c.dayBadge}><Text style={c.dayBadgeTxt}>D{day.day}</Text></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={c.dayTitle}>{day.title}</Text>
                  {day.location ? <Text style={c.dayMeta}><Ionicons name="location-outline" size={11} /> {day.location}</Text> : null}
                  {(day.startTime || day.endTime) ? <Text style={c.dayMeta}>{day.startTime} {day.endTime ? `→ ${day.endTime}` : ""}</Text> : null}
                  {day.description ? <Text style={c.dayDesc} numberOfLines={2}>{day.description}</Text> : null}
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Fleet */}
        <SectionCard icon="bus" title="Fleet">
          <View style={c.fleetStats}>
            <View style={c.fleetStat}><Text style={c.fleetStatVal}>{buses.length || 1}</Text><Text style={c.fleetStatLbl}>Buses</Text></View>
            <View style={c.fleetStat}><Text style={c.fleetStatVal}>{totalSeats}</Text><Text style={c.fleetStatLbl}>Seats</Text></View>
            <View style={c.fleetStat}><Text style={c.fleetStatVal}>{tour.seatStructure || "2x2"}</Text><Text style={c.fleetStatLbl}>Layout</Text></View>
            <View style={c.fleetStat}><Text style={c.fleetStatVal}>{tour.busType || "AC"}</Text><Text style={c.fleetStatLbl}>Type</Text></View>
          </View>
          {buses.map((b, i) => (
            <View key={i} style={c.busCard}>
              <Ionicons name="bus" size={20} color={b.isAC ? "#0284C7" : "#16A34A"} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={c.busNum}>{b.busNumber}</Text>
                <Text style={c.busMeta}>{b.busType} · {b.capacity} seats · {b.seatLayout}</Text>
              </View>
              {b.isAC && <View style={c.acBadge}><Text style={c.acBadgeTxt}>AC</Text></View>}
            </View>
          ))}
          {tour.primaryDriver && (
            <View style={c.driverCard}>
              <View style={c.driverIcon}><Ionicons name="person" size={16} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={c.driverName}>{tour.primaryDriver?.name || "Primary Driver"}</Text>
                <Text style={c.driverMeta}>
                  {tour.primaryDriver?.licenseNo ? `License: ${tour.primaryDriver.licenseNo}` : "Primary Driver"}
                  {tour.primaryDriver?.phone ? ` · ${tour.primaryDriver.phone}` : ""}
                </Text>
              </View>
              <View style={c.driverBadge}><Text style={c.driverBadgeTxt}>Primary</Text></View>
            </View>
          )}
        </SectionCard>

        {/* Pricing */}
        <SectionCard icon="pricetag" title="Pricing">
          <View style={c.pricingGrid}>
            {[
              ["Adult", tour.pricing?.adult || tour.price],
              ["Child", tour.pricing?.child],
              ["Senior", tour.pricing?.seniorCitizen],
              ["VIP", tour.pricing?.vip],
            ].filter(([, v]) => v && v !== 0).map(([label, val]) => (
              <View key={label} style={c.priceBox}>
                <Text style={c.priceBoxLbl}>{label}</Text>
                <Text style={c.priceBoxVal}>₹{val}</Text>
              </View>
            ))}
          </View>
          {(tour.pricing?.earlyBirdDiscount > 0) && <InfoRow label="Early Bird Discount" value={`${tour.pricing.earlyBirdDiscount}%`} />}
          {(tour.pricing?.groupDiscount?.percentage > 0) && <InfoRow label="Group Discount" value={`${tour.pricing.groupDiscount.percentage}% (min ${tour.pricing.groupDiscount.minGroupSize} pax)`} />}
          {tour.pricing?.emiEnabled && (
            <View style={c.featureRow}>
              <Ionicons name="card" size={14} color="#16A34A" />
              <Text style={[c.featureTxt, { color: "#16A34A" }]}>EMI Payment Available</Text>
            </View>
          )}
        </SectionCard>

        {/* Volunteers */}
        {volunteers.length > 0 && (
          <SectionCard icon="people" title={`Volunteers (${volunteers.length})`}>
            {volunteers.map((a, i) => (
              <View key={i} style={c.volRow}>
                <View style={c.volAvatar}><Ionicons name="person" size={14} color="#fff" /></View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={c.volName}>{a.volunteerId?.name || "Volunteer"}</Text>
                  <Text style={c.volMeta}>{a.role?.replace(/_/g, " ") || "Coordinator"}</Text>
                </View>
                {a.tasks?.length > 0 && <Text style={c.volTask} numberOfLines={1}>{a.tasks.slice(0, 2).join(", ")}</Text>}
              </View>
            ))}
          </SectionCard>
        )}

        {/* Facilities */}
        {Object.values(facilities).some(Boolean) && (
          <SectionCard icon="checkbox" title="Facilities Included">
            <View style={c.facilityGrid}>
              {Object.entries(facilities).filter(([, v]) => v).map(([key]) => (
                <View key={key} style={c.facilityItem}>
                  <Ionicons name={FACILITIES_ICONS[key] || "checkmark-circle"} size={16} color={colors.primary} />
                  <Text style={c.facilityItemTxt}>{FACILITIES_LABELS[key] || key}</Text>
                </View>
              ))}
            </View>
            {inclusions.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={c.subLabel}>Inclusions</Text>
                {inclusions.map((item, i) => (
                  <View key={i} style={c.listItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text style={c.listItemTxt}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            {exclusions.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={c.subLabel}>Exclusions</Text>
                {exclusions.map((item, i) => (
                  <View key={i} style={[c.listItem, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="close-circle" size={14} color="#DC2626" />
                    <Text style={c.listItemTxt}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* Documents */}
        {requiredDocs.length > 0 && (
          <SectionCard icon="document-text" title="Required Documents">
            {requiredDocs.map((doc, i) => (
              <View key={i} style={c.docRow}>
                <Ionicons name="document" size={16} color={doc.mandatory ? colors.primary : colors.textSecondary} />
                <Text style={c.docName}>{doc.name}</Text>
                <View style={[c.docBadge, { backgroundColor: doc.mandatory ? "#FEE2E2" : "#F0FDF4" }]}>
                  <Text style={[c.docBadgeTxt, { color: doc.mandatory ? "#DC2626" : "#16A34A" }]}>
                    {doc.mandatory ? "Mandatory" : "Optional"}
                  </Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Booking Rules */}
        {tour.bookingRules && (
          <SectionCard icon="clipboard" title="Booking Rules">
            <InfoRow label="Max Bookings" value={tour.bookingRules.maxBookingCount} />
            <InfoRow label="Min Bookings Required" value={tour.bookingRules.minBookingCount} />
            <InfoRow label="Max Seats / Booking" value={tour.bookingRules.maxSeatsPerBooking} />
            {tour.bookingRules.waitlistEnabled && (
              <View style={c.featureRow}>
                <Ionicons name="list" size={14} color="#0284C7" />
                <Text style={[c.featureTxt, { color: "#0284C7" }]}>Waitlist Enabled</Text>
              </View>
            )}
            {tour.bookingRules.autoApproval && (
              <View style={c.featureRow}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={[c.featureTxt, { color: "#16A34A" }]}>Auto Approval On</Text>
              </View>
            )}
            {tour.bookingRules.cancellationPolicy ? (
              <View style={{ marginTop: 8 }}>
                <Text style={c.subLabel}>Cancellation Policy</Text>
                <Text style={c.policyText}>{tour.bookingRules.cancellationPolicy}</Text>
              </View>
            ) : null}
          </SectionCard>
        )}

        {/* Safety */}
        {tour.safety && (
          <SectionCard icon="shield" title="Safety & Tracking">
            <View style={c.safetyGrid}>
              {[
                ["SOS Button", tour.safety.sosEnabled, "alert-circle"],
                ["GPS Tracking", tour.safety.gpsTracking, "location"],
                ["Driver Tracking", tour.safety.driverLiveTracking, "navigate"],
                ["Geo Fencing", tour.safety.geofencing, "map"],
                ["Route Monitor", tour.safety.routeMonitoring, "pulse"],
                ["Emergency Broadcast", tour.safety.emergencyBroadcasting, "radio"],
              ].map(([label, val, icon]) => (
                <View key={label} style={[c.safetyItem, val && c.safetyItemActive]}>
                  <Ionicons name={icon} size={14} color={val ? colors.primary : colors.textDisabled} />
                  <Text style={[c.safetyItemTxt, val && { color: colors.primary }]}>{label}</Text>
                </View>
              ))}
            </View>
            {emergencyContacts.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={c.subLabel}>Emergency Contacts</Text>
                {emergencyContacts.map((ec, i) => (
                  <View key={i} style={c.ecRow}>
                    <Text style={c.ecName}>{ec.name}</Text>
                    <Text style={c.ecMeta}>{ec.relation ? `${ec.relation} · ` : ""}{ec.phone}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* Actions */}
        <View style={c.actions}>
          <TouchableOpacity
            style={[c.actionBtn, { flex: 1, borderColor: tour.status === "published" ? "#D97706" : "#16A34A", backgroundColor: tour.status === "published" ? "#FEF3C7" : "#DCFCE7" }]}
            onPress={togglePublish}
            disabled={publishing}
          >
            {publishing ? <ActivityIndicator color={colors.primary} size="small" /> : (
              <>
                <Ionicons name={tour.status === "published" ? "arrow-down-circle-outline" : "rocket"} size={18} color={tour.status === "published" ? "#D97706" : "#16A34A"} />
                <Text style={[c.actionBtnTxt, { color: tour.status === "published" ? "#D97706" : "#16A34A" }]}>
                  {tour.status === "published" ? "Unpublish" : "Publish Tour"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[c.actionBtn, { flex: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => router.push(`/admin/tour/create?id=${id}`)}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={[c.actionBtnTxt, { color: colors.primary }]}>Edit in Wizard</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={c.deleteBtn} onPress={onDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#DC2626" size="small" /> : (
            <><Ionicons name="trash-outline" size={16} color="#DC2626" /><Text style={c.deleteBtnTxt}>Delete Tour</Text></>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const c = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontFamily: fonts.heading, fontSize: 17, color: colors.textPrimary, marginLeft: 0 },
  headerCode:   { fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", letterSpacing: 2, marginTop: 2 },
  editBtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.primary + "40" },
  editBtnTxt:   { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  content:      { paddingBottom: 40 },
  cover:        { width: "100%", height: 220 },
  coverPlaceholder: { width: "100%", height: 160, backgroundColor: colors.borderSubtle, alignItems: "center", justifyContent: "center" },
  statusBar:    { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusTxt:    { fontFamily: fonts.bodyBold, fontSize: 12 },
  statsRow:     { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: "#fff", borderRadius: 20, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  statBox:      { flex: 1, alignItems: "center", gap: 4 },
  statVal:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, textAlign: "center" },
  statLbl:      { fontFamily: fonts.bodyBold, fontSize: 9, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase" },
  card:         { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#fff", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  cardHead:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, borderBottomWidth: 1, borderColor: colors.borderSubtle, paddingBottom: 10 },
  cardIconBox:  { width: 30, height: 30, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  cardTitle:    { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.secondary, flex: 1 },
  descText:     { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 10 },
  infoRow:      { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  infoLabel:    { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, flex: 1 },
  infoValue:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  linkRow:      { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, marginTop: 4 },
  linkTxt:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary, flex: 1 },
  routeRow:     { gap: 4 },
  routeStop:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  routeDot:     { width: 12, height: 12, borderRadius: 6 },
  routeLine:    { width: 2, height: 16, backgroundColor: colors.borderSubtle, marginLeft: 5 },
  routeLabel:   { fontFamily: fonts.bodyBold, fontSize: 9, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase" },
  routeCity:    { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  subLabel:     { fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  pointRow:     { flexDirection: "row", alignItems: "flex-start", paddingVertical: 5, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  pointName:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  pointMeta:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  dayRow:       { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  dayBadge:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  dayBadgeTxt:  { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  dayTitle:     { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  dayMeta:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  dayDesc:      { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  fleetStats:   { flexDirection: "row", backgroundColor: colors.primaryLight, borderRadius: 20, paddingVertical: 12, marginBottom: 12 },
  fleetStat:    { flex: 1, alignItems: "center" },
  fleetStatVal: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  fleetStatLbl: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase" },
  busCard:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  busNum:       { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  busMeta:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  acBadge:      { backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  acBadgeTxt:   { fontFamily: fonts.bodyBold, fontSize: 10, color: "#0284C7" },
  driverCard:   { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, padding: 12, backgroundColor: colors.primaryLight, borderRadius: 20 },
  driverIcon:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + "25", alignItems: "center", justifyContent: "center" },
  driverName:   { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  driverMeta:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  driverBadge:  { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  driverBadgeTxt:{ fontFamily: fonts.bodyBold, fontSize: 10, color: "#fff" },
  pricingGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  priceBox:     { flex: 1, minWidth: "45%", backgroundColor: colors.primaryLight, borderRadius: 20, padding: 12, alignItems: "center" },
  priceBoxLbl:  { fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase" },
  priceBoxVal:  { fontFamily: fonts.heading, fontSize: 20, color: colors.primary, marginTop: 4 },
  featureRow:   { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5 },
  featureTxt:   { fontFamily: fonts.bodyMedium, fontSize: 13 },
  volRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  volAvatar:    { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  volName:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  volMeta:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: "capitalize" },
  volTask:      { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, maxWidth: 100 },
  facilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  facilityItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primaryLight, borderRadius: 999 },
  facilityItemTxt:{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  listItem:     { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: "#F0FDF4", marginBottom: 4 },
  listItemTxt:  { fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary, flex: 1 },
  docRow:       { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  docName:      { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, flex: 1 },
  docBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  docBadgeTxt:  { fontFamily: fonts.bodyBold, fontSize: 10 },
  safetyGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  safetyItem:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSubtle },
  safetyItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  safetyItemTxt:{ fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  ecRow:        { paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.borderSubtle + "60" },
  ecName:       { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  ecMeta:       { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  policyText:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  actions:      { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  actionBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 999, borderWidth: 2 },
  actionBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14 },
  deleteBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  deleteBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#DC2626" },
});
