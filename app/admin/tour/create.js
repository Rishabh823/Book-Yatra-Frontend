import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform, useWindowDimensions, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { Video, ResizeMode } from "expo-av";
import { colors, fonts, radius } from "../../../lib/theme";
import { tours as toursApi, upload as uploadApi, api } from "../../../lib/api";
import { DateInput } from "../../../components/DateInput";

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 14;
const CATEGORIES = ["religious", "adventure", "cultural", "nature", "heritage", "pilgrimage", "wellness", "other"];
const TOUR_TYPES = ["temple", "pilgrimage", "mountain", "leisure", "heritage", "beach", "other"];
const DIFFICULTIES = ["easy", "moderate", "challenging", "extreme"];
const STATUSES = ["draft", "published", "cancelled"];
const BUS_TYPES = ["AC Bus", "Non AC Bus", "Sleeper", "Semi-Sleeper", "Mini Bus", "Luxury Bus"];
const LAYOUTS = ["2x2", "2x3", "sleeper", "semi_sleeper"];
const AMENITIES_LIST = ["AC", "WiFi", "USB Charging", "Reading Light", "Reclining Seats", "Blanket", "Entertainment", "Snacks", "Water Bottle"];
const FACILITIES_KEYS = ["transportation", "accommodation", "meals", "guide", "insurance", "medicalSupport", "wifi", "chargingPoint", "drinkingWater"];
const FACILITIES_LABELS = { transportation: "Transportation", accommodation: "Accommodation", meals: "Meals (3x daily)", guide: "Certified Guide", insurance: "Travel Insurance", medicalSupport: "Medical Support", wifi: "WiFi on Board", chargingPoint: "Charging Points", drinkingWater: "Drinking Water" };
const FACILITIES_ICONS = { transportation: "bus", accommodation: "bed", meals: "restaurant", guide: "person", insurance: "shield-checkmark", medicalSupport: "medkit", wifi: "wifi", chargingPoint: "flash", drinkingWater: "water" };
const VOLUNTEER_ROLES = ["coordinator", "checkin_manager", "attendance_manager", "emergency_support", "guide"];
const VOLUNTEER_ROLE_LABELS = { coordinator: "Coordinator", checkin_manager: "Check-In Manager", attendance_manager: "Attendance Manager", emergency_support: "Emergency Support", guide: "Tour Guide" };
const DOC_TYPES = ["aadhaar", "passport", "visa", "driving_license", "custom"];
const DOC_LABELS = { aadhaar: "Aadhaar Card", passport: "Passport", visa: "Visa", driving_license: "Driving License", custom: "Custom Document" };
const NOTIFICATION_KEYS = ["bookingConfirmation", "tourReminder", "busArrivalAlert", "emergencyAlert"];
const NOTIFICATION_LABELS = { bookingConfirmation: "Booking Confirmation", tourReminder: "Tour Day Reminder", busArrivalAlert: "Bus Arrival Alert", emergencyAlert: "Emergency Alert" };
const CHANNEL_KEYS = ["push", "email", "sms", "whatsapp"];
const CHANNEL_ICONS = { push: "notifications", email: "mail", sms: "chatbubble", whatsapp: "logo-whatsapp" };

const STEP_TITLES = [
  "Basic Information", "Itinerary Builder", "Route Management", "Bus Assignment",
  "Driver Assignment", "Volunteer Assignment", "Seat Management", "Pricing & Discounts",
  "Facilities & Inclusions", "Document Requirements", "Booking Rules", "Safety & Tracking",
  "Notifications", "Review & Publish",
];
const STEP_ICONS = [
  "information-circle", "map", "navigate", "bus", "person", "people", "grid",
  "pricetag", "checkbox", "document-text", "clipboard", "shield", "notifications", "checkmark-circle",
];

