import React, { useState, useMemo, useCallback, useEffect, useRef, Platform } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  Clipboard,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { useColors } from '../../../lib/ThemeContext';
import { fonts, radius } from '../../../lib/theme';
import { marketing as mktApi } from '../../../lib/api';

// ─── Platform Config ───────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { id: 'telegram', label: 'Telegram', icon: 'paper-plane', color: '#0088CC' },
  { id: 'twitter', label: 'Twitter / X', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
];

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Auto', value: 'auto' },
];
const FORMATS = [
  { id: 'square', label: 'Square (1:1)', ratio: 1 },
  { id: 'story', label: 'Story (9:16)', ratio: 9 / 16 },
  { id: 'banner', label: 'Banner (16:9)', ratio: 16 / 9 },
];

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function PlatformCard({ platform, adData, colors, s }) {
  const [copyLength, setCopyLength] = useState('short');
  const [editedText, setEditedText] = useState('');
  const [included, setIncluded] = useState(true);

  useEffect(() => {
    if (adData && adData[copyLength]) {
      setEditedText(adData[copyLength]);
    }
  }, [adData, copyLength]);

  const handleCopy = () => {
    Clipboard.setString(editedText);
    Alert.alert('Copied!', `${platform.label} copy copied to clipboard.`);
  };

  if (!adData) return null;

  return (
    <View style={s.platformCard}>
      <View style={s.platformCardHeader}>
        <View style={[s.platformIconBg, { backgroundColor: platform.color + '22' }]}>
          <Ionicons name={platform.icon} size={20} color={platform.color} />
        </View>
        <Text style={s.platformCardTitle}>{platform.label}</Text>
        <View style={{ flex: 1 }} />
        <Text style={s.includeLabel}>Include</Text>
        <Switch
          value={included}
          onValueChange={setIncluded}
          trackColor={{ false: colors.borderSubtle, true: colors.primary + '66' }}
          thumbColor={included ? colors.primary : colors.textSecondary}
        />
      </View>

      <View style={s.lengthTabs}>
        {['short', 'medium', 'long'].map((len) => (
          <TouchableOpacity
            key={len}
            style={[s.lengthTab, copyLength === len && s.lengthTabActive]}
            onPress={() => setCopyLength(len)}
          >
            <Text style={[s.lengthTabText, copyLength === len && s.lengthTabTextActive]}>
              {len.charAt(0).toUpperCase() + len.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={s.copyTextArea}
        value={editedText}
        onChangeText={setEditedText}
        multiline
        numberOfLines={4}
        placeholderTextColor={colors.textSecondary}
        placeholder="Generated copy will appear here..."
      />

      <TouchableOpacity style={s.copyBtn} onPress={handleCopy}>
        <Ionicons name="copy-outline" size={16} color={colors.primary} />
        <Text style={s.copyBtnText}>Copy</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function AIGeneratorScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Auto-switch to image tab if ?tab=image
  const [activeTab, setActiveTab] = useState(params.tab === 'image' ? 1 : 0);

  // ── Ad Copy State ──
  const [tours, setTours] = useState([]);
  const [toursLoading, setToursLoading] = useState(false);
  const [tourModalVisible, setTourModalVisible] = useState(false);
  const [tourSearch, setTourSearch] = useState('');
  const [selectedTour, setSelectedTour] = useState(null);
  const [language, setLanguage] = useState('en');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'facebook', 'whatsapp']);
  const [generatedAds, setGeneratedAds] = useState(null);
  const [hashtags, setHashtags] = useState([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduleMode, setScheduleMode] = useState('now'); // 'now' | 'later'
  const [scheduleDateTime, setScheduleDateTime] = useState(new Date(Date.now() + 3600000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // ── Image Gen State ──
  const [imgSelectedTour, setImgSelectedTour] = useState(null);
  const [imgTourModalVisible, setImgTourModalVisible] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('square');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // ─── Fetch Tours ─────────────────────────────────────────────────────────────
  const fetchTours = useCallback(async () => {
    setToursLoading(true);
    try {
      const res = await mktApi.getTours();
      setTours(res?.tours || res?.data || res || []);
    } catch (e) {
      console.warn('fetchTours error', e);
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const filteredTours = useMemo(() => {
    if (!tourSearch.trim()) return tours;
    const q = tourSearch.toLowerCase();
    return tours.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.destination?.toLowerCase().includes(q)
    );
  }, [tours, tourSearch]);

  // ─── Platform Toggle ──────────────────────────────────────────────────────────
  const togglePlatform = (id) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // ─── Generate Ads ─────────────────────────────────────────────────────────────
  const handleGenerateAds = async () => {
    if (!selectedTour) {
      Alert.alert('Select Tour', 'Please select a tour before generating ads.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      Alert.alert('Select Platforms', 'Please select at least one platform.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await mktApi.generateAds({
        tourId: selectedTour._id || selectedTour.id,
        language,
        platforms: selectedPlatforms,
      });
      const payload = res?.data || res || {};
      const adsObj = payload.ads || (payload.instagram || payload.telegram ? payload : {});
      setGeneratedAds(adsObj);
      setHashtags(payload.hashtags || res?.hashtags || []);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to generate ads. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Hashtag Management ───────────────────────────────────────────────────────
  const addHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags((prev) => [...prev, tag]);
    }
    setNewHashtag('');
  };

  const removeHashtag = (tag) => {
    setHashtags((prev) => prev.filter((h) => h !== tag));
  };

  // ─── Create Post ──────────────────────────────────────────────────────────────
  const handleCreatePost = async () => {
    if (!selectedTour || !generatedAds) {
      Alert.alert('Incomplete', 'Please generate ads first.');
      return;
    }
    setIsPosting(true);
    try {
      const langMap = { en: 'en', hi: 'hi', auto: 'auto', English: 'en', Hindi: 'hi', Auto: 'auto' };
      const postData = {
        title: selectedTour.title,
        tourId: selectedTour._id || selectedTour.id,
        platforms: selectedPlatforms,
        generatedAds,
        hashtags,
        imageUrl,
        language: langMap[language] || 'en',
        scheduleType: scheduleMode === 'later' ? 'scheduled' : 'now',
        scheduledAt: scheduleMode === 'later' ? scheduleDateTime.toISOString() : null,
        status: scheduleMode === 'later' ? 'scheduled' : 'draft',
      };
      const res = await mktApi.createPost(postData);
      const postId = res?._id || res?.id;
      if (scheduleMode === 'now' && postId) {
        await mktApi.publishPost(postId);
        Alert.alert('Published!', 'Your post has been published to selected platforms.');
      } else {
        Alert.alert(
          'Post Created',
          scheduleMode === 'later'
            ? 'Post scheduled successfully!'
            : 'Post saved as draft.'
        );
      }
      router.push('/admin/marketing/campaigns');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to create post.');
    } finally {
      setIsPosting(false);
    }
  };

  // ─── Generate Image ───────────────────────────────────────────────────────────
  const handleGenerateImage = async () => {
    if (!imgSelectedTour) {
      Alert.alert('Select Tour', 'Please select a tour first.');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const res = await mktApi.generateImage({
        tourId: imgSelectedTour._id || imgSelectedTour.id,
        format: selectedFormat,
      });
      setGeneratedImage(res?.imageUrl || res?.url || imgSelectedTour.coverPhoto || null);
    } catch (e) {
      // Fallback to cover photo
      setGeneratedImage(imgSelectedTour.coverPhoto || null);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUseImage = () => {
    if (generatedImage) {
      setImageUrl(generatedImage);
      setActiveTab(0);
      Alert.alert('Image Set', 'Image URL has been set for your post.');
    }
  };

  // ─── Tour Selector Modal ──────────────────────────────────────────────────────
  const TourModal = ({ visible, onClose, onSelect }) => (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Tour</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.modalSearch}
            placeholder="Search tours..."
            placeholderTextColor={colors.textSecondary}
            value={tourSearch}
            onChangeText={setTourSearch}
          />
          {toursLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={filteredTours}
              keyExtractor={(item) => String(item._id || item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.tourItem}
                  onPress={() => {
                    onSelect(item);
                    setTourSearch('');
                    onClose();
                  }}
                >
                  <View>
                    <Text style={s.tourItemTitle}>{item.title}</Text>
                    {item.destination && (
                      <Text style={s.tourItemDest}>{item.destination}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={s.emptyText}>No tours found</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // ─── Ad Copy Tab ──────────────────────────────────────────────────────────────
  const renderAdCopyTab = () => (
    <ScrollView style={s.tabContent} showsVerticalScrollIndicator={false}>
      {/* Tour Selector */}
      <Text style={s.sectionLabel}>Tour</Text>
      <TouchableOpacity
        style={s.selectorBtn}
        onPress={() => setTourModalVisible(true)}
      >
        <Ionicons name="map-outline" size={18} color={colors.textSecondary} />
        <Text style={[s.selectorBtnText, selectedTour && s.selectorBtnTextSelected]}>
          {selectedTour ? selectedTour.title : 'Select Tour...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Language */}
      <Text style={s.sectionLabel}>Language</Text>
      <View style={s.chipRow}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.value}
            style={[s.chip, language === lang.value && s.chipActive]}
            onPress={() => setLanguage(lang.value)}
          >
            <Text style={[s.chipText, language === lang.value && s.chipTextActive]}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Platforms */}
      <Text style={s.sectionLabel}>Platforms</Text>
      <View style={s.platformGrid}>
        {PLATFORMS.map((p) => {
          const selected = selectedPlatforms.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[s.platformChip, selected && { borderColor: p.color, backgroundColor: p.color + '15' }]}
              onPress={() => togglePlatform(p.id)}
            >
              <Ionicons name={p.icon} size={16} color={selected ? p.color : colors.textSecondary} />
              <Text style={[s.platformChipText, selected && { color: p.color }]}>{p.label}</Text>
              {selected && <Ionicons name="checkmark-circle" size={14} color={p.color} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[s.primaryBtn, isGenerating && s.primaryBtnDisabled]}
        onPress={handleGenerateAds}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="flash" size={18} color="#fff" />
        )}
        <Text style={s.primaryBtnText}>
          {isGenerating ? 'Generating...' : 'Generate All Platforms'}
        </Text>
      </TouchableOpacity>

      {/* Results */}
      {generatedAds && (
        <>
          <Text style={s.sectionLabel}>Generated Copy</Text>
          {PLATFORMS.filter((p) => selectedPlatforms.includes(p.id)).map((p) => (
            <PlatformCard
              key={p.id}
              platform={p}
              adData={generatedAds[p.id]}
              colors={colors}
              s={s}
            />
          ))}

          {/* Hashtags */}
          <Text style={s.sectionLabel}>Hashtags</Text>
          <View style={s.hashtagRow}>
            {hashtags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={s.hashtagChip}
                onPress={() => removeHashtag(tag)}
              >
                <Text style={s.hashtagText}>#{tag}</Text>
                <Ionicons name="close" size={12} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.addHashtagRow}>
            <TextInput
              style={s.hashtagInput}
              placeholder="Add hashtag..."
              placeholderTextColor={colors.textSecondary}
              value={newHashtag}
              onChangeText={setNewHashtag}
              onSubmitEditing={addHashtag}
            />
            <TouchableOpacity style={s.addHashtagBtn} onPress={addHashtag}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Image URL */}
          <Text style={s.sectionLabel}>Image URL (Optional)</Text>
          <TextInput
            style={s.textInput}
            placeholder="https://..."
            placeholderTextColor={colors.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          {/* Schedule */}
          <Text style={s.sectionLabel}>Schedule</Text>
          <View style={s.radioGroup}>
            {[
              { id: 'now', label: 'Send Now' },
              { id: 'later', label: 'Schedule Later' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={s.radioOption}
                onPress={() => setScheduleMode(opt.id)}
              >
                <View style={[s.radioOuter, scheduleMode === opt.id && s.radioOuterActive]}>
                  {scheduleMode === opt.id && <View style={s.radioInner} />}
                </View>
                <Text style={s.radioLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {scheduleMode === 'later' && (
            <View style={s.scheduleRow}>
              <TouchableOpacity
                style={[s.textInput, { flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14 }}>
                  {scheduleDateTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.textInput, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14 }}>
                  {scheduleDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={scheduleDateTime}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) {
                  const updated = new Date(scheduleDateTime);
                  updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setScheduleDateTime(updated);
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={scheduleDateTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, time) => {
                setShowTimePicker(false);
                if (time) {
                  const updated = new Date(scheduleDateTime);
                  updated.setHours(time.getHours(), time.getMinutes());
                  setScheduleDateTime(updated);
                }
              }}
            />
          )}

          {/* Create Post */}
          <TouchableOpacity
            style={[s.primaryBtn, { marginBottom: 32 }, isPosting && s.primaryBtnDisabled]}
            onPress={handleCreatePost}
            disabled={isPosting}
          >
            {isPosting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
            <Text style={s.primaryBtnText}>
              {isPosting
                ? 'Creating...'
                : scheduleMode === 'later'
                ? 'Schedule Post'
                : 'Create & Publish Post'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  // ─── AI Image Tab ─────────────────────────────────────────────────────────────
  const renderImageTab = () => (
    <ScrollView style={s.tabContent} showsVerticalScrollIndicator={false}>
      {/* Info Box */}
      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={s.infoBoxText}>
          AI image generation requires OPENAI_API_KEY. Without it, the tour cover photo is used.
        </Text>
      </View>

      {/* Tour Selector */}
      <Text style={s.sectionLabel}>Tour</Text>
      <TouchableOpacity
        style={s.selectorBtn}
        onPress={() => setImgTourModalVisible(true)}
      >
        <Ionicons name="map-outline" size={18} color={colors.textSecondary} />
        <Text style={[s.selectorBtnText, imgSelectedTour && s.selectorBtnTextSelected]}>
          {imgSelectedTour ? imgSelectedTour.title : 'Select Tour...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Format Selector */}
      <Text style={s.sectionLabel}>Image Format</Text>
      <View style={s.chipRow}>
        {FORMATS.map((fmt) => (
          <TouchableOpacity
            key={fmt.id}
            style={[s.chip, selectedFormat === fmt.id && s.chipActive]}
            onPress={() => setSelectedFormat(fmt.id)}
          >
            <Text style={[s.chipText, selectedFormat === fmt.id && s.chipTextActive]}>
              {fmt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[s.primaryBtn, isGeneratingImage && s.primaryBtnDisabled]}
        onPress={handleGenerateImage}
        disabled={isGeneratingImage}
      >
        {isGeneratingImage ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="image" size={18} color="#fff" />
        )}
        <Text style={s.primaryBtnText}>
          {isGeneratingImage ? 'Generating...' : 'Generate Image'}
        </Text>
      </TouchableOpacity>

      {/* Preview */}
      {generatedImage && (
        <View style={s.imagePreviewCard}>
          <Text style={s.sectionLabel}>Preview</Text>
          <Image
            source={{ uri: generatedImage }}
            style={[
              s.imagePreview,
              selectedFormat === 'story'
                ? { aspectRatio: 9 / 16 }
                : selectedFormat === 'banner'
                ? { aspectRatio: 16 / 9 }
                : { aspectRatio: 1 },
            ]}
            resizeMode="cover"
          />
          <View style={s.imageActions}>
            <TouchableOpacity style={s.outlineBtn} onPress={handleGenerateImage}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={s.outlineBtnText}>Generate Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryBtnSmall} onPress={handleUseImage}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.primaryBtnSmallText}>Use This Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminShell title="AI Ad Generator" subtitle="Create compelling marketing content">
      {/* Tab Bar */}
      <View style={s.tabBar}>
        {['Ad Copy', 'AI Image'].map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabBtn, activeTab === idx && s.tabBtnActive]}
            onPress={() => setActiveTab(idx)}
          >
            <Ionicons
              name={idx === 0 ? 'document-text-outline' : 'image-outline'}
              size={16}
              color={activeTab === idx ? colors.primary : colors.textSecondary}
            />
            <Text style={[s.tabBtnText, activeTab === idx && s.tabBtnTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 ? renderAdCopyTab() : renderImageTab()}

      {/* Tour Selector Modals */}
      <TourModal
        visible={tourModalVisible}
        onClose={() => setTourModalVisible(false)}
        onSelect={setSelectedTour}
      />
      <TourModal
        visible={imgTourModalVisible}
        onClose={() => setImgTourModalVisible(false)}
        onSelect={setImgSelectedTour}
      />
    </AdminShell>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    // Tab Bar
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.elevated,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: radius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: radius.md,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary + '44',
    },
    tabBtnText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabBtnTextActive: {
      color: colors.primary,
      fontFamily: fonts.bodySemiBold,
    },

    // Tab Content
    tabContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },

    // Section Labels
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 16,
    },

    // Selector Button
    selectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    selectorBtnText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textSecondary,
    },
    selectorBtnTextSelected: {
      color: colors.textPrimary,
      fontFamily: fonts.bodyMedium,
    },

    // Chips
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.elevated,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '18',
    },
    chipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.primary,
    },

    // Platform Grid
    platformGrid: {
      gap: 8,
    },
    platformChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.elevated,
    },
    platformChipText: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textSecondary,
    },

    // Primary Button
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
      marginTop: 20,
    },
    primaryBtnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#fff',
    },

    // Platform Card
    platformCard: {
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: 14,
      marginBottom: 12,
    },
    platformCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    platformIconBg: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    platformCardTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    includeLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },

    // Length Tabs
    lengthTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      padding: 2,
      marginBottom: 10,
    },
    lengthTab: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: radius.sm - 2,
    },
    lengthTabActive: {
      backgroundColor: colors.elevated,
    },
    lengthTabText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    lengthTabTextActive: {
      color: colors.textPrimary,
    },

    // Copy TextArea
    copyTextArea: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.sm,
      padding: 10,
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textPrimary,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 8,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.primary + '66',
    },
    copyBtnText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.primary,
    },

    // Hashtags
    hashtagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    hashtagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '44',
    },
    hashtagText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.primary,
    },
    addHashtagRow: {
      flexDirection: 'row',
      gap: 8,
    },
    hashtagInput: {
      flex: 1,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    addHashtagBtn: {
      width: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.primary + '66',
      borderRadius: radius.md,
    },

    // Text Input
    textInput: {
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },

    // Radio
    radioGroup: {
      gap: 12,
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    radioLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textPrimary,
    },
    scheduleRow: {
      flexDirection: 'row',
      marginTop: 10,
    },

    // Info Box
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.primary + '12',
      borderWidth: 1,
      borderColor: colors.primary + '33',
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 8,
    },
    infoBoxText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Image Preview
    imagePreviewCard: {
      marginTop: 4,
    },
    imagePreview: {
      width: '100%',
      borderRadius: radius.lg,
      backgroundColor: colors.elevated,
    },
    imageActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    outlineBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    outlineBtnText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.primary,
    },
    primaryBtnSmall: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    primaryBtnSmallText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: '#fff',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: 20,
      maxHeight: '75%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.textPrimary,
    },
    modalSearch: {
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    tourItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    tourItemTitle: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textPrimary,
    },
    tourItemDest: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 24,
    },
  });
}
