import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { AdminShell } from "../../../lib/AdminScreen";
import { useColors } from "../../../lib/ThemeContext";
import { fonts, radius } from "../../../lib/theme";
import { marketing as mktApi } from "../../../lib/api";

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "scheduled", label: "Scheduled" },
  { id: "publishing", label: "Publishing" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
];

const STATUS_COLORS = {
  draft: "#9B8F85",
  scheduled: "#D97706",
  publishing: "#0088CC",
  published: "#16A34A",
  failed: "#DC2626",
};

const STATUS_ICONS = {
  draft: "document-outline",
  scheduled: "time-outline",
  publishing: "sync-outline",
  published: "checkmark-circle-outline",
  failed: "close-circle-outline",
};

const PLATFORM_CONFIG = {
  instagram: { color: "#E1306C", icon: "logo-instagram", label: "Instagram" },
  facebook:  { color: "#1877F2", icon: "logo-facebook",  label: "Facebook" },
  whatsapp:  { color: "#25D366", icon: "logo-whatsapp",  label: "WhatsApp" },
  telegram:  { color: "#0088CC", icon: "paper-plane",    label: "Telegram" },
  twitter:   { color: "#1DA1F2", icon: "logo-twitter",   label: "Twitter" },
  linkedin:  { color: "#0A66C2", icon: "logo-linkedin",  label: "LinkedIn" },
};

const AD_LENGTHS = ["short", "medium", "long"];

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Post Card ─────────────────────────────────────────────────────────────────

function getAdPreview(generatedAds, selectedPlatforms = []) {
  if (!generatedAds) return null;
  // unwrap if stored as { ads: {...} }
  const src = generatedAds.ads && typeof generatedAds.ads === "object" ? generatedAds.ads : generatedAds;
  // Only look at platforms actually selected for this post
  const order = selectedPlatforms.length ? selectedPlatforms : Object.keys(src);
  for (const p of order) {
    const copy = src[p]?.short || src[p]?.medium || src[p]?.long;
    if (copy && typeof copy === "string" && copy.trim()) return { platform: p, text: copy.trim() };
  }
  return null;
}