// ─── Initial State ────────────────────────────────────────────────────────────
const INITIAL = {
  title: "", tourCode: "", description: "", category: "religious", tourType: "pilgrimage",
  difficulty: "easy", status: "draft", coverPhotoUrl: "", gallery: [], videoUrl: "", pdfBrochure: "",
  itinerary: [], startDate: "", endDate: "",
  source: "", destination: "", pickupPoints: [], dropPoints: [], distance: "", estimatedDuration: "",
  buses: [], totalSeats: "40", seatStructure: "2x2", busType: "AC Bus",
  primaryDriver: null, backupDriver: null,
  volunteerAssignments: [],
  seatConfig: { layout: "2x2", reservedSeats: [], vipSeats: [], volunteerSeats: [], womenReservedSeats: [], autoAllocation: true },
  pricing: { adult: "", child: "", seniorCitizen: "", vip: "", earlyBirdDiscount: "", groupDiscountPct: "", groupDiscountMin: "", seasonalDiscount: "", emiEnabled: false, dynamicPricing: false },
  inclusions: [], exclusions: [],
  facilities: { transportation: false, accommodation: false, meals: false, guide: false, insurance: false, medicalSupport: false, wifi: false, chargingPoint: false, drinkingWater: false },
  requiredDocuments: [],
  bookingRules: { maxBookingCount: "10", minBookingCount: "1", maxSeatsPerBooking: "4", cancellationPolicy: "", refundPolicy: "", waitlistEnabled: false, autoApproval: true },
  safety: { sosEnabled: true, emergencyContacts: [], gpsTracking: false, driverLiveTracking: false, geofencing: false, routeMonitoring: false, emergencyBroadcasting: false },
  notifications: { bookingConfirmation: true, tourReminder: true, busArrivalAlert: true, emergencyAlert: true, push: true, email: true, sms: false, whatsapp: false },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function SectionTitle({ icon, title, sub }) {
  return (
    <View style={h.secHead}>
      <View style={h.secIconBox}><Ionicons name={icon} size={18} color={colors.primary} /></View>
      <View>
        <Text style={h.secTitle}>{title}</Text>
        {sub && <Text style={h.secSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function Field({ label, required, children, error }) {
  return (
    <View style={h.field}>
      <Text style={h.label}>{label}{required && <Text style={{ color: colors.error }}> *</Text>}</Text>
      {children}
      {error && <Text style={h.fieldError}>{error}</Text>}
    </View>
  );
}

function TInput({ value, onChangeText, placeholder, multiline, keyboardType, style, ...rest }) {
  return (
    <TextInput
      style={[h.input, multiline && h.inputMulti, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textDisabled}
      multiline={multiline}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? "top" : "center"}
      {...rest}
    />
  );
}

function Chip({ label, selected, onPress, color }) {
  return (
    <TouchableOpacity
      style={[h.chip, selected && { backgroundColor: color || colors.primary, borderColor: color || colors.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[h.chipTxt, selected && { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, sub, value, onToggle, icon }) {
  return (
    <View style={h.toggleRow}>
      {icon && <View style={h.toggleIcon}><Ionicons name={icon} size={16} color={colors.primary} /></View>}
      <View style={{ flex: 1 }}>
        <Text style={h.toggleLabel}>{label}</Text>
        {sub && <Text style={h.toggleSub}>{sub}</Text>}
      </View>
      <Switch value={!!value} onValueChange={onToggle} trackColor={{ true: colors.primary }} thumbColor="#fff" />
    </View>
  );
}

function AddItemBtn({ label, onPress }) {
  return (
    <TouchableOpacity style={h.addBtn} onPress={onPress}>
      <Ionicons name="add-circle" size={18} color={colors.primary} />
      <Text style={h.addBtnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function ItemCard({ children, onDelete }) {
  return (
    <View style={h.itemCard}>
      <View style={{ flex: 1 }}>{children}</View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={h.itemDelete}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ data, set, errors, onPickCover, onPickVideo, onPickPdf, onOpenVideo, onOpenPdf, uploading, uploadingVideo, uploadingPdf }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="information-circle" title="Basic Tour Information" sub="Core details visible to travelers" />

      <Field label="Tour Title" required error={errors.title}>
        <TInput value={data.title} onChangeText={v => set("title", v)} placeholder="e.g. Vrindavan Yatra 2026" />
      </Field>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Tour Code">
            <TInput value={data.tourCode} onChangeText={v => set("tourCode", v.toUpperCase())} placeholder="Auto-generated" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Status">
            <View style={h.row}>
              {STATUSES.map(s => (
                <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={data.status === s} onPress={() => set("status", s)}
                  color={s === "published" ? "#16A34A" : s === "cancelled" ? colors.error : colors.primary} />
              ))}
            </View>
          </Field>
        </View>
      </View>

      <Field label="Description" required error={errors.description}>
        <TInput value={data.description} onChangeText={v => set("description", v)} placeholder="Describe the yatra, its significance and highlights..." multiline />
      </Field>

      <Field label="Category">
        <View style={h.row}>{CATEGORIES.map(c => <Chip key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} selected={data.category === c} onPress={() => set("category", c)} />)}</View>
      </Field>

      <Field label="Tour Type">
        <View style={h.row}>{TOUR_TYPES.map(t => <Chip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} selected={data.tourType === t} onPress={() => set("tourType", t)} />)}</View>
      </Field>

      <Field label="Difficulty Level">
        <View style={h.row}>
          {DIFFICULTIES.map(d => {
            const col = { easy: "#16A34A", moderate: "#D97706", challenging: colors.primary, extreme: "#DC2626" }[d];
            return <Chip key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} selected={data.difficulty === d} onPress={() => set("difficulty", d)} color={col} />;
          })}
        </View>
      </Field>

      <Field label="Cover Image" required error={errors.coverPhotoUrl}>
        <TouchableOpacity style={h.imagePicker} onPress={onPickCover} disabled={uploading}>
          {data.coverPhotoUrl ? (
            <Image source={{ uri: data.coverPhotoUrl }} style={h.coverImg} resizeMode="cover" />
          ) : (
            <View style={h.imagePickerEmpty}>
              {uploading ? <ActivityIndicator color={colors.primary} /> : (
                <>
                  <Ionicons name="image-outline" size={32} color={colors.textDisabled} />
                  <Text style={h.imagePickerTxt}>Tap to upload cover image</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
        {data.coverPhotoUrl && (
          <TouchableOpacity style={h.changeImgBtn} onPress={onPickCover}>
            <Ionicons name="camera" size={14} color={colors.primary} />
            <Text style={h.changeImgTxt}>Change Image</Text>
          </TouchableOpacity>
        )}
      </Field>

      <Field label="Tour Video">
        <View style={h.uploadMediaRow}>
          <TInput style={{ flex: 1 }} value={data.videoUrl} onChangeText={v => set("videoUrl", v)} placeholder="Paste YouTube/Vimeo URL..." keyboardType="url" />
          <TouchableOpacity style={h.uploadMediaBtn} onPress={onPickVideo} disabled={uploadingVideo}>
            {uploadingVideo ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />}
          </TouchableOpacity>
        </View>
        <Text style={h.uploadHint}>Paste a URL or upload a video file from your device</Text>
        {data.videoUrl ? (
          <TouchableOpacity style={h.mediaPreview} onPress={onOpenVideo}>
            <Ionicons name="play-circle" size={28} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={h.mediaPreviewTitle}>Video attached</Text>
              <Text style={h.mediaPreviewUrl} numberOfLines={1}>{data.videoUrl}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </Field>

      <Field label="PDF Brochure">
        <View style={h.uploadMediaRow}>
          <TInput style={{ flex: 1 }} value={data.pdfBrochure} onChangeText={v => set("pdfBrochure", v)} placeholder="Paste PDF URL or upload..." keyboardType="url" />
          <TouchableOpacity style={h.uploadMediaBtn} onPress={onPickPdf} disabled={uploadingPdf}>
            {uploadingPdf ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-attach-outline" size={18} color={colors.primary} />}
          </TouchableOpacity>
        </View>
        <Text style={h.uploadHint}>Upload a PDF from your device — it will be stored securely</Text>
        {data.pdfBrochure ? (
          <TouchableOpacity style={h.mediaPreview} onPress={onOpenPdf}>
            <Ionicons name="document-text" size={28} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={h.mediaPreviewTitle}>PDF attached</Text>
              <Text style={h.mediaPreviewUrl} numberOfLines={1}>{data.pdfBrochure}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </Field>
    </ScrollView>
  );
}

function Step2({ data, set }) {
  const [showForm, setShowForm] = useState(false);
  const [dayForm, setDayForm] = useState({ day: "", title: "", description: "", location: "", startTime: "", endTime: "" });
  const [editIdx, setEditIdx] = useState(null);

  const df = (k, v) => setDayForm(p => ({ ...p, [k]: v }));

  const addDay = () => {
    if (!dayForm.title.trim()) return Alert.alert("Error", "Day title is required");
    const days = [...(data.itinerary || [])];
    const entry = { ...dayForm, day: editIdx !== null ? days[editIdx].day : days.length + 1 };
    if (editIdx !== null) { days[editIdx] = entry; } else { days.push(entry); }
    set("itinerary", days);
    setShowForm(false); setEditIdx(null);
    setDayForm({ day: "", title: "", description: "", location: "", startTime: "", endTime: "" });
  };

  const editDay = (i) => {
    setDayForm({ ...data.itinerary[i] });
    setEditIdx(i); setShowForm(true);
  };

  const removeDay = (i) => {
    const days = data.itinerary.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 }));
    set("itinerary", days);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="map" title="Day-wise Itinerary" sub="Plan each day of the journey in detail" />

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <Field label="Start Date" required>
          <DateInput value={data.startDate} onChange={v => set("startDate", v)} />
        </Field>
        <Field label="End Date" required>
          <DateInput value={data.endDate} onChange={v => set("endDate", v)} />
        </Field>
      </View>

      {(data.itinerary || []).map((day, i) => (
        <ItemCard key={i} onDelete={() => removeDay(i)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={h.dayBadge}><Text style={h.dayBadgeTxt}>Day {day.day}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={h.dayTitle}>{day.title}</Text>
              {day.location ? <Text style={h.daySub}><Ionicons name="location-outline" size={11} /> {day.location}</Text> : null}
              {day.description ? <Text style={h.dayDesc} numberOfLines={2}>{day.description}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => editDay(i)} style={{ padding: 8 }}>
              <Ionicons name="pencil" size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {(day.startTime || day.endTime) && (
            <View style={[h.row, { marginTop: 6, gap: 12 }]}>
              {day.startTime ? <Text style={h.timeChip}><Ionicons name="time-outline" size={11} /> {day.startTime}</Text> : null}
              {day.endTime ? <Text style={h.timeChip}><Ionicons name="time-outline" size={11} /> {day.endTime}</Text> : null}
            </View>
          )}
        </ItemCard>
      ))}

      {showForm ? (
        <View style={h.formCard}>
          <Text style={h.formCardTitle}>{editIdx !== null ? "Edit Day" : `Day ${(data.itinerary || []).length + 1}`}</Text>
          <Field label="Day Title" required><TInput value={dayForm.title} onChangeText={v => df("title", v)} placeholder="e.g. Departure from Delhi" /></Field>
          <Field label="Description"><TInput value={dayForm.description} onChangeText={v => df("description", v)} placeholder="Activities and highlights for this day..." multiline /></Field>
          <Field label="Location / Place"><TInput value={dayForm.location} onChangeText={v => df("location", v)} placeholder="e.g. Mathura, UP" /></Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Start Time"><TInput value={dayForm.startTime} onChangeText={v => df("startTime", v)} placeholder="06:00 AM" /></Field></View>
            <View style={{ flex: 1 }}><Field label="End Time"><TInput value={dayForm.endTime} onChangeText={v => df("endTime", v)} placeholder="08:00 PM" /></Field></View>
          </View>
          <View style={h.row}>
            <TouchableOpacity style={h.cancelBtn} onPress={() => { setShowForm(false); setEditIdx(null); }}>
              <Text style={h.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={h.saveBtn} onPress={addDay}>
              <Text style={h.saveBtnTxt}>{editIdx !== null ? "Update Day" : "Add Day"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <AddItemBtn label="Add Day" onPress={() => setShowForm(true)} />
      )}
    </ScrollView>
  );
}

function Step3({ data, set }) {
  const [showPickup, setShowPickup] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [pointForm, setPointForm] = useState({ name: "", address: "", time: "" });
  const pf = (k, v) => setPointForm(p => ({ ...p, [k]: v }));

  const addPoint = (type) => {
    if (!pointForm.name.trim()) return Alert.alert("Error", "Location name is required");
    set(type, [...(data[type] || []), { ...pointForm }]);
    setPointForm({ name: "", address: "", time: "" });
    type === "pickupPoints" ? setShowPickup(false) : setShowDrop(false);
  };

  const PointForm = ({ type, show, setShow }) => !show ? null : (
    <View style={h.formCard}>
      <Text style={h.formCardTitle}>{type === "pickupPoints" ? "Add Pickup Point" : "Add Drop Point"}</Text>
      <Field label="Location Name" required><TInput value={pointForm.name} onChangeText={v => pf("name", v)} placeholder="e.g. Kashmere Gate, Delhi" /></Field>
      <Field label="Address"><TInput value={pointForm.address} onChangeText={v => pf("address", v)} placeholder="Full address" /></Field>
      <Field label="Time"><TInput value={pointForm.time} onChangeText={v => pf("time", v)} placeholder="e.g. 05:30 AM" /></Field>
      <View style={h.row}>
        <TouchableOpacity style={h.cancelBtn} onPress={() => { setShow(false); setPointForm({ name: "", address: "", time: "" }); }}><Text style={h.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={h.saveBtn} onPress={() => addPoint(type)}><Text style={h.saveBtnTxt}>Add</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="navigate" title="Route Management" sub="Configure origin, destination and stops" />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Source / From" required><TInput value={data.source} onChangeText={v => set("source", v)} placeholder="Departure city" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Destination / To" required><TInput value={data.destination} onChangeText={v => set("destination", v)} placeholder="Arrival city" /></Field></View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Distance (km)"><TInput value={String(data.distance || "")} onChangeText={v => set("distance", v)} placeholder="e.g. 650" keyboardType="numeric" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Est. Travel Time"><TInput value={data.estimatedDuration} onChangeText={v => set("estimatedDuration", v)} placeholder="e.g. 10 hours" /></Field></View>
      </View>

      <Field label="Pickup Points">
        {(data.pickupPoints || []).map((pt, i) => (
          <ItemCard key={i} onDelete={() => set("pickupPoints", data.pickupPoints.filter((_, j) => j !== i))}>
            <Text style={h.dayTitle}>{pt.name}</Text>
            {pt.address ? <Text style={h.daySub}>{pt.address}</Text> : null}
            {pt.time ? <Text style={h.timeChip}><Ionicons name="time-outline" size={11} /> {pt.time}</Text> : null}
          </ItemCard>
        ))}
        <PointForm type="pickupPoints" show={showPickup} setShow={setShowPickup} />
        {!showPickup && <AddItemBtn label="Add Pickup Point" onPress={() => { setShowPickup(true); setShowDrop(false); }} />}
      </Field>

      <Field label="Drop Points">
        {(data.dropPoints || []).map((pt, i) => (
          <ItemCard key={i} onDelete={() => set("dropPoints", data.dropPoints.filter((_, j) => j !== i))}>
            <Text style={h.dayTitle}>{pt.name}</Text>
            {pt.address ? <Text style={h.daySub}>{pt.address}</Text> : null}
            {pt.time ? <Text style={h.timeChip}><Ionicons name="time-outline" size={11} /> {pt.time}</Text> : null}
          </ItemCard>
        ))}
        <PointForm type="dropPoints" show={showDrop} setShow={setShowDrop} />
        {!showDrop && <AddItemBtn label="Add Drop Point" onPress={() => { setShowDrop(true); setShowPickup(false); }} />}
      </Field>
    </ScrollView>
  );
}

function Step4({ data, set, vehicles }) {
  const [showForm, setShowForm] = useState(false);
  const [busForm, setBusForm] = useState({ busNumber: "", busType: "AC Bus", capacity: "40", isAC: true, seatLayout: "2x2", amenities: [] });
  const bf = (k, v) => setBusForm(p => ({ ...p, [k]: v }));

  const assignedNumbers = new Set((data.buses || []).map(b => b.busNumber));
  const totalCap = (data.buses || []).reduce((s, b) => s + (parseInt(b.capacity) || 0), 0);

  const addBus = () => {
    if (!busForm.busNumber.trim()) return Alert.alert("Error", "Bus number is required");
    const buses = [...(data.buses || []), { ...busForm, capacity: parseInt(busForm.capacity) || 40 }];
    set("buses", buses);
    set("totalSeats", String(buses.reduce((s, b) => s + (b.capacity || 0), 0)));
    setShowForm(false);
    setBusForm({ busNumber: "", busType: "AC Bus", capacity: "40", isAC: true, seatLayout: "2x2", amenities: [] });
  };

  const addFromFleet = (v) => {
    if (assignedNumbers.has(v.registrationNo)) return;
    const buses = [...(data.buses || []), {
      busNumber: v.registrationNo,
      busType: v.type === "mini-bus" ? "Non AC Bus" : "AC Bus",
      capacity: v.capacity || 40,
      isAC: v.type !== "mini-bus",
      seatLayout: "2x2",
      amenities: [],
    }];
    set("buses", buses);
    set("totalSeats", String(buses.reduce((s, b) => s + (b.capacity || 0), 0)));
  };

  const removeBus = (i) => {
    const buses = data.buses.filter((_, j) => j !== i);
    set("buses", buses);
    set("totalSeats", String(buses.reduce((s, b) => s + (b.capacity || 0), 0) || 40));
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="bus" title="Bus Assignment" sub="Assign one or more buses to this tour" />

      <View style={h.statRow}>
        <View style={h.statBox}><Text style={h.statVal}>{(data.buses || []).length}</Text><Text style={h.statLbl}>Buses</Text></View>
        <View style={h.statBox}><Text style={h.statVal}>{totalCap || data.totalSeats || 0}</Text><Text style={h.statLbl}>Total Seats</Text></View>
      </View>

      {/* ── Assigned buses ─── */}
      {(data.buses || []).map((bus, i) => (
        <ItemCard key={i} onDelete={() => removeBus(i)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[h.busIcon, { backgroundColor: bus.isAC ? "#EFF6FF" : "#F0FDF4" }]}>
              <Ionicons name="bus" size={20} color={bus.isAC ? "#0284C7" : "#16A34A"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={h.dayTitle}>{bus.busNumber}</Text>
              <Text style={h.daySub}>{bus.busType} · {bus.capacity} seats · Layout: {bus.seatLayout}</Text>
            </View>
            {bus.isAC && <View style={h.acBadge}><Text style={h.acBadgeTxt}>AC</Text></View>}
          </View>
          {bus.amenities?.length > 0 && (
            <View style={[h.row, { marginTop: 6 }]}>
              {bus.amenities.slice(0, 3).map(a => <Text key={a} style={h.amenityChip}>{a}</Text>)}
              {bus.amenities.length > 3 && <Text style={h.amenityChip}>+{bus.amenities.length - 3}</Text>}
            </View>
          )}
        </ItemCard>
      ))}

      {/* ── Select from your fleet ─── */}
      {vehicles.length > 0 && (
        <Field label="Select from Your Fleet">
          {vehicles.map(v => {
            const already = assignedNumbers.has(v.registrationNo);
            return (
              <TouchableOpacity
                key={v._id}
                style={[h.fleetRow, already && h.fleetRowActive]}
                onPress={() => already ? null : addFromFleet(v)}
                activeOpacity={already ? 1 : 0.75}
              >
                <View style={[h.busIcon, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="bus" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={h.dayTitle}>{v.registrationNo}</Text>
                  <Text style={h.daySub}>{v.make || v.type} · {v.capacity} seats</Text>
                </View>
                {already
                  ? <View style={h.fleetCheckBadge}><Ionicons name="checkmark-circle" size={20} color="#16A34A" /></View>
                  : <View style={h.fleetAddBadge}><Ionicons name="add-circle-outline" size={20} color={colors.primary} /></View>
                }
              </TouchableOpacity>
            );
          })}
        </Field>
      )}

      {/* ── Add custom bus ─── */}
      {showForm ? (
        <View style={h.formCard}>
          <Text style={h.formCardTitle}>Add Bus</Text>
          <Field label="Bus Number / Registration" required><TInput value={busForm.busNumber} onChangeText={v => bf("busNumber", v.toUpperCase())} placeholder="e.g. DL 1AB 1234" /></Field>
          <Field label="Bus Type"><View style={h.row}>{BUS_TYPES.map(t => <Chip key={t} label={t} selected={busForm.busType === t} onPress={() => bf("busType", t)} />)}</View></Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Seating Capacity"><TInput value={busForm.capacity} onChangeText={v => bf("capacity", v)} keyboardType="numeric" placeholder="40" /></Field></View>
            <View style={{ flex: 1 }}><Field label="Seat Layout"><View style={h.row}>{LAYOUTS.map(l => <Chip key={l} label={l} selected={busForm.seatLayout === l} onPress={() => bf("seatLayout", l)} />)}</View></Field></View>
          </View>
          <ToggleRow label="Air Conditioned" value={busForm.isAC} onToggle={v => bf("isAC", v)} icon="snow" />
          <Field label="Amenities">
            <View style={h.row}>
              {AMENITIES_LIST.map(a => <Chip key={a} label={a} selected={(busForm.amenities || []).includes(a)} onPress={() => bf("amenities", busForm.amenities.includes(a) ? busForm.amenities.filter(x => x !== a) : [...busForm.amenities, a])} />)}
            </View>
          </Field>
          <View style={h.row}>
            <TouchableOpacity style={h.cancelBtn} onPress={() => setShowForm(false)}><Text style={h.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={h.saveBtn} onPress={addBus}><Text style={h.saveBtnTxt}>Add Bus</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <AddItemBtn label="Add New Bus" onPress={() => setShowForm(true)} />
      )}
    </ScrollView>
  );
}

function Step5({ data, set, drivers }) {
  const DriverCard = ({ driver, type }) => driver ? (
    <View style={h.driverCard}>
      <View style={h.driverAvatar}><Ionicons name="person" size={24} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={h.dayTitle}>{driver.name || "Driver Name"}</Text>
        <Text style={h.daySub}>License: {driver.licenseNo || "—"} · Exp: {driver.experience || 0} yrs</Text>
        <Text style={h.daySub}>📱 {driver.phone || "—"}</Text>
      </View>
      <TouchableOpacity onPress={() => set(type, null)} style={{ padding: 8 }}>
        <Ionicons name="close-circle" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="person" title="Driver Assignment" sub="Assign primary and backup drivers" />

      <Field label="Primary Driver">
        {data.primaryDriver ? (
          <DriverCard driver={drivers.find(d => d._id === data.primaryDriver) || { name: "Selected Driver" }} type="primaryDriver" />
        ) : (
          <View style={h.emptyBox}>
            <Ionicons name="person-outline" size={28} color={colors.textDisabled} />
            <Text style={h.emptyBoxTxt}>No primary driver assigned</Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={h.row}>
            {drivers.map(d => (
              <TouchableOpacity key={d._id} style={[h.driverChip, data.primaryDriver === d._id && h.driverChipActive]} onPress={() => set("primaryDriver", d._id)}>
                <Text style={[h.driverChipTxt, data.primaryDriver === d._id && { color: "#fff" }]}>{d.name}</Text>
                <Text style={[h.driverChipSub, data.primaryDriver === d._id && { color: "rgba(255,255,255,0.8)" }]}>{d.experience || 0}yr exp</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Field>

      <Field label="Backup Driver">
        {data.backupDriver ? (
          <DriverCard driver={drivers.find(d => d._id === data.backupDriver) || { name: "Selected Driver" }} type="backupDriver" />
        ) : (
          <View style={h.emptyBox}>
            <Ionicons name="person-outline" size={28} color={colors.textDisabled} />
            <Text style={h.emptyBoxTxt}>No backup driver assigned</Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={h.row}>
            {drivers.filter(d => d._id !== data.primaryDriver).map(d => (
              <TouchableOpacity key={d._id} style={[h.driverChip, data.backupDriver === d._id && h.driverChipActive]} onPress={() => set("backupDriver", d._id)}>
                <Text style={[h.driverChipTxt, data.backupDriver === d._id && { color: "#fff" }]}>{d.name}</Text>
                <Text style={[h.driverChipSub, data.backupDriver === d._id && { color: "rgba(255,255,255,0.8)" }]}>{d.experience || 0}yr exp</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Field>

      {drivers.length === 0 && (
        <View style={[h.emptyBox, { marginTop: 16 }]}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textDisabled} />
          <Text style={h.emptyBoxTxt}>No drivers found. Add drivers from the Drivers section first.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Step6({ data, set, volunteerList }) {
  const [showForm, setShowForm] = useState(false);
  const [vForm, setVForm] = useState({ volunteerId: "", role: "coordinator", tasks: "" });
  const vf = (k, v) => setVForm(p => ({ ...p, [k]: v }));

  const assigned = data.volunteerAssignments || [];
  const assignedIds = assigned.map(a => a.volunteerId);

  const addAssignment = () => {
    if (!vForm.volunteerId) return Alert.alert("Error", "Please select a volunteer");
    if (assignedIds.includes(vForm.volunteerId)) return Alert.alert("Duplicate", "This volunteer is already assigned");
    const tasks = vForm.tasks.split(",").map(t => t.trim()).filter(Boolean);
    set("volunteerAssignments", [...assigned, { volunteerId: vForm.volunteerId, role: vForm.role, tasks }]);
    setVForm({ volunteerId: "", role: "coordinator", tasks: "" });
    setShowForm(false);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="people" title="Volunteer Assignment" sub="Assign volunteers with specific roles" />

      {assigned.map((a, i) => {
        const vol = volunteerList.find(v => v._id === a.volunteerId);
        return (
          <ItemCard key={i} onDelete={() => set("volunteerAssignments", assigned.filter((_, j) => j !== i))}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={h.volAvatar}><Ionicons name="person" size={16} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={h.dayTitle}>{vol?.name || "Volunteer"}</Text>
                <View style={h.row}>
                  <View style={h.roleBadge}><Text style={h.roleBadgeTxt}>{VOLUNTEER_ROLE_LABELS[a.role] || a.role}</Text></View>
                </View>
                {a.tasks?.length > 0 && <Text style={h.daySub} numberOfLines={1}>Tasks: {a.tasks.join(", ")}</Text>}
              </View>
            </View>
          </ItemCard>
        );
      })}

      {showForm ? (
        <View style={h.formCard}>
          <Text style={h.formCardTitle}>Assign Volunteer</Text>
          <Field label="Select Volunteer" required>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={h.row}>
                {volunteerList.filter(v => !assignedIds.includes(v._id)).map(v => (
                  <TouchableOpacity key={v._id} style={[h.driverChip, vForm.volunteerId === v._id && h.driverChipActive]} onPress={() => vf("volunteerId", v._id)}>
                    <Text style={[h.driverChipTxt, vForm.volunteerId === v._id && { color: "#fff" }]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Field>
          <Field label="Role">
            <View style={h.row}>{VOLUNTEER_ROLES.map(r => <Chip key={r} label={VOLUNTEER_ROLE_LABELS[r]} selected={vForm.role === r} onPress={() => vf("role", r)} />)}</View>
          </Field>
          <Field label="Tasks (comma separated)">
            <TInput value={vForm.tasks} onChangeText={v => vf("tasks", v)} placeholder="e.g. Handle boarding, Collect IDs" />
          </Field>
          <View style={h.row}>
            <TouchableOpacity style={h.cancelBtn} onPress={() => setShowForm(false)}><Text style={h.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={h.saveBtn} onPress={addAssignment}><Text style={h.saveBtnTxt}>Assign</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <AddItemBtn label="Assign Volunteer" onPress={() => setShowForm(true)} />
      )}
    </ScrollView>
  );
}

function Step7({ data, set }) {
  const layout = data.seatConfig?.layout || "2x2";
  const totalSeats = parseInt(data.totalSeats) || 40;
  const cfg = data.seatConfig || {};

  const toggle = (category, seatNum) => {
    const current = [...(cfg[category] || [])];
    const idx = current.indexOf(seatNum);
    const newArr = idx >= 0 ? current.filter(s => s !== seatNum) : [...current, seatNum];
    set("seatConfig", { ...cfg, [category]: newArr });
  };

  const getSeatColor = (num) => {
    if (cfg.vipSeats?.includes(num)) return ["#D97706", "#FFFBEB"];
    if (cfg.womenReservedSeats?.includes(num)) return ["#DB2777", "#FDF2F8"];
    if (cfg.volunteerSeats?.includes(num)) return ["#16A34A", "#F0FDF4"];
    if (cfg.reservedSeats?.includes(num)) return ["#0284C7", "#EFF6FF"];
    return [colors.textDisabled, "#fff"];
  };

  const cols = layout === "2x3" ? 5 : layout.includes("sleeper") ? 3 : 4;
  const rows = Math.ceil(totalSeats / (cols === 5 ? 5 : cols === 3 ? 3 : 4));

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="grid" title="Seat Management" sub="Configure seat categories and reservations" />

      <Field label="Seat Layout">
        <View style={h.row}>{LAYOUTS.map(l => <Chip key={l} label={l} selected={layout === l} onPress={() => set("seatConfig", { ...cfg, layout: l })} />)}</View>
      </Field>

      <ToggleRow label="Auto Seat Allocation" sub="System assigns seats automatically to passengers" value={cfg.autoAllocation} onToggle={v => set("seatConfig", { ...cfg, autoAllocation: v })} icon="color-wand" />

      <View style={h.legendRow}>
        {[["vipSeats", "#D97706", "VIP"], ["womenReservedSeats", "#DB2777", "Women"], ["volunteerSeats", "#16A34A", "Volunteer"], ["reservedSeats", "#0284C7", "Reserved"]].map(([k, c, l]) => (
          <View key={k} style={h.legendItem}>
            <View style={[h.legendDot, { backgroundColor: c }]} />
            <Text style={h.legendTxt}>{l}: {(cfg[k] || []).length}</Text>
          </View>
        ))}
      </View>

      <Text style={h.seatNote}>Tap a seat to cycle through categories. Empty = standard.</Text>
      <View style={h.seatGrid}>
        {Array.from({ length: Math.min(totalSeats, 60) }, (_, i) => {
          const num = i + 1;
          const [color, bg] = getSeatColor(num);
          return (
            <TouchableOpacity key={num} style={[h.seat, { backgroundColor: bg, borderColor: color }]}
              onPress={() => {
                const cats = ["vipSeats", "womenReservedSeats", "volunteerSeats", "reservedSeats"];
                const current = cats.find(c => (cfg[c] || []).includes(num));
                if (current) {
                  const next = cats[(cats.indexOf(current) + 1) % (cats.length + 1)];
                  const cleaned = { ...cfg };
                  cats.forEach(c => { cleaned[c] = (cleaned[c] || []).filter(s => s !== num); });
                  if (next) cleaned[next] = [...(cleaned[next] || []), num];
                  set("seatConfig", cleaned);
                } else {
                  toggle("vipSeats", num);
                }
              }}>
              <Text style={[h.seatNum, { color }]}>{num}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {totalSeats > 60 && <Text style={h.seatNote}>Showing first 60 of {totalSeats} seats</Text>}
    </ScrollView>
  );
}

function Step8({ data, set }) {
  const p = data.pricing || {};
  const pp = (k, v) => set("pricing", { ...p, [k]: v });

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="pricetag" title="Pricing & Discounts" sub="Set per-category prices and discount rules" />

      <View style={h.pricingGrid}>
        {[["adult", "Adult", "person"], ["child", "Child (< 12yr)", "happy"], ["seniorCitizen", "Senior Citizen", "accessibility"], ["vip", "VIP / Premium", "star"]].map(([key, label, icon]) => (
          <View key={key} style={h.priceBox}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Ionicons name={icon} size={14} color={colors.primary} />
              <Text style={h.priceBoxLabel}>{label}</Text>
            </View>
            <View style={h.priceInputRow}>
              <Text style={h.currencySymbol}>₹</Text>
              <TextInput style={h.priceInput} value={String(p[key] || "")} onChangeText={v => pp(key, v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDisabled} />
            </View>
          </View>
        ))}
      </View>

      <SectionTitle icon="gift" title="Discounts" sub="Configure applicable discounts" />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Early Bird Discount (%)"><TInput value={String(p.earlyBirdDiscount || "")} onChangeText={v => pp("earlyBirdDiscount", v)} keyboardType="numeric" placeholder="0" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Seasonal Discount (%)"><TInput value={String(p.seasonalDiscount || "")} onChangeText={v => pp("seasonalDiscount", v)} keyboardType="numeric" placeholder="0" /></Field></View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Group Discount (%)"><TInput value={String(p.groupDiscountPct || "")} onChangeText={v => pp("groupDiscountPct", v)} keyboardType="numeric" placeholder="0" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Min Group Size"><TInput value={String(p.groupDiscountMin || "")} onChangeText={v => pp("groupDiscountMin", v)} keyboardType="numeric" placeholder="5" /></Field></View>
      </View>

      <ToggleRow label="EMI Payment Enabled" sub="Allow passengers to pay in installments" value={p.emiEnabled} onToggle={v => pp("emiEnabled", v)} icon="card" />
      <ToggleRow label="Dynamic Pricing" sub="Automatically adjust price based on demand" value={p.dynamicPricing} onToggle={v => pp("dynamicPricing", v)} icon="trending-up" />
    </ScrollView>
  );
}

function Step9({ data, set }) {
  const [inclText, setInclText] = useState("");
  const [exclText, setExclText] = useState("");

  const addItem = (type, text) => {
    if (!text.trim()) return;
    set(type, [...(data[type] || []), text.trim()]);
    type === "inclusions" ? setInclText("") : setExclText("");
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="checkbox" title="Facilities & Inclusions" sub="What is included and excluded in this tour" />

      <Text style={h.subSectionLabel}>Facilities Included in Tour</Text>
      <View style={h.facilityGrid}>
        {FACILITIES_KEYS.map(key => (
          <TouchableOpacity key={key} style={[h.facilityCard, data.facilities?.[key] && h.facilityCardActive]} onPress={() => set("facilities", { ...data.facilities, [key]: !data.facilities?.[key] })}>
            <View style={[h.facilityIcon, data.facilities?.[key] && { backgroundColor: colors.primary }]}>
              <Ionicons name={FACILITIES_ICONS[key]} size={18} color={data.facilities?.[key] ? "#fff" : colors.textSecondary} />
            </View>
            <Text style={[h.facilityLabel, data.facilities?.[key] && { color: colors.primary, fontFamily: fonts.bodyBold }]}>{FACILITIES_LABELS[key]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={h.subSectionLabel}>Custom Inclusions</Text>
      {(data.inclusions || []).map((item, i) => (
        <View key={i} style={h.listItem}>
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
          <Text style={h.listItemTxt}>{item}</Text>
          <TouchableOpacity onPress={() => set("inclusions", data.inclusions.filter((_, j) => j !== i))}><Ionicons name="close" size={16} color={colors.textDisabled} /></TouchableOpacity>
        </View>
      ))}
      <View style={h.row}>
        <TInput style={{ flex: 1 }} value={inclText} onChangeText={setInclText} placeholder="e.g. Accommodation at dharamshala" />
        <TouchableOpacity style={h.addInlineBtn} onPress={() => addItem("inclusions", inclText)}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
      </View>

      <Text style={[h.subSectionLabel, { marginTop: 20 }]}>Exclusions</Text>
      {(data.exclusions || []).map((item, i) => (
        <View key={i} style={[h.listItem, { borderColor: "#FEE2E2", backgroundColor: "#FEF2F2" }]}>
          <Ionicons name="close-circle" size={16} color="#DC2626" />
          <Text style={h.listItemTxt}>{item}</Text>
          <TouchableOpacity onPress={() => set("exclusions", data.exclusions.filter((_, j) => j !== i))}><Ionicons name="close" size={16} color={colors.textDisabled} /></TouchableOpacity>
        </View>
      ))}
      <View style={h.row}>
        <TInput style={{ flex: 1 }} value={exclText} onChangeText={setExclText} placeholder="e.g. Personal expenses" />
        <TouchableOpacity style={[h.addInlineBtn, { backgroundColor: "#DC2626" }]} onPress={() => addItem("exclusions", exclText)}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Step10({ data, set }) {
  const [showForm, setShowForm] = useState(false);
  const [docForm, setDocForm] = useState({ docType: "aadhaar", name: "", mandatory: true });
  const df = (k, v) => setDocForm(p => ({ ...p, [k]: v }));

  const addDoc = () => {
    const name = docForm.docType === "custom" ? docForm.name.trim() : DOC_LABELS[docForm.docType];
    if (!name) return Alert.alert("Error", "Please enter document name");
    set("requiredDocuments", [...(data.requiredDocuments || []), { docType: docForm.docType, name, mandatory: docForm.mandatory }]);
    setDocForm({ docType: "aadhaar", name: "", mandatory: true });
    setShowForm(false);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="document-text" title="Document Requirements" sub="Configure documents passengers must carry" />

      {(data.requiredDocuments || []).map((doc, i) => (
        <ItemCard key={i} onDelete={() => set("requiredDocuments", data.requiredDocuments.filter((_, j) => j !== i))}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={h.docIcon}><Ionicons name="document" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={h.dayTitle}>{doc.name}</Text>
              <View style={h.row}>
                <View style={[h.roleBadge, { backgroundColor: doc.mandatory ? "#FEF2F2" : "#F0FDF4" }]}>
                  <Text style={[h.roleBadgeTxt, { color: doc.mandatory ? colors.error : "#16A34A" }]}>{doc.mandatory ? "Mandatory" : "Optional"}</Text>
                </View>
              </View>
            </View>
          </View>
        </ItemCard>
      ))}

      {showForm ? (
        <View style={h.formCard}>
          <Text style={h.formCardTitle}>Add Document</Text>
          <Field label="Document Type">
            <View style={h.row}>{DOC_TYPES.map(t => <Chip key={t} label={DOC_LABELS[t]} selected={docForm.docType === t} onPress={() => df("docType", t)} />)}</View>
          </Field>
          {docForm.docType === "custom" && <Field label="Document Name" required><TInput value={docForm.name} onChangeText={v => df("name", v)} placeholder="e.g. Medical Certificate" /></Field>}
          <ToggleRow label="Mandatory Document" sub="Passenger cannot board without this" value={docForm.mandatory} onToggle={v => df("mandatory", v)} icon="shield" />
          <View style={h.row}>
            <TouchableOpacity style={h.cancelBtn} onPress={() => setShowForm(false)}><Text style={h.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={h.saveBtn} onPress={addDoc}><Text style={h.saveBtnTxt}>Add</Text></TouchableOpacity>
          </View>
        </View>
      ) : <AddItemBtn label="Add Document Requirement" onPress={() => setShowForm(true)} />}
    </ScrollView>
  );
}

function Step11({ data, set }) {
  const r = data.bookingRules || {};
  const rr = (k, v) => set("bookingRules", { ...r, [k]: v });

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="clipboard" title="Booking Rules" sub="Configure how bookings are managed" />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Max Bookings Total"><TInput value={String(r.maxBookingCount || "")} onChangeText={v => rr("maxBookingCount", v)} keyboardType="numeric" placeholder="10" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Min Bookings Required"><TInput value={String(r.minBookingCount || "")} onChangeText={v => rr("minBookingCount", v)} keyboardType="numeric" placeholder="1" /></Field></View>
      </View>
      <Field label="Max Seats Per Booking">
        <TInput value={String(r.maxSeatsPerBooking || "")} onChangeText={v => rr("maxSeatsPerBooking", v)} keyboardType="numeric" placeholder="4" />
      </Field>
      <Field label="Cancellation Policy">
        <TInput value={r.cancellationPolicy || ""} onChangeText={v => rr("cancellationPolicy", v)} placeholder="e.g. Full refund if cancelled 7+ days before departure..." multiline />
      </Field>
      <Field label="Refund Policy">
        <TInput value={r.refundPolicy || ""} onChangeText={v => rr("refundPolicy", v)} placeholder="e.g. 90% refund within 48 hours of request..." multiline />
      </Field>
      <ToggleRow label="Enable Waitlist" sub="Allow passengers to join waitlist when tour is full" value={r.waitlistEnabled} onToggle={v => rr("waitlistEnabled", v)} icon="list" />
      <ToggleRow label="Auto Approval" sub="Automatically confirm bookings without manual review" value={r.autoApproval} onToggle={v => rr("autoApproval", v)} icon="checkmark-circle" />
    </ScrollView>
  );
}

function Step12({ data, set }) {
  const sv = data.safety || {};
  const ss = (k, v) => set("safety", { ...sv, [k]: v });
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", relation: "" });

  const addContact = () => {
    if (!contactForm.name || !contactForm.phone) return Alert.alert("Error", "Name and phone are required");
    ss("emergencyContacts", [...(sv.emergencyContacts || []), { ...contactForm }]);
    setContactForm({ name: "", phone: "", relation: "" });
    setShowContact(false);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="shield" title="Safety & Tracking" sub="Configure safety features and monitoring" />
      <ToggleRow label="SOS Emergency Button" sub="Passengers can trigger SOS during the tour" value={sv.sosEnabled} onToggle={v => ss("sosEnabled", v)} icon="alert-circle" />
      <ToggleRow label="GPS Tracking" sub="Track tour bus location in real-time" value={sv.gpsTracking} onToggle={v => ss("gpsTracking", v)} icon="location" />
      <ToggleRow label="Driver Live Tracking" sub="Share driver location with all passengers" value={sv.driverLiveTracking} onToggle={v => ss("driverLiveTracking", v)} icon="navigate" />
      <ToggleRow label="Geo Fencing" sub="Alert when bus deviates from planned route" value={sv.geofencing} onToggle={v => ss("geofencing", v)} icon="map" />
      <ToggleRow label="Route Monitoring" sub="Continuous route adherence monitoring" value={sv.routeMonitoring} onToggle={v => ss("routeMonitoring", v)} icon="pulse" />
      <ToggleRow label="Emergency Broadcasting" sub="Send mass alerts to all passengers" value={sv.emergencyBroadcasting} onToggle={v => ss("emergencyBroadcasting", v)} icon="radio" />

      <Text style={[h.subSectionLabel, { marginTop: 20 }]}>Emergency Contacts</Text>
      {(sv.emergencyContacts || []).map((c, i) => (
        <ItemCard key={i} onDelete={() => ss("emergencyContacts", sv.emergencyContacts.filter((_, j) => j !== i))}>
          <Text style={h.dayTitle}>{c.name} <Text style={h.daySub}>({c.relation || "—"})</Text></Text>
          <Text style={h.daySub}>📱 {c.phone}</Text>
        </ItemCard>
      ))}
      {showContact ? (
        <View style={h.formCard}>
          <Field label="Name" required><TInput value={contactForm.name} onChangeText={v => setContactForm(p => ({ ...p, name: v }))} placeholder="Contact name" /></Field>
          <Field label="Phone" required><TInput value={contactForm.phone} onChangeText={v => setContactForm(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" keyboardType="phone-pad" /></Field>
          <Field label="Relation"><TInput value={contactForm.relation} onChangeText={v => setContactForm(p => ({ ...p, relation: v }))} placeholder="e.g. Tour Coordinator" /></Field>
          <View style={h.row}>
            <TouchableOpacity style={h.cancelBtn} onPress={() => setShowContact(false)}><Text style={h.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={h.saveBtn} onPress={addContact}><Text style={h.saveBtnTxt}>Add</Text></TouchableOpacity>
          </View>
        </View>
      ) : <AddItemBtn label="Add Emergency Contact" onPress={() => setShowContact(true)} />}
    </ScrollView>
  );
}

function Step13({ data, set }) {
  const n = data.notifications || {};
  const nn = (k, v) => set("notifications", { ...n, [k]: v });

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="notifications" title="Notification Settings" sub="Configure automated passenger notifications" />
      <Text style={h.subSectionLabel}>Notification Types</Text>
      {NOTIFICATION_KEYS.map(key => (
        <ToggleRow key={key} label={NOTIFICATION_LABELS[key]} value={n[key]} onToggle={v => nn(key, v)} icon="notifications-outline" />
      ))}
      <Text style={[h.subSectionLabel, { marginTop: 20 }]}>Delivery Channels</Text>
      {CHANNEL_KEYS.map(key => (
        <ToggleRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={n[key]} onToggle={v => nn(key, v)} icon={CHANNEL_ICONS[key]} />
      ))}
    </ScrollView>
  );
}

function Step14({ data, tourId, saving, onSaveDraft, onPublish }) {
  const p = data.pricing || {};
  const adultPrice = p.adult || 0;
  const reviewSections = [
    { icon: "information-circle", title: "Basic Info", items: [["Title", data.title], ["Code", data.tourCode], ["Category", data.category], ["Difficulty", data.difficulty], ["Status", data.status]] },
    { icon: "map", title: "Itinerary", items: [["Days Planned", (data.itinerary || []).length], ["Start Date", data.startDate], ["End Date", data.endDate]] },
    { icon: "navigate", title: "Route", items: [["From", data.source], ["To", data.destination], ["Pickup Points", (data.pickupPoints || []).length], ["Drop Points", (data.dropPoints || []).length]] },
    { icon: "bus", title: "Fleet", items: [["Buses Assigned", (data.buses || []).length], ["Total Seats", data.totalSeats], ["Layout", data.seatStructure]] },
    { icon: "pricetag", title: "Pricing", items: [["Adult Price", adultPrice ? `₹${adultPrice}` : "—"], ["Child Price", p.child ? `₹${p.child}` : "—"], ["VIP Price", p.vip ? `₹${p.vip}` : "—"]] },
    { icon: "shield", title: "Safety", items: [["SOS Enabled", data.safety?.sosEnabled ? "Yes" : "No"], ["GPS Tracking", data.safety?.gpsTracking ? "Yes" : "No"], ["Emergency Contacts", (data.safety?.emergencyContacts || []).length]] },
    { icon: "checkbox", title: "Facilities", items: Object.entries(data.facilities || {}).filter(([, v]) => v).map(([k]) => [FACILITIES_LABELS[k], "Included"]) },
    { icon: "document-text", title: "Documents", items: (data.requiredDocuments || []).map(d => [d.name, d.mandatory ? "Mandatory" : "Optional"]) },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero summary card — white flat */}
      <View style={s14.hero}>
        <Text style={s14.heroTitle}>{data.title || "Unnamed Tour"}</Text>
        {data.tourCode ? <Text style={s14.heroCode}>#{data.tourCode}</Text> : null}
        <View style={s14.heroStats}>
          <View style={s14.heroStat}><Text style={s14.heroStatVal}>{(data.itinerary || []).length}</Text><Text style={s14.heroStatLbl}>Days</Text></View>
          <View style={s14.heroDivider} />
          <View style={s14.heroStat}><Text style={s14.heroStatVal}>{data.totalSeats || 0}</Text><Text style={s14.heroStatLbl}>Seats</Text></View>
          <View style={s14.heroDivider} />
          <View style={s14.heroStat}><Text style={s14.heroStatVal}>{adultPrice ? `₹${adultPrice}` : "—"}</Text><Text style={s14.heroStatLbl}>Adult</Text></View>
          <View style={s14.heroDivider} />
          <View style={s14.heroStat}>
            <Text style={[s14.heroStatVal, { color: data.status === "published" ? "#16A34A" : "#D97706" }]}>
              {data.status || "draft"}
            </Text>
            <Text style={s14.heroStatLbl}>Status</Text>
          </View>
        </View>
      </View>

      {reviewSections.map((sec, si) => (
        sec.items.length > 0 && (
          <View key={si} style={s14.section}>
            <View style={s14.sectionHead}>
              <Ionicons name={sec.icon} size={14} color={colors.primary} />
              <Text style={s14.sectionTitle}>{sec.title}</Text>
            </View>
            {sec.items.map(([k, v], i) => (
              <View key={i} style={s14.row}>
                <Text style={s14.rowKey}>{k}</Text>
                <Text style={s14.rowVal} numberOfLines={2}>{v !== null && v !== undefined && v !== "" ? String(v) : "—"}</Text>
              </View>
            ))}
          </View>
        )
      ))}

      <View style={s14.actions}>
        <TouchableOpacity style={s14.draftBtn} onPress={onSaveDraft} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} size="small" /> : (
            <><Ionicons name="save-outline" size={16} color={colors.primary} /><Text style={s14.draftBtnTxt}>Save Draft</Text></>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={s14.publishBtn} onPress={onPublish} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="rocket" size={16} color="#fff" /><Text style={s14.publishBtnTxt}>{tourId ? "Update & Publish" : "Publish Tour"}</Text></>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function CreateTour() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [tour, setTour] = useState(INITIAL);
  const [tourId, setTourId] = useState(id || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [volunteerList, setVolunteerList] = useState([]);
  const [errors, setErrors] = useState({});

  // Load existing tour for editing
  React.useEffect(() => {
    if (id) {
      toursApi.byId(id).then(res => {
        const t = res?.data || res;
        if (!t) return;
        // Flatten nested structures back to wizard's flat state
        const n = t.notifications || {};
        const p = t.pricing || {};
        setTour({
          ...INITIAL, ...t,
          startDate: t.startDate ? String(t.startDate).slice(0, 10) : "",
          endDate: t.endDate ? String(t.endDate).slice(0, 10) : "",
          totalSeats: String(t.totalSeats || t.seats || 40),
          pricing: {
            adult: String(p.adult || 0),
            child: String(p.child || 0),
            seniorCitizen: String(p.seniorCitizen || 0),
            vip: String(p.vip || 0),
            earlyBirdDiscount: String(p.earlyBirdDiscount || 0),
            groupDiscountPct: String(p.groupDiscount?.percentage || 0),
            groupDiscountMin: String(p.groupDiscount?.minGroupSize || 5),
            seasonalDiscount: String(p.seasonalDiscount || 0),
            emiEnabled: p.emiEnabled || false,
            dynamicPricing: p.dynamicPricing || false,
          },
          notifications: {
            bookingConfirmation: n.bookingConfirmation ?? true,
            tourReminder: n.tourReminder ?? true,
            busArrivalAlert: n.busArrivalAlert ?? true,
            emergencyAlert: n.emergencyAlert ?? true,
            push: n.channels?.push ?? true,
            email: n.channels?.email ?? true,
            sms: n.channels?.sms ?? false,
            whatsapp: n.channels?.whatsapp ?? false,
          },
          bookingRules: { ...INITIAL.bookingRules, ...t.bookingRules },
          safety: { ...INITIAL.safety, ...t.safety },
          seatConfig: { ...INITIAL.seatConfig, ...t.seatConfig },
          facilities: { ...INITIAL.facilities, ...t.facilities },
        });
        setTourId(id);
      }).catch(() => {});
    }
    // Load supporting data
    api.get("/drivers").then(r => setDrivers(Array.isArray(r) ? r : (r?.data || []))).catch(() => {});
    api.get("/vehicles").then(r => setVehicles(Array.isArray(r) ? r : (r?.data || []))).catch(() => {});
    api.get("/volunteer/list").then(r => setVolunteerList(Array.isArray(r) ? r : (r?.data || []))).catch(() => {});
  }, [id]);

  const set = useCallback((key, value) => setTour(prev => ({ ...prev, [key]: value })), []);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo access to upload cover image");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled) return;
    setUploading(true);
    try {
      const uploaded = await uploadApi.image(res.assets[0].uri);
      set("coverPhotoUrl", uploaded?.url || uploaded?.data?.url || "");
    } catch { Alert.alert("Upload failed", "Could not upload image. Please try again."); }
    setUploading(false);
  };

  const pickVideo = async () => {
    try {
      if (Platform.OS === "web") {
        // Web: use document picker for video files
        const res = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.[0]) return;
        setUploadingVideo(true);
        const asset = res.assets[0];
        const formData = new FormData();
        formData.append("file", typeof document !== "undefined"
          ? await fetch(asset.uri).then(r => r.blob())
          : { uri: asset.uri, name: asset.name, type: asset.mimeType || "video/mp4" });
        const uploaded = await api.post("/upload", formData);
        set("videoUrl", uploaded?.url || "");
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert("Permission needed", "Allow media access to upload video");
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8, videoMaxDuration: 300 });
        if (res.canceled || !res.assets?.[0]) return;
        setUploadingVideo(true);
        const asset = res.assets[0];
        const formData = new FormData();
        formData.append("file", { uri: asset.uri, name: asset.fileName || "video.mp4", type: asset.type || "video/mp4" });
        const uploaded = await api.post("/upload", formData);
        set("videoUrl", uploaded?.url || "");
      }
    } catch (e) { Alert.alert("Upload failed", e.message || "Could not upload video"); }
    setUploadingVideo(false);
  };

  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      setUploadingPdf(true);
      const asset = res.assets[0];
      const formData = new FormData();
      if (typeof document !== "undefined") {
        const blob = await fetch(asset.uri).then(r => r.blob());
        formData.append("file", blob, asset.name || "brochure.pdf");
      } else {
        formData.append("file", { uri: asset.uri, name: asset.name || "brochure.pdf", type: "application/pdf" });
      }
      const uploaded = await api.post("/upload", formData);
      set("pdfBrochure", uploaded?.url || "");
    } catch (e) { Alert.alert("Upload failed", e.message || "Could not upload PDF"); }
    setUploadingPdf(false);
  };

  const openVideo = () => {
    const url = tour.videoUrl;
    if (!url) return;
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const openPdf = () => {
    const url = tour.pdfBrochure;
    if (!url) return;
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const validate = (s) => {
    const errs = {};
    if (s === 1) {
      if (!tour.title.trim()) errs.title = "Tour title is required";
      if (!tour.description.trim()) errs.description = "Description is required";
      if (!tour.coverPhotoUrl) errs.coverPhotoUrl = "Cover image is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const autoSave = async (currentStep) => {
    if (!tour.title.trim()) return;
    setAutoSaving(true);
    try {
      const payload = { tourId, stepData: buildPayload(), stepNumber: currentStep };
      const res = await toursApi.saveDraft(payload);
      const saved = res?.data;
      if (saved?._id && !tourId) setTourId(saved._id);
    } catch {}
    setAutoSaving(false);
  };

  const buildPayload = () => {
    const p = tour.pricing || {};
    const n = tour.notifications || {};
    const r = tour.bookingRules || {};
    // Strip client-only / Mongoose internal fields that can cause validation errors
    const { _id, __v, createdAt, updatedAt, ...rest } = tour;
    return {
      ...rest,
      price: String(parseFloat(p.adult) || 0),
      totalSeats: parseInt(tour.totalSeats) || 40,
      seats: parseInt(tour.totalSeats) || 40,
      // Properly map flat pricing → nested schema
      pricing: {
        adult: parseFloat(p.adult) || 0,
        child: parseFloat(p.child) || 0,
        seniorCitizen: parseFloat(p.seniorCitizen) || 0,
        vip: parseFloat(p.vip) || 0,
        earlyBirdDiscount: parseFloat(p.earlyBirdDiscount) || 0,
        groupDiscount: {
          percentage: parseFloat(p.groupDiscountPct) || 0,
          minGroupSize: parseInt(p.groupDiscountMin) || 5,
        },
        seasonalDiscount: parseFloat(p.seasonalDiscount) || 0,
        emiEnabled: !!p.emiEnabled,
        dynamicPricing: !!p.dynamicPricing,
      },
      // Properly map flat notifications → nested schema with channels
      notifications: {
        bookingConfirmation: !!n.bookingConfirmation,
        tourReminder: !!n.tourReminder,
        busArrivalAlert: !!n.busArrivalAlert,
        emergencyAlert: !!n.emergencyAlert,
        channels: {
          push: !!n.push,
          email: !!n.email,
          sms: !!n.sms,
          whatsapp: !!n.whatsapp,
        },
      },
      bookingRules: {
        maxBookingCount: parseInt(r.maxBookingCount) || 10,
        minBookingCount: parseInt(r.minBookingCount) || 1,
        maxSeatsPerBooking: parseInt(r.maxSeatsPerBooking) || 4,
        cancellationPolicy: r.cancellationPolicy || "",
        refundPolicy: r.refundPolicy || "",
        waitlistEnabled: !!r.waitlistEnabled,
        autoApproval: r.autoApproval !== false,
      },
    };
  };

  const nextStep = async () => {
    if (!validate(step)) return;
    await autoSave(step);
    const next = Math.min(step + 1, TOTAL_STEPS);
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = { tourId, stepData: { ...buildPayload(), status: "draft" }, stepNumber: step };
      const res = await toursApi.saveDraft(payload);
      const saved = res?.data;
      if (saved?._id) setTourId(saved._id);
      Alert.alert("Saved", "Tour draft saved successfully");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save draft");
    }
    setSaving(false);
  };

  const onPublish = async () => {
    if (!tour.title.trim() || !tour.source.trim() || !tour.destination.trim()) {
      return Alert.alert("Incomplete", "Please complete at least: Tour Title, Source, and Destination before publishing.");
    }
    Alert.alert("Publish Tour", "Are you sure you want to publish this tour? It will be visible to travelers.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Publish", style: "default",
        onPress: async () => {
          setSaving(true);
          try {
            let id = tourId;
            if (!id) {
              const res = await toursApi.create({ ...buildPayload(), status: "draft" });
              id = (res?.data || res)?._id;
              setTourId(id);
            } else {
              await toursApi.update(id, buildPayload());
            }
            await toursApi.publish(id);
            Alert.alert("Published!", "Your tour is now live and visible to travelers.", [{ text: "OK", onPress: () => router.replace("/admin/tours") }]);
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to publish tour");
          }
          setSaving(false);
        },
      },
    ]);
  };

  const renderStep = () => {
    switch (step) {
      case 1:  return <Step1 data={tour} set={set} errors={errors} onPickCover={pickCover} onPickVideo={pickVideo} onPickPdf={pickPdf} onOpenVideo={openVideo} onOpenPdf={openPdf} uploading={uploading} uploadingVideo={uploadingVideo} uploadingPdf={uploadingPdf} />;
      case 2:  return <Step2 data={tour} set={set} />;
      case 3:  return <Step3 data={tour} set={set} />;
      case 4:  return <Step4 data={tour} set={set} vehicles={vehicles} />;
      case 5:  return <Step5 data={tour} set={set} drivers={drivers} />;
      case 6:  return <Step6 data={tour} set={set} volunteerList={volunteerList} />;
      case 7:  return <Step7 data={tour} set={set} />;
      case 8:  return <Step8 data={tour} set={set} />;
      case 9:  return <Step9 data={tour} set={set} />;
      case 10: return <Step10 data={tour} set={set} />;
      case 11: return <Step11 data={tour} set={set} />;
      case 12: return <Step12 data={tour} set={set} />;
      case 13: return <Step13 data={tour} set={set} />;
      case 14: return <Step14 data={tour} tourId={tourId} saving={saving} onSaveDraft={onSaveDraft} onPublish={onPublish} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{tour.title || "New Tour"}</Text>
          <Text style={s.headerSub}>Step {step} of {TOTAL_STEPS} — {STEP_TITLES[step - 1]}</Text>
        </View>
        <View style={s.headerRight}>
          {autoSaving && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 8 }} />}
          <TouchableOpacity onPress={onSaveDraft} style={s.draftTopBtn}>
            <Ionicons name="save-outline" size={14} color={colors.primary} />
            <Text style={s.draftTopBtnTxt}>Draft</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={s.progressTxt}>{Math.round((step / TOTAL_STEPS) * 100)}%</Text>
      </View>

      {/* Step Pills (horizontal scroll) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsContent}>
        {STEP_TITLES.map((title, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <TouchableOpacity key={n} style={[s.pill, active && s.pillActive, done && s.pillDone]} onPress={() => { if (done || active) setStep(n); }}>
              <View style={[s.pillDot, active && s.pillDotActive, done && s.pillDotDone]}>
                {done ? <Ionicons name="checkmark" size={10} color="#fff" /> : <Text style={[s.pillDotTxt, (active || done) && { color: "#fff" }]}>{n}</Text>}
              </View>
              <Text style={[s.pillTxt, active && { color: colors.primary, fontFamily: fonts.bodyBold }]} numberOfLines={1}>{title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Step Content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={s.content} contentContainerStyle={s.contentPad} showsVerticalScrollIndicator={false}>
          {renderStep()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation Footer */}
      {step < 14 && (
        <View style={s.footer}>
          <TouchableOpacity style={[s.footerBack, step === 1 && s.footerBackDisabled]} onPress={prevStep} disabled={step === 1}>
            <Ionicons name="chevron-back" size={16} color={step === 1 ? colors.textDisabled : colors.secondary} />
            <Text style={[s.footerBackTxt, step === 1 && { color: colors.textDisabled }]}>Back</Text>
          </TouchableOpacity>
          <View style={s.footerCenter}>
            <Text style={s.footerStepTxt}>{step} / {TOTAL_STEPS}</Text>
          </View>
          <TouchableOpacity style={s.footerNext} onPress={nextStep}>
            <Text style={s.footerNextTxt}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Shared Helper Styles (h) ─────────────────────────────────────────────────
const h = StyleSheet.create({
  secHead:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  secIconBox:  { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  secTitle:    { fontFamily: fonts.heading, fontSize: 18, color: colors.secondary },
  secSub:      { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  field:       { marginBottom: 16 },
  label:       { fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  fieldError:  { fontFamily: fonts.body, fontSize: 11, color: colors.error, marginTop: 4 },
  input:       { backgroundColor: "#F2F0ED", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, minHeight: 48 },
  inputMulti:  { minHeight: 90, paddingTop: 12 },
  row:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: "#fff" },
  chipTxt:     { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  toggleRow:   { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderSubtle },
  toggleIcon:  { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  toggleSub:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", justifyContent: "center", marginVertical: 8 },
  addBtnTxt:   { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  itemCard:    { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  itemDelete:  { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  formCard:    { backgroundColor: "#fff", borderRadius: 24, padding: 16, marginVertical: 8, borderWidth: 1.5, borderColor: colors.primary + "40" },
  formCardTitle:{ fontFamily: fonts.heading, fontSize: 16, color: colors.secondary, marginBottom: 14 },
  cancelBtn:   { flex: 1, height: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: "center", justifyContent: "center" },
  cancelBtnTxt:{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  saveBtn:     { flex: 2, height: 44, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  saveBtnTxt:  { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  dayBadge:    { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  dayBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary, textAlign: "center" },
  dayTitle:    { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  daySub:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  dayDesc:     { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  timeChip:    { fontFamily: fonts.body, fontSize: 11, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  imagePicker: { borderRadius: 20, overflow: "hidden", borderWidth: 1.5, borderColor: colors.borderSubtle, borderStyle: "dashed" },
  imagePickerEmpty: { height: 160, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F2F0ED" },
  imagePickerTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textDisabled },
  coverImg:    { width: "100%", height: 200 },
  changeImgBtn:{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  changeImgTxt:{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  statRow:     { flexDirection: "row", gap: 12, marginBottom: 16 },
  statBox:     { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 20, padding: 14, alignItems: "center" },
  statVal:     { fontFamily: fonts.heading, fontSize: 24, color: colors.primary },
  statLbl:     { fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 },
  busIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  acBadge:     { backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  acBadgeTxt:  { fontFamily: fonts.bodyBold, fontSize: 10, color: "#0284C7" },
  amenityChip: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, backgroundColor: colors.borderSubtle, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  fleetRow:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  fleetRowActive: { backgroundColor: "#F0FDF4", borderColor: "#16A34A" },
  fleetCheckBadge:{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fleetAddBadge:  { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  driverCard:  { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primaryLight, borderRadius: 20, padding: 12 },
  driverAvatar:{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" },
  driverChip:  { alignItems: "center", minWidth: 80, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: "#fff", marginRight: 8 },
  driverChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  driverChipTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textPrimary },
  driverChipSub: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  emptyBox:    { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 24, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  emptyBoxTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 24 },
  volAvatar:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  roleBadge:   { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  roleBadgeTxt:{ fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  legendRow:   { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:   { width: 12, height: 12, borderRadius: 6 },
  legendTxt:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  seatNote:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: "center", marginBottom: 12 },
  seatGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  seat:        { width: 38, height: 38, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  seatNum:     { fontFamily: fonts.bodyBold, fontSize: 10 },
  pricingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  priceBox:    { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  priceBoxLabel:{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  priceInputRow:{ flexDirection: "row", alignItems: "center", gap: 4, borderTopWidth: 1, borderColor: "#E5E7EB", paddingTop: 8, marginTop: 4 },
  currencySymbol:{ fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  priceInput:  { flex: 1, fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary },
  subSectionLabel:{ fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, marginTop: 4 },
  facilityGrid:{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  facilityCard:{ width: "30%", alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: "#fff", gap: 8 },
  facilityCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  facilityIcon:{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F2F0ED", alignItems: "center", justifyContent: "center" },
  facilityLabel:{ fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, textAlign: "center" },
  listItem:    { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: "#F0FDF4", marginBottom: 8 },
  listItemTxt: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },
  addInlineBtn:{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  docIcon:     { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  uploadMediaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadMediaBtn: { width: 44, height: 48, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.primary + "60" },
  uploadHint:  { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 4 },
  mediaPreview:{ flexDirection: "row", alignItems: "center", marginTop: 10, padding: 12, borderRadius: 20, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + "40" },
  mediaPreviewTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  mediaPreviewUrl: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});

// ─── Main Wizard Styles (s) ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.textPrimary },
  headerSub:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  draftTopBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.primary + "40" },
  draftTopBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  progressWrap:{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  progressBg:  { flex: 1, height: 6, backgroundColor: colors.borderSubtle, borderRadius: 3, overflow: "hidden" },
  progressFill:{ height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary, minWidth: 36 },
  pillsScroll: { maxHeight: 64 },
  pillsContent:{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", gap: 6 },
  pill:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: "#fff" },
  pillActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pillDone:    { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  pillDot:     { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderSubtle, alignItems: "center", justifyContent: "center" },
  pillDotActive:{ backgroundColor: colors.primary },
  pillDotDone: { backgroundColor: "#16A34A" },
  pillDotTxt:  { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.textSecondary },
  pillTxt:     { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  content:     { flex: 1 },
  contentPad:  { paddingHorizontal: 20, paddingTop: 20 },
  footer:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#E5E7EB" },
  footerBack:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSubtle },
  footerBackDisabled: { borderColor: colors.borderSubtle, opacity: 0.4 },
  footerBackTxt:{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.secondary },
  footerCenter:{ flex: 1, alignItems: "center" },
  footerStepTxt:{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  footerNext:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.primary },
  footerNextTxt:{ fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});

// ─── Step 14 Styles ───────────────────────────────────────────────────────────
const s14 = StyleSheet.create({
  hero:        { backgroundColor: "#fff", borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  heroTitle:   { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary, textAlign: "center" },
  heroCode:    { fontFamily: fonts.bodyBold, fontSize: 11, color: "#9CA3AF", textAlign: "center", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" },
  heroStats:   { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, backgroundColor: "#F2F0ED", borderRadius: 20, paddingVertical: 12 },
  heroStat:    { flex: 1, alignItems: "center" },
  heroStatVal: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  heroStatLbl: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: "#E5E7EB" },
  section:     { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, borderBottomWidth: 1, borderColor: colors.borderSubtle, paddingBottom: 10 },
  sectionTitle:{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.secondary },
  row:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  rowKey:      { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowVal:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, flex: 1, textAlign: "right" },
  actions:     { flexDirection: "row", gap: 12, marginTop: 8 },
  draftBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 999, borderWidth: 2, borderColor: colors.primary },
  draftBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  publishBtn:  { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 999, backgroundColor: colors.primary },
  publishBtnTxt:{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
});
