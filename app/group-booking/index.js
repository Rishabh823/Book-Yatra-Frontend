import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const STEPS = ['Type', 'Details', 'Passengers', 'Review', 'Confirm'];
const GROUP_TYPES = [
  { key: 'family', label: 'Family Group', icon: '👨‍👩‍👧‍👦', desc: 'Family pilgrimage together' },
  { key: 'group', label: 'Friends Group', icon: '👥', desc: 'Group travel with friends' },
  { key: 'corporate', label: 'Corporate / NGO', icon: '🏢', desc: 'Organized institutional group' },
];
const EMPTY_PASSENGER = { name: '', age: '', gender: 'male', phone: '' };

export default function GroupBookingScreen() {
  const { tourId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [step, setStep] = useState(0);
  const [showSuccessConfirm, setShowSuccessConfirm] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState(null);
  const [type, setType] = useState('group');
  const [groupName, setGroupName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [passengers, setPassengers] = useState([{ ...EMPTY_PASSENGER }]);
  const [tour, setTour] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tourId) {
      api.get('/tours/' + tourId).then(res => setTour(res.data || res)).catch(() => {});
    }
  }, [tourId]);

  const addPassenger = () => setPassengers(p => [...p, { ...EMPTY_PASSENGER }]);
  const removePassenger = (i) => setPassengers(p => p.filter((_, idx) => idx !== i));
  const updatePassenger = (i, field, val) =>
    setPassengers(p => p.map((pass, idx) => idx === i ? { ...pass, [field]: val } : pass));

  const canProceed = () => {
    if (step === 0) return !!type;
    if (step === 1) return groupName.trim().length >= 2 && contactPhone.trim().length >= 10;
    if (step === 2) return passengers.every(p => p.name.trim() && p.age);
    return true;
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else router.back();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        tourId,
        type,
        groupName: groupName.trim(),
        contactPhone: contactPhone.trim(),
        notes: notes.trim() || undefined,
        passengers: passengers.map(p => ({ ...p, age: parseInt(p.age) })),
        seats: passengers.length,
      };
      const res = await api.post('/group-bookings', payload);
      setSuccessBookingId(res.data?.bookingId || res.bookingId || 'Processing');
      setShowSuccessConfirm(true);
    } catch (err) {
      showToast(err.message || 'Failed to submit booking', 'error');
    }
    setSubmitting(false);
  };

  const totalPrice = (tour?.price || 0) * passengers.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Group Booking</Text>
          <Text style={styles.subtitle}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</Text>
        </View>
      </LinearGradient>

      {/* Step indicators */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              {i < step
                ? <Ionicons name="checkmark" size={12} color="white" />
                : <Text style={[styles.stepNum, i <= step && { color: 'white' }]}>{i + 1}</Text>
              }
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 100 }}>
        {/* Step 0: Type */}
        {step === 0 && (
          <View style={{ gap: 12 }}>
            <Text style={styles.stepTitle}>Select Group Type</Text>
            {GROUP_TYPES.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.typeCard, type === g.key && styles.typeCardActive, shadow.soft]}
                onPress={() => setType(g.key)}
              >
                <Text style={styles.typeEmoji}>{g.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, type === g.key && { color: colors.primary }]}>{g.label}</Text>
                  <Text style={styles.typeDesc}>{g.desc}</Text>
                </View>
                {type === g.key && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <View style={{ gap: 14 }}>
            <Text style={styles.stepTitle}>Group Details</Text>
            <View>
              <Text style={styles.fieldLabel}>Group Name *</Text>
              <TextInput style={styles.input} value={groupName} onChangeText={setGroupName} placeholder="e.g. Sharma Family, ABC NGO" placeholderTextColor={colors.textSecondary} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Contact Phone *</Text>
              <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="Group leader's phone" keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Special Notes</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Dietary requirements, accessibility needs, etc." multiline placeholderTextColor={colors.textSecondary} />
            </View>
          </View>
        )}

        {/* Step 2: Passengers */}
        {step === 2 && (
          <View style={{ gap: 14 }}>
            <View style={styles.passengerHeader}>
              <Text style={styles.stepTitle}>Passengers ({passengers.length})</Text>
              <TouchableOpacity style={styles.addPassBtn} onPress={addPassenger}>
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.addPassText}>Add</Text>
              </TouchableOpacity>
            </View>
            {passengers.map((p, i) => (
              <View key={i} style={[styles.passengerCard, shadow.soft]}>
                <View style={styles.passengerCardHeader}>
                  <Text style={styles.passengerNum}>Passenger {i + 1}{i === 0 ? ' (Lead)' : ''}</Text>
                  {i > 0 && (
                    <TouchableOpacity onPress={() => removePassenger(i)} style={styles.removeBtn}>
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput style={styles.input} value={p.name} onChangeText={v => updatePassenger(i, 'name', v)} placeholder="Full Name *" placeholderTextColor={colors.textSecondary} />
                <View style={styles.row2}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={p.age} onChangeText={v => updatePassenger(i, 'age', v)} placeholder="Age" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
                  <View style={styles.genderRow}>
                    {['male', 'female', 'other'].map(g => (
                      <TouchableOpacity key={g} style={[styles.genderBtn, p.gender === g && styles.genderBtnActive]} onPress={() => updatePassenger(i, 'gender', g)}>
                        <Text style={[styles.genderText, p.gender === g && styles.genderTextActive]}>{g[0].toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput style={styles.input} value={p.phone} onChangeText={v => updatePassenger(i, 'phone', v)} placeholder="Phone (optional)" keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
              </View>
            ))}
          </View>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <View style={{ gap: 14 }}>
            <Text style={styles.stepTitle}>Review Booking</Text>
            {tour && (
              <View style={[styles.reviewCard, shadow.soft]}>
                <Text style={styles.reviewLabel}>Tour</Text>
                <Text style={styles.reviewValue}>{tour.title}</Text>
                <Text style={styles.reviewSub}>{tour.source} → {tour.destination}</Text>
              </View>
            )}
            <View style={[styles.reviewCard, shadow.soft]}>
              <Text style={styles.reviewLabel}>Group</Text>
              <Text style={styles.reviewValue}>{groupName}</Text>
              <Text style={styles.reviewSub}>{GROUP_TYPES.find(g => g.key === type)?.label} • {passengers.length} passengers</Text>
              <Text style={styles.reviewSub}>Contact: {contactPhone}</Text>
            </View>
            <View style={[styles.reviewCard, shadow.soft]}>
              <Text style={styles.reviewLabel}>Passengers</Text>
              {passengers.map((p, i) => (
                <Text key={i} style={styles.passengerLine}>• {p.name}, {p.age}y ({p.gender})</Text>
              ))}
            </View>
            {tour?.price ? (
              <View style={[styles.priceCard, shadow.card]}>
                <Text style={styles.priceLabel}>Total Amount</Text>
                <Text style={styles.priceValue}>₹{totalPrice.toLocaleString()}</Text>
                <Text style={styles.priceSub}>₹{tour.price} × {passengers.length} passengers</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <View style={{ gap: 14, alignItems: 'center', paddingVertical: 20 }}>
            <View style={styles.confirmIcon}><Ionicons name="people" size={40} color={colors.primary} /></View>
            <Text style={styles.confirmTitle}>Ready to Submit</Text>
            <Text style={styles.confirmSub}>Your group booking request will be sent to the operator for confirmation. Payment will be collected after confirmation.</Text>
            {tour?.price ? (
              <View style={[styles.priceCard, shadow.card, { width: '100%' }]}>
                <Text style={styles.priceLabel}>Total: ₹{totalPrice.toLocaleString()}</Text>
                <Text style={styles.priceSub}>{passengers.length} passenger{passengers.length > 1 ? 's' : ''}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showSuccessConfirm}
        title="Booking Submitted!"
        message={'Your group booking request has been submitted. Booking ID: ' + successBookingId}
        confirmText="View Bookings"
        cancelText="Home"
        onConfirm={() => { setShowSuccessConfirm(false); router.replace('/booking'); }}
        onCancel={() => { setShowSuccessConfirm(false); router.replace('/(tabs)'); }}
        onDismiss={() => { setShowSuccessConfirm(false); router.replace('/(tabs)'); }}
        destructive={false}
      />

      {/* Bottom navigation */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backNavBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            <Text style={styles.backNavText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled, step === 0 && { flex: 1 }]}
            onPress={() => setStep(s => s + 1)}
            disabled={!canProceed()}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="white" size="small" />
              : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                  <Text style={styles.submitBtnText}>Submit Group Booking</Text>
                </>
              )
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },
  header: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Philosopher_700Bold', fontSize: 20, color: 'white' },
  subtitle: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#D95D39' },
  stepNum: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#6B7280' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  stepLineActive: { backgroundColor: '#D95D39' },
  stepTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 20, color: '#1A1A1A' },
  typeCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: '#E5E7EB' },
  typeCardActive: { borderColor: '#D95D39', backgroundColor: '#FEE8E2' },
  typeEmoji: { fontSize: 32 },
  typeLabel: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#1A1A1A' },
  typeDesc: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#6B7280', marginTop: 2 },
  fieldLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#6B7280', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E5E7EB' },
  passengerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPassBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D95D39', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  addPassText: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: 'white' },
  passengerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 10 },
  passengerCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passengerNum: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#D95D39' },
  removeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  row2: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  genderRow: { flexDirection: 'row', gap: 4 },
  genderBtn: { width: 32, height: 38, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  genderBtnActive: { backgroundColor: '#D95D39', borderColor: '#D95D39' },
  genderText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: '#6B7280' },
  genderTextActive: { color: 'white' },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 4 },
  reviewLabel: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#6B7280' },
  reviewValue: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#1A1A1A' },
  reviewSub: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#6B7280' },
  passengerLine: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#1A1A1A', marginTop: 2 },
  priceCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  priceLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: '#1A1A1A' },
  priceValue: { fontFamily: 'Philosopher_700Bold', fontSize: 32, color: '#D95D39' },
  priceSub: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#6B7280' },
  confirmIcon: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#FEE8E2', alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 24, color: '#1A1A1A' },
  confirmSub: { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  bottomBar: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', gap: 10 },
  backNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F3F4F6' },
  backNavText: { fontFamily: 'Manrope_500Medium', fontSize: 14, color: '#1A1A1A' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D95D39', borderRadius: 12, paddingVertical: 14 },
  nextBtnDisabled: { backgroundColor: '#E5E7EB' },
  nextBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: 'white' },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 14 },
  submitBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: 'white' },
});