function PostCard({ item, colors, s, onPublish, onEdit, onDelete, publishingId }) {
  const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;
  const statusIcon  = STATUS_ICONS[item.status]  || "ellipse-outline";
  const isPublishing = publishingId === (item._id || item.id);
  const canPublish   = ["draft", "scheduled", "failed"].includes(item.status);
  const platforms    = item.platforms || [];
  const adPreview    = getAdPreview(item.generatedAds, platforms);
  const cfg          = adPreview ? PLATFORM_CONFIG[adPreview.platform] : null;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {item.title || "Untitled Post"}
        </Text>
        <View style={[s.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "44" }]}>
          <Ionicons name={statusIcon} size={12} color={statusColor} />
          <Text style={[s.statusBadgeText, { color: statusColor }]}>
            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "—"}
          </Text>
        </View>
      </View>

      {/* Ad copy preview — caption (user-saved) takes priority */}
      {item.caption ? (
        <View style={s.adPreviewBox}>
          <View style={s.adPreviewPlatform}>
            <Ionicons name="create-outline" size={11} color={colors.primary} />
            <Text style={[s.adPreviewPlatformText, { color: colors.primary }]}>Saved Caption</Text>
          </View>
          <Text style={s.adPreviewText} numberOfLines={3}>{item.caption}</Text>
        </View>
      ) : adPreview ? (
        <View style={s.adPreviewBox}>
          {cfg && (
            <View style={s.adPreviewPlatform}>
              <Ionicons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[s.adPreviewPlatformText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          )}
          <Text style={s.adPreviewText} numberOfLines={3}>{adPreview.text}</Text>
        </View>
      ) : (
        <View style={s.noAdBox}>
          <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
          <Text style={s.noAdText}>No ad copy — tap Edit to add content</Text>
        </View>
      )}

      {/* Platform icons */}
      {platforms.length > 0 && (
        <View style={s.platformRow}>
          {platforms.map((pid) => {
            const pcfg = PLATFORM_CONFIG[pid];
            if (!pcfg) return null;
            return (
              <View key={pid} style={[s.platformDot, { backgroundColor: pcfg.color + "22" }]}>
                <Ionicons name={pcfg.icon} size={14} color={pcfg.color} />
              </View>
            );
          })}
        </View>
      )}

      {/* Timing */}
      <View style={s.timingRow}>
        {item.scheduledAt && item.status === "scheduled" && (
          <View style={s.timingItem}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={s.timingText}>Scheduled: {fmtDate(item.scheduledAt)}</Text>
          </View>
        )}
        {item.createdAt && (
          <View style={s.timingItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={s.timingText}>Created: {fmtDate(item.createdAt)}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        {canPublish && (
          <TouchableOpacity
            style={[s.actionBtn, s.actionBtnPrimary, isPublishing && { opacity: 0.6 }]}
            onPress={() => onPublish(item._id || item.id)}
            disabled={isPublishing}
          >
            {isPublishing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={13} color="#fff" />}
            <Text style={s.actionBtnPrimaryText}>{isPublishing ? "Publishing…" : "Publish Now"}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
          <Text style={s.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={13} color="#DC2626" />
          <Text style={s.actionBtnDangerText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Edit / View Modal ─────────────────────────────────────────────────────────

// Find which platform+length matches the saved caption text
function findSavedSelection(caption, ads) {
  if (!caption || !ads) return null;
  const trimmed = caption.trim();
  for (const platform of Object.keys(ads)) {
    for (const len of ["short", "medium", "long"]) {
      const val = ads[platform]?.[len];
      if (val && typeof val === "string" && val.trim() === trimmed) {
        return { platform, length: len };
      }
    }
  }
  return null;
}

function EditModal({ post, colors, s, onClose, onSave }) {
  const [title, setTitle] = useState(post?.title || "");

  const [editedAds, setEditedAds] = useState(() => {
    const raw = post?.generatedAds || {};
    const src = raw.ads && typeof raw.ads === "object" ? raw.ads : raw;
    const copy = {};
    for (const p of Object.keys(src)) {
      if (src[p] && typeof src[p] === "object" && !Array.isArray(src[p])) {
        copy[p] = { ...src[p] };
      }
    }
    return copy;
  });

  const adPlatforms = Object.keys(editedAds);

  // Restore last saved platform+length by matching caption text
  const savedSel = useMemo(() => findSavedSelection(post?.caption, editedAds), []);
  const defaultPlatform = savedSel?.platform || post?.platforms?.[0] || adPlatforms[0] || "telegram";
  const defaultLength   = savedSel?.length  || (() => {
    const ads = editedAds[defaultPlatform] || {};
    if (ads.short) return "short";
    if (ads.medium) return "medium";
    return "long";
  })();

  const [activePlatform, setActivePlatform] = useState(defaultPlatform);
  const [activeLength, setActiveLength]     = useState(defaultLength);

  // caption = currently selected copy text (restore from post)
  const [caption, setCaption] = useState(post?.caption || editedAds[defaultPlatform]?.[defaultLength] || "");

  // hashtags — editable with removed history
  const [hashtags, setHashtags]             = useState(post?.hashtags || []);
  const [removedHashtags, setRemovedHashtags] = useState([]);
  const [hashtagInput, setHashtagInput]     = useState("");

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const platformCfg = PLATFORM_CONFIG[activePlatform] || {};
  const currentText = editedAds[activePlatform]?.[activeLength] || "";

  // When platform or length changes, auto-update caption
  const handleSelectCopy = (platform, length) => {
    setActivePlatform(platform);
    setActiveLength(length);
    const text = editedAds[platform]?.[length] || "";
    if (text) setCaption(text);
  };

  const handleCopy = () => {
    Clipboard.setString(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#*/, "#");
    if (tag.length > 1 && !hashtags.includes(tag)) {
      setHashtags((prev) => [...prev, tag]);
      // remove from removed list if re-adding manually
      setRemovedHashtags((prev) => prev.filter((h) => h !== tag));
    }
    setHashtagInput("");
  };

  const removeHashtag = (tag) => {
    setHashtags((prev) => prev.filter((h) => h !== tag));
    setRemovedHashtags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  };

  const restoreHashtag = (tag) => {
    setRemovedHashtags((prev) => prev.filter((h) => h !== tag));
    setHashtags((prev) => [...prev, tag]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { title, generatedAds: editedAds, caption, hashtags };
      await onSave(post._id || post.id, updates);
      onClose();
    } catch (e) {
      console.warn("save error", e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetTitleRow}>
            <Text style={s.sheetHeading}>Edit Post</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Title */}
            <Text style={s.fieldLabel}>POST TITLE</Text>
            <TextInput
              style={s.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Post title"
              placeholderTextColor="#9CA3AF"
            />

            {adPlatforms.length > 0 ? (
              <>
                {/* Platform tabs */}
                <Text style={s.fieldLabel}>SELECT PLATFORM & LENGTH</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                    {adPlatforms.map((pid) => {
                      const cfg = PLATFORM_CONFIG[pid] || {};
                      const active = activePlatform === pid;
                      return (
                        <TouchableOpacity
                          key={pid}
                          style={[s.platformTab, active && { backgroundColor: (cfg.color || "#D95D39") + "22", borderColor: cfg.color || "#D95D39" }]}
                          onPress={() => handleSelectCopy(pid, activeLength)}
                        >
                          <Ionicons name={cfg.icon || "globe-outline"} size={14} color={active ? cfg.color : "#6B7280"} />
                          <Text style={[s.platformTabText, active && { color: cfg.color || "#D95D39" }]}>{cfg.label || pid}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Length tabs */}
                <View style={s.lengthTabs}>
                  {AD_LENGTHS.map((len) => (
                    <TouchableOpacity
                      key={len}
                      style={[s.lengthTab, activeLength === len && s.lengthTabActive]}
                      onPress={() => handleSelectCopy(activePlatform, len)}
                    >
                      <Text style={[s.lengthTabText, activeLength === len && s.lengthTabTextActive]}>
                        {len.charAt(0).toUpperCase() + len.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Ad text header */}
                <View style={s.adHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={platformCfg.icon || "globe-outline"} size={14} color={platformCfg.color || "#D95D39"} />
                    <Text style={[s.adPlatformLabel, { color: platformCfg.color || "#D95D39" }]}>{platformCfg.label || activePlatform}</Text>
                  </View>
                  <TouchableOpacity onPress={handleCopy} style={s.copyBtn}>
                    <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={copied ? "#16A34A" : "#6B7280"} />
                    <Text style={[s.copyBtnText, copied && { color: "#16A34A" }]}>{copied ? "Copied!" : "Copy"}</Text>
                  </TouchableOpacity>
                </View>

                {/* Editable ad text */}
                <TextInput
                  style={s.adTextInput}
                  value={editedAds[activePlatform]?.[activeLength] || ""}
                  onChangeText={(txt) => {
                    setEditedAds((prev) => ({ ...prev, [activePlatform]: { ...prev[activePlatform], [activeLength]: txt } }));
                    setCaption(txt);
                  }}
                  multiline
                  placeholder="AI generated ad copy…"
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
                <Text style={s.charCount}>{currentText.length} characters · will be sent when publishing</Text>
              </>
            ) : (
              <View style={s.noAdsBox}>
                <Ionicons name="information-circle-outline" size={32} color="#9CA3AF" />
                <Text style={s.noAdsText}>No AI-generated ad copy for this post.</Text>
                <Text style={s.noAdsSubText}>Use the AI Generator to create content.</Text>
              </View>
            )}

            {/* Caption (what actually gets published) */}
            <Text style={[s.fieldLabel, { marginTop: 14 }]}>CAPTION (PUBLISHED TEXT)</Text>
            <TextInput
              style={[s.adTextInput, { minHeight: 80 }]}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="This text will be sent to all platforms when publishing…"
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
            <Text style={s.charCount}>Tap any ad copy above to auto-fill this</Text>

            {/* Hashtags */}
            <Text style={[s.fieldLabel, { marginTop: 14 }]}>HASHTAGS</Text>
            <View style={s.hashtagInputRow}>
              <TextInput
                style={s.hashtagInput}
                value={hashtagInput}
                onChangeText={setHashtagInput}
                placeholder="#addhashtag"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={addHashtag}
                returnKeyType="done"
              />
              <TouchableOpacity style={s.hashtagAddBtn} onPress={addHashtag}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Active hashtags */}
            <View style={s.hashtagsRow}>
              {hashtags.map((tag, i) => (
                <TouchableOpacity key={i} style={s.hashtagChip} onPress={() => removeHashtag(tag)}>
                  <Text style={s.hashtagText}>{tag}</Text>
                  <Ionicons name="close-circle" size={13} color="#D95D39" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ))}
              {hashtags.length === 0 && (
                <Text style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>No hashtags — type above and press enter</Text>
              )}
            </View>

            {/* Removed hashtags — tap to restore */}
            {removedHashtags.length > 0 && (
              <>
                <Text style={[s.fieldLabel, { marginTop: 12, color: "#9CA3AF" }]}>REMOVED — TAP TO RESTORE</Text>
                <View style={s.hashtagsRow}>
                  {removedHashtags.map((tag, i) => (
                    <TouchableOpacity key={i} style={s.hashtagRemovedChip} onPress={() => restoreHashtag(tag)}>
                      <Ionicons name="add-circle-outline" size={13} color="#9CA3AF" style={{ marginRight: 3 }} />
                      <Text style={s.hashtagRemovedText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Save button */}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="checkmark" size={16} color="#fff" />}
            <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({ post, colors, s, onClose, onConfirm, deleting }) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.deleteOverlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={s.deleteSheet}>
          <View style={[s.deleteIconBox, { backgroundColor: "#DC262615" }]}>
            <Ionicons name="trash-outline" size={28} color="#DC2626" />
          </View>
          <Text style={s.deleteTitle}>Delete Post?</Text>
          <Text style={s.deleteBody}>
            "{post?.title || "This post"}" will be permanently deleted. This cannot be undone.
          </Text>
          <View style={s.deleteActions}>
            <TouchableOpacity style={s.deleteCancelBtn} onPress={onClose}>
              <Text style={s.deleteCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.deleteConfirmBtn, deleting && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="trash-outline" size={15} color="#fff" />}
              <Text style={s.deleteConfirmText}>{deleting ? "Deleting…" : "Delete"}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function CampaignsScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [publishingId, setPublishingId] = useState(null);
  const [editPost, setEditPost]         = useState(null);
  const [deletePost, setDeletePost]     = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Fetch
  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await mktApi.getPosts();
      const arr = Array.isArray(res) ? res : res?.data || res?.posts || [];
      setPosts(arr);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPosts(); }, [fetchPosts]));

  const filteredPosts = useMemo(() => {
    if (statusFilter === "all") return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  // Publish
  const handlePublish = async (id) => {
    setPublishingId(id);
    try {
      await mktApi.publishPost(id);
      fetchPosts();
    } catch (e) {
      console.warn("publish error", e?.message);
    } finally {
      setPublishingId(null);
    }
  };

  // Save edits — use server response so card reflects saved data
  const handleSave = async (id, updates) => {
    try {
      const res = await mktApi.updatePost(id, updates);
      const saved = res?.data || res || updates;
      setPosts((prev) =>
        prev.map((p) => (p._id || p.id) === id ? { ...p, ...saved } : p)
      );
    } catch (e) {
      console.warn("update error", e?.message);
      // still update locally so UI isn't stale
      setPosts((prev) =>
        prev.map((p) => (p._id || p.id) === id ? { ...p, ...updates } : p)
      );
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deletePost) return;
    setDeleting(true);
    try {
      await mktApi.deletePost(deletePost._id || deletePost.id);
      setPosts((prev) => prev.filter((p) => (p._id || p.id) !== (deletePost._id || deletePost.id)));
      setDeletePost(null);
    } catch (e) {
      console.warn("delete error", e?.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderEmpty = () => (
    <View style={s.emptyState}>
      <View style={s.emptyIcon}>
        <Ionicons name="megaphone-outline" size={40} color={colors.textSecondary} />
      </View>
      <Text style={s.emptyTitle}>No Posts Yet</Text>
      <Text style={s.emptySubtitle}>
        {statusFilter !== "all"
          ? `No ${statusFilter} posts found.`
          : "Create your first marketing post with the AI Generator."}
      </Text>
      {statusFilter === "all" && (
        <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/admin/marketing/ai-generator")}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.emptyBtnText}>Create First Post</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <AdminShell
      title="Campaign Manager"
      subtitle="Manage your marketing posts"
      rightIcon="add-circle-outline"
      onRightPress={() => router.push("/admin/marketing/ai-generator")}
    >
      {/* Filter Bar */}
      <View style={s.filterBarWrapper}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.filterBar}
          renderItem={({ item }) => {
            const active = statusFilter === item.id;
            const col = item.id !== "all" ? STATUS_COLORS[item.id] : colors.primary;
            return (
              <TouchableOpacity
                style={[s.filterChip, active && { backgroundColor: col + "20", borderColor: col + "66" }]}
                onPress={() => setStatusFilter(item.id)}
              >
                <Text style={[s.filterChipText, active && { color: col }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {!loading && (
        <Text style={s.countLabel}>
          {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"}
        </Text>
      )}

      {loading ? (
        <View style={s.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loadingText}>Loading campaigns…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={({ item }) => (
            <PostCard
              item={item}
              colors={colors}
              s={s}
              onPublish={handlePublish}
              onEdit={setEditPost}
              onDelete={setDeletePost}
              publishingId={publishingId}
            />
          )}
          contentContainerStyle={[s.listContent, filteredPosts.length === 0 && { flex: 1 }]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPosts(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => router.push("/admin/marketing/ai-generator")} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Edit/View Modal */}
      {editPost && (
        <EditModal
          post={editPost}
          colors={colors}
          s={s}
          onClose={() => setEditPost(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletePost && (
        <DeleteModal
          post={deletePost}
          colors={colors}
          s={s}
          onClose={() => setDeletePost(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </AdminShell>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    filterBarWrapper: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    filterBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill,
      borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.elevated, marginRight: 4,
    },
    filterChipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },

    countLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },

    loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

    listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },

    // Card
    card: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 },
    cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, flex: 1, lineHeight: 20 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
    statusBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11 },

    // Ad copy preview
    adPreviewBox: {
      backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1,
      borderColor: colors.borderSubtle, padding: 10, marginBottom: 10,
    },
    adPreviewPlatform: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    adPreviewPlatformText: { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    adPreviewText: { fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
    noAdBox: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, marginBottom: 6 },
    noAdText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, fontStyle: "italic" },

    platformRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
    platformDot: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },

    timingRow: { gap: 3, marginBottom: 8 },
    timingItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    timingText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

    cardActions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 10, marginTop: 4 },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
    actionBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
    actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    actionBtnPrimaryText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#fff" },
    actionBtnDanger: { borderColor: "#DC262633", backgroundColor: "#DC262610" },
    actionBtnDangerText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#DC2626" },

    // Edit overlay — bottom sheet
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },

    // Edit sheet — slides up from bottom
    sheet: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 36, maxHeight: "88%",
    },
    sheetHandle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    sheetHeading: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },

    fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#6B7280", letterSpacing: 1, marginBottom: 6, marginTop: 4 },
    titleInput: {
      backgroundColor: "#F9FAFB", borderRadius: radius.sm, borderWidth: 1,
      borderColor: "#E5E7EB", padding: 10, fontFamily: fonts.body,
      fontSize: 14, color: "#111827", marginBottom: 14,
    },

    platformTab: {
      flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: radius.pill, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F3F4F6",
    },
    platformTabText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#6B7280" },

    lengthTabs: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: radius.sm, padding: 3, marginBottom: 10 },
    lengthTab: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: radius.sm - 2 },
    lengthTabActive: { backgroundColor: colors.primary },
    lengthTabText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#6B7280" },
    lengthTabTextActive: { color: "#fff" },

    adHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    adPlatformLabel: { fontFamily: fonts.bodyBold, fontSize: 12 },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: "#E5E7EB" },
    copyBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#6B7280" },

    adTextInput: {
      backgroundColor: "#F9FAFB", borderRadius: radius.sm, borderWidth: 1,
      borderColor: "#E5E7EB", padding: 12, fontFamily: fonts.body,
      fontSize: 13, color: "#111827", minHeight: 140, lineHeight: 20,
    },
    charCount: { fontFamily: fonts.body, fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4, marginBottom: 8 },

    noAdsBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
    noAdsText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#374151", textAlign: "center" },
    noAdsSubText: { fontFamily: fonts.body, fontSize: 12, color: "#6B7280", textAlign: "center" },

    hashtagInputRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    hashtagInput: {
      flex: 1, backgroundColor: "#F9FAFB", borderRadius: radius.sm, borderWidth: 1,
      borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 8,
      fontFamily: fonts.body, fontSize: 13, color: "#111827",
    },
    hashtagAddBtn: {
      width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    hashtagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
    hashtagChip: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: "#FEF3EE", borderRadius: radius.pill,
      paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#FDDDD0",
    },
    hashtagText: { fontFamily: fonts.body, fontSize: 12, color: colors.primary },
    hashtagRemovedChip: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: "#F3F4F6", borderRadius: radius.pill,
      paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#E5E7EB",
    },
    hashtagRemovedText: { fontFamily: fonts.body, fontSize: 12, color: "#9CA3AF" },

    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, marginTop: 12 },
    saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },

    // Delete modal — centered card
    deleteOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
    deleteSheet: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 28, paddingBottom: 28, alignItems: "center", width: "100%",
    },
    deleteIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    deleteTitle: { fontFamily: fonts.heading, fontSize: 20, color: "#111827", marginBottom: 8, textAlign: "center" },
    deleteBody: { fontFamily: fonts.body, fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 24 },
    deleteActions: { flexDirection: "row", gap: 12, width: "100%" },
    deleteCancelBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
    deleteCancelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#374151" },
    deleteConfirmBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: radius.pill, backgroundColor: "#DC2626" },
    deleteConfirmText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },

    // Empty
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 1, borderColor: colors.borderSubtle },
    emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginBottom: 8 },
    emptySubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
    emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
    emptyBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: "#fff" },

    // FAB
    fab: { position: "absolute", bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", elevation: 8 },
  });
}
