// Centralized API client for TripKart backend
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://book-yatra-backend.onrender.com/api";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...(options.headers || {}) };
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  try {
    const token = await AsyncStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const msg =
      (typeof data === "object" && data && (data.message || data.error)) ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (e, o) => request(e, { method: "GET", ...(o || {}) }),
  post: (e, body, o) =>
    request(e, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      signal: o?.signal,
      ...(o || {}),
    }),
  put: (e, body, o) =>
    request(e, { method: "PUT", body: JSON.stringify(body), ...(o || {}) }),
  del: (e, o) => request(e, { method: "DELETE", ...(o || {}) }),
};

export const auth = {
  // Yatra Users tab → /login-user (user / guest only)
  login: async (emailOrMobile, password) => {
    const res = await api.post("/users/login-user", {
      emailOrMobile,
      password,
    });
    if (res?.token) {
      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("role", res.role || "user");
      await AsyncStorage.setItem("name", res.name || "");
      if (res.user) {
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        if (res.user._id) await AsyncStorage.setItem("userId", res.user._id);
      }
    }
    return res;
  },
  // Super Admin hidden login → /login-superadmin (super_admin only)
  loginSuperAdmin: async (email, password) => {
    const res = await api.post("/users/login-superadmin", { email, password });
    if (res?.token) {
      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("role", "super_admin");
      await AsyncStorage.setItem("name", res.name || "Super Admin");
      if (res.user) {
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        if (res.user._id) await AsyncStorage.setItem("userId", res.user._id);
      }
    }
    return res;
  },
  // Yatra Manager tab → /login (admin / super_admin / manager only)
  loginManager: async (emailOrMobile, password) => {
    const res = await api.post("/users/login", { emailOrMobile, password });
    if (res?.token) {
      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("role", res.role || "admin");
      await AsyncStorage.setItem("name", res.name || "");
      if (res.user) {
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        if (res.user._id) await AsyncStorage.setItem("userId", res.user._id);
      }
    }
    return res;
  },
  register: (data) => api.post("/users", data),
  registerOperator: (data) => api.post("/users/register-operator", data),
  guestLogin: async () => {
    const res = await api.post("/users/guest-login");
    if (res?.token) {
      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("role", "guest");
      await AsyncStorage.setItem("name", "Guest");
      if (res.user)
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
    }
    return res;
  },
  logout: async () => {
    try {
      const role = await AsyncStorage.getItem("role");
      if (role === "guest") {
        await api.del("/users/guest-account");
      }
    } catch {}
    await AsyncStorage.multiRemove(["token", "role", "name", "user"]);
  },
  deleteAccount: () => api.del("/users/me"),
  isAuthenticated: async () => !!(await AsyncStorage.getItem("token")),
  getUser: async () => {
    const u = await AsyncStorage.getItem("user");
    try {
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  getRole: () => AsyncStorage.getItem("role"),
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
  changePassword: (currentPassword, newPassword) =>
    api.put("/users/change-password", { currentPassword, newPassword }),
  uploadProfilePicture: async (localUri) => {
    const filename = localUri.split("/").pop();
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    const formData = new FormData();
    // Web: fetch the blob from the URI; Native: use the { uri, name, type } object
    if (typeof document !== "undefined") {
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append("file", blob, filename);
    } else {
      formData.append("file", { uri: localUri, name: filename, type: mime });
    }
    return request("/users/upload-profile-picture", {
      method: "POST",
      body: formData,
    });
  },
  // OTP-based password reset
  forgotPassword: (email) => api.post("/users/forgot-password", { email }),
  verifyOtp: (email, otp) => api.post("/users/verify-otp", { email, otp }),
  resetPassword: (email, otp, newPassword) =>
    api.post("/users/reset-password", { email, otp, newPassword }),
  // Registration OTP flow
  sendRegOtp: (email) => api.post("/users/send-reg-otp", { email }),
  verifyRegOtp: (email, otp) =>
    api.post("/users/verify-reg-otp", { email, otp }),
  // User registration with split names
  registerUser: (data) => api.post("/users", data),
  registerManager: (data) => api.post("/users/register-operator", data),
  // Operator association
  joinOperators: (operatorIds) =>
    api.post("/users/join-operators", { operatorIds }),
  getPublicOperators: () => api.get("/users/operators/public"),
};

export const tours = {
  upcoming: () => api.get("/tours?upcoming=true"),
  all: () => api.get("/tours"),
  trending: () => api.get("/tours?sort=bookings&limit=6&status=published"),
  topRated: () => api.get("/tours?sort=rating&limit=6&status=published"),
  specialOffers: () =>
    api.get("/tours?hasDiscount=true&limit=6&status=published"),
  my: (status) => api.get(status ? `/tours/my?status=${status}` : "/tours/my"),
  drafts: () => api.get("/tours/my?status=draft"),
  byId: (id) => api.get(`/tours/${id}`),
  create: (data) => api.post("/tours", data),
  // saveDraft uses standard create/update to avoid depending on the /draft route
  saveDraft: async (data) => {
    const { tourId, stepData, stepNumber } = data;
    const payload = {
      ...stepData,
      completedSteps: stepNumber,
      status: "draft",
    };
    if (tourId) {
      return api.put(`/tours/${tourId}`, payload);
    }
    // Try the dedicated /draft endpoint first; fall back to POST /tours
    try {
      return await api.post("/tours/draft", data);
    } catch (e) {
      if (e.status === 404) {
        return api.post("/tours", { ...payload, operatorId: undefined });
      }
      throw e;
    }
  },
  updateStep: (id, data) => api.put(`/tours/${id}/step`, data),
  update: (id, data) => api.put(`/tours/${id}`, data),
  // publish toggles: published → draft, draft → published
  publish: (id) => api.put(`/tours/${id}/publish`, {}),
  remove: (id) => api.del(`/tours/${id}`),
  volunteers: (id) => api.get(`/tours/${id}/volunteers`),
  search: (params) => {
    const qs = new URLSearchParams();
    if (params.q) qs.append("q", params.q);
    if (params.source) qs.append("source", params.source);
    if (params.destination) qs.append("destination", params.destination);
    if (params.date) qs.append("date", params.date);
    if (params.category && params.category !== "All")
      qs.append("category", params.category);
    if (params.minPrice) qs.append("minPrice", params.minPrice);
    if (params.maxPrice) qs.append("maxPrice", params.maxPrice);
    if (params.page) qs.append("page", params.page);
    if (params.limit) qs.append("limit", params.limit);
    if (params.sort) qs.append("sort", params.sort);
    return api.get(`/tours/search?${qs.toString()}`);
  },
};

export const bookings = {
  create: (data) => api.post("/bookings", data),
  my: () => api.get("/bookings/my-bookings"),
  byId: (id) => api.get(`/bookings/${id}`),
  createOrder: (data) => api.post("/bookings/create-order", data),
  verifyPayment: (data) => api.post("/bookings/verify-payment", data),
  seatMap: (tourId) => api.get(`/bookings/seats/${tourId}`),
  requestRefund: (bookingId, text) =>
    api.post(`/bookings/${bookingId}/refund-request`, { text }),
  qrCode: (id) => api.get(`/bookings/${id}/qr`),
};

export const donations = {
  createOrder: (data) => api.post("/donations/create-order", data),
  submitRazorpay: (data) => api.post("/donations/razorpay", data),
  publicStats: () => api.get("/donations/public-stats"),
  // Admin-only endpoints
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/donations${qs ? `?${qs}` : ""}`);
  },
  adminStats: () => api.get("/donations/stats"),
};

export const feedback = {
  public: (limit = 6, showAll = false) =>
    api.get(
      `/feedback/public?limit=${limit}&page=1${showAll ? "&showAll=true" : ""}`,
    ),
  create: (data) => api.post("/feedback", data),
};

export const gallery = {
  list: () => api.get("/gallery"),
  upload: async (localUri, title = "", type = "photo") => {
    const filename = localUri.split("/").pop();
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    const formData = new FormData();
    formData.append("file", { uri: localUri, name: filename, type: mime });
    formData.append("title", title);
    formData.append("type", type);
    const uploadRes = await request("/upload", {
      method: "POST",
      body: formData,
    });
    if (!uploadRes?.url) throw new Error("Upload failed — no URL returned");
    return request("/gallery", {
      method: "POST",
      body: JSON.stringify({ type, src: uploadRes.url, title }),
    });
  },
  delete: (id) => api.del(`/gallery/${id}`),
};

export const upload = {
  image: async (localUri) => {
    const filename = localUri.split("/").pop();
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    const formData = new FormData();
    if (typeof document !== "undefined") {
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append("file", blob, filename);
    } else {
      formData.append("file", { uri: localUri, name: filename, type: mime });
    }
    return request("/upload", { method: "POST", body: formData });
  },
};

export const superAdmin = {
  stats: () => api.get("/users/super-admin/stats"),
  operators: () => api.get("/users/operators"),
  operatorById: (id) => api.get(`/users/operators/${id}`),
  allUsers: () => api.get("/users"),
  allTours: () => api.get("/tours"),
  allBookings: () => api.get("/bookings"),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.del(`/users/${id}`),
  updateTour: (id, data) => api.put(`/tours/${id}`, data),
  deleteTour: (id) => api.del(`/tours/${id}`),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  deleteBooking: (id) => api.del(`/bookings/${id}`),
  // Push notification broadcast
  broadcastNotification: (data) => api.post("/notifications/broadcast", data),
  notificationHistory: (page = 1) =>
    api.get(`/notifications/broadcast/history?page=${page}`),
  // Refund management
  allRefunds: (status = "") =>
    api.get(
      `/bookings?refundRequested=true${status ? `&refundStatus=${status}` : ""}`,
    ),
  approveRefund: (id, data) => api.post(`/bookings/${id}/refund/approve`, data),
  rejectRefund: (id, reason) =>
    api.post(`/bookings/${id}/refund/reject`, { reason }),
  // Operator commission
  setCommission: (operatorId, rate) =>
    api.put(`/users/${operatorId}/commission`, { commissionRate: rate }),
  // Coupons
  getCoupons: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/coupons${qs ? "?" + qs : ""}`);
  },
  // Campaign methods
  getCampaigns: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/campaigns${qs ? "?" + qs : ""}`);
  },
  getCampaignById: (id) => api.get("/campaigns/" + id),
  createCampaign: (data) => api.post("/campaigns", data),
  updateCampaign: (id, data) => api.put("/campaigns/" + id, data),
  deleteCampaign: (id) => api.del("/campaigns/" + id),
  sendCampaign: (id) => api.post("/campaigns/" + id + "/send", {}),
  getCampaignAnalytics: () => api.get("/campaigns/analytics/overview"),
  getAudiencePreview: (segment) =>
    api.get(
      "/campaigns/audience-preview?segment=" + encodeURIComponent(segment),
    ),
};

// Admin (operator-scoped) API — bookings filtered by operator on backend
export const admin = {
  allBookings: () => api.get("/bookings"),
};

export const content = {
  byType: (type) => api.get(`/content?type=${encodeURIComponent(type)}`),
};

export const members = {
  list: (status) => api.get(`/members${status ? `?status=${status}` : ""}`),
  apply: (data) => api.post("/members", data),
};

export const contacts = {
  submit: (data) => api.post("/contacts", data),
};

export const services = {
  list: () => api.get("/services"),
  byId: (id) => api.get(`/services/${id}`),
};

// ─── Preferences & Favorites API ──────────────────────────────────────────────
export const preferencesApi = {
  get: () => api.get("/preferences"),
  update: (data) => api.put("/preferences", data),

  getFavorites: (page = 1) =>
    api.get(`/preferences/favorites?page=${page}&limit=20`),
  getFavoriteIds: () => api.get("/preferences/favorites/ids"),
  addFavorite: (tourId) => api.post(`/preferences/favorites/${tourId}`, {}),
  removeFavorite: (tourId) => api.del(`/preferences/favorites/${tourId}`),

  getSearchHistory: () => api.get("/preferences/search-history"),
  addSearchHistory: (query) =>
    api.post("/preferences/search-history", { query }),
  clearSearchHistory: () => api.del("/preferences/search-history"),
  getSuggestions: (q) =>
    api.get(`/preferences/search-suggestions?q=${encodeURIComponent(q)}`),
};

// ─── Security API ─────────────────────────────────────────────────────────────
export const securityApi = {
  getDashboard: () => api.get("/security/dashboard"),
  getSettings: () => api.get("/security/settings"),
  updateSettings: (data) => api.put("/security/settings", data),

  enableBiometric: (data) => api.post("/security/biometric/enable", data),
  disableBiometric: () => api.post("/security/biometric/disable", {}),
  verifyBiometric: () => api.post("/security/biometric/verify", {}),

  enablePin: () => api.post("/security/pin/enable", {}),
  disablePin: () => api.post("/security/pin/disable", {}),
  reportPinFail: () => api.post("/security/pin/failed-attempt", {}),
  resetPinAttempts: () => api.post("/security/pin/reset-attempts", {}),

  setupMFA: () => api.post("/security/mfa/setup", {}),
  verifyAndEnableMFA: (token) =>
    api.post("/security/mfa/verify-setup", { token }),
  verifyMFA: (token) => api.post("/security/mfa/verify", { token }),
  disableMFA: (token) => api.post("/security/mfa/disable", { token }),
  getBackupCodes: () => api.get("/security/mfa/backup-codes"),

  getDevices: () => api.get("/security/devices"),
  trustDevice: (id) => api.put(`/security/devices/${id}/trust`, {}),
  removeDevice: (id) => api.del(`/security/devices/${id}`),

  getSessions: () => api.get("/security/sessions"),
  revokeSession: (id) => api.del(`/security/sessions/${id}`),
  revokeAllSessions: () => api.post("/security/sessions/revoke-all", {}),

  getEvents: (page = 1) => api.get(`/security/events?page=${page}&limit=20`),
  getUnreadCount: () => api.get("/security/events/unread-count"),

  getActivity: (page = 1) =>
    api.get(`/security/activity?page=${page}&limit=30`),
};

// ─── Enterprise Tour Platform APIs ────────────────────────────────────────────

export const couponsApi = {
  list: () => api.get("/coupons"),
  validate: (code, amt) => api.post("/coupons/validate", { code, amount: amt }),
};

export const coupons = {
  list: () => api.get("/coupons"),
  active: () => api.get("/coupons/active"),
  create: (data) => api.post("/coupons", data),
  update: (id, data) => api.put("/coupons/" + id, data),
  remove: (id) => api.del("/coupons/" + id),
  stats: (id) => api.get("/coupons/" + id + "/stats"),
  validate: (data) => api.post("/coupons/validate", data),
};

export const groupBookingApi = {
  create: (data) => api.post("/group-bookings", data),
  my: () => api.get("/group-bookings/my"),
  byId: (id) => api.get("/group-bookings/" + id),
};

export const vehiclesApi = {
  list: () => api.get("/vehicles"),
  create: (data) => api.post("/vehicles", data),
  update: (id, data) => api.put("/vehicles/" + id, data),
  remove: (id) => api.del("/vehicles/" + id),
  assignDriver: (id, dId) =>
    api.put("/vehicles/" + id + "/driver", { driverId: dId }),
};

export const driversApi = {
  list: () => api.get("/drivers"),
  create: (data) => api.post("/drivers", data),
  update: (id, data) => api.put("/drivers/" + id, data),
  toggleAvailable: (id) => api.put("/drivers/" + id + "/availability", {}),
};

export const trackingApi = {
  start: (tourId, data) =>
    api.post("/tracking/start", { tourId, ...(data || {}) }),
  stop: (tourId) => api.post("/tracking/stop/" + tourId, {}),
  updateLocation: (tourId, loc) =>
    api.post("/tracking/location", { tourId, ...(loc || {}) }),
  getForTour: (tourId) => api.get("/tracking/tour/" + tourId),
  active: () => api.get("/tracking/active"),
};

export const chatApi = {
  list: () => api.get("/chat"),
  create: (data) => api.post("/chat", data),
  messages: (chatId, page = 1) =>
    api.get("/chat/" + chatId + "/messages?page=" + page),
  send: (data) => api.post("/chat/message", data),
};

export const communityApi = {
  feed: (type, page = 1) =>
    api.get("/community?type=" + type + "&page=" + page),
  byId: (id) => api.get("/community/" + id),
  create: (data) => api.post("/community", data),
  like: (id) => api.post("/community/" + id + "/like", {}),
  comment: (id, content) =>
    api.post("/community/" + id + "/comment", { content }),
  delete: (id) => api.del("/community/" + id),
  // Admin moderation
  pendingPosts: (page = 1) => api.get("/community/admin/pending?page=" + page),
  approve: (id) => api.put("/community/" + id + "/approve", {}),
  reject: (id, reason) => api.put("/community/" + id + "/reject", { reason }),
};

export const notificationsApi = {
  list: (params = "") => api.get("/notifications?" + params),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.put("/notifications/" + id + "/read", {}),
  markAllRead: () => api.put("/notifications/read-all", {}),
};

export const sosApi = {
  trigger: (data) => api.post("/sos", data),
  active: () => api.get("/sos/active"),
  byId: (id) => api.get("/sos/" + id),
  acknowledge: (id) => api.put("/sos/" + id + "/acknowledge", {}),
  resolve: (id) => api.put("/sos/" + id + "/resolve", {}),
};

export const gamificationApi = {
  level: () => api.get("/gamification/level"),
  badges: () => api.get("/gamification/badges"),
  leaderboard: (params = "") => api.get("/gamification/leaderboard?" + params),
  claimDaily: () => api.post("/gamification/daily-reward", {}),
  redeem: (points) => api.post("/gamification/redeem", { points }),
  referral: () => api.get("/gamification/referral"),
};

export const analyticsApi = {
  dashboard: () => api.get("/analytics/dashboard"),
  revenue: (period) => api.get("/analytics/revenue?period=" + period),
  occupancy: () => api.get("/analytics/occupancy"),
  tours: () => api.get("/analytics/tours"),
};

export const documentsApi = {
  list: () => api.get("/documents"),
  create: (data) => api.post("/documents", data),
  remove: (id) => api.del("/documents/" + id),
  qrTicket: (bookId) => api.get("/documents/ticket/" + bookId + "/qr"),
  pdf: (bookId) => api.get("/documents/ticket/" + bookId + "/pdf"),
};

export const volunteerApi = {
  dashboard: () => api.get("/volunteer/dashboard"),
  scanQR: (data) => api.post("/volunteer/scan-qr", data),
  manualCheckIn: (data) => api.post("/volunteer/manual-checkin", data),
  passengers: (tourId) => api.get("/volunteer/passengers/" + tourId),
  assignedBookings: () => api.get("/volunteer/assigned-bookings"),
  attendance: (tourId) => api.post("/volunteer/attendance/" + tourId, {}),
  list: () => api.get("/volunteer/list"),
  create: (data) => api.post("/volunteer/create", data),
  getById: (id) => api.get(`/volunteer/${id}`),
  delete: (id) => api.del(`/volunteer/${id}`),
  updateStatus: (id, status) => api.put(`/volunteer/${id}/status`, { status }),
  assign: (volunteerId, tourId) =>
    api.post("/volunteer/assign", { volunteerId, tourId }),
  removeTour: (volunteerId, tourId) =>
    api.post("/volunteer/remove-tour", { volunteerId, tourId }),
  verifyDoc: (id, data) => api.post(`/volunteer/${id}/verify-doc`, data),
  uploadDoc: (data) => api.post("/volunteer/upload-doc", data),
};

export const waitlistApi = {
  join: (tourId) => api.post("/waitlist/" + tourId, {}),
  my: () => api.get("/waitlist/my"),
  remove: (tourId) => api.del("/waitlist/" + tourId),
};

export const reviews = {
  moderate: (id, data) => api.put(`/reviews/${id}/moderate`, data),
  adminList: (params = {}) => {
    const q = new URLSearchParams({
      status: params.status || "all",
      page: params.page || 1,
      limit: params.limit || 20,
    }).toString();
    return api.get(`/reviews/admin?${q}`);
  },
  list: (tourId, params = {}) => {
    const q = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10,
      sort: params.sort || "newest",
    }).toString();
    return api.get(`/tours/${tourId}/reviews?${q}`);
  },
  stats: (tourId) => api.get(`/tours/${tourId}/review-stats`),
  create: (tourId, data) => api.post(`/tours/${tourId}/reviews`, data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  remove: (id) => api.del(`/reviews/${id}`),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`, {}),
  addReply: (id, text) => api.post(`/reviews/${id}/reply`, { text }),
};

export const publicSettings = {
  get: () => api.get("/settings/public"),
};

export const publicStats = {
  get: () => api.get("/stats/public"),
};

// ─── Wallet (User) ────────────────────────────────────────────────────────────
export const walletApi = {
  get: () => api.get("/wallet"),
  balance: () => api.get("/wallet/balance"),
  transactions: (page = 1, params = "") =>
    api.get(`/wallet/transactions?page=${page}&limit=20&${params}`),
  createTopupOrder: (amount) => api.post("/wallet/add-money/order", { amount }),
  verifyTopup: (data) => api.post("/wallet/add-money/verify", data),
};

// ─── Operator Wallet ──────────────────────────────────────────────────────────
export const operatorWalletApi = {
  get: () => api.get("/operator-wallet"),
  analytics: (months = 6) =>
    api.get(`/operator-wallet/analytics?months=${months}`),
  settlements: (page = 1) =>
    api.get(`/operator-wallet/settlements?page=${page}`),
  bankAccounts: () => api.get("/operator-wallet/bank-accounts"),
  addBankAccount: (data) => api.post("/operator-wallet/bank-accounts", data),
  removeBankAccount: (id) => api.del(`/operator-wallet/bank-accounts/${id}`),
  requestWithdrawal: (data) => api.post("/operator-wallet/withdraw", data),
  withdrawals: (page = 1) =>
    api.get(`/operator-wallet/withdrawals?page=${page}`),
};

// ─── Super Admin Finance / Settlements ────────────────────────────────────────
export const settlementApi = {
  dashboard: () => api.get("/settlements/finance/dashboard"),
  withdrawals: (status = "", page = 1) =>
    api.get(`/settlements/withdrawals?status=${status}&page=${page}`),
  approveWithdrawal: (id, data) =>
    api.post(`/settlements/withdrawals/${id}/approve`, data),
  rejectWithdrawal: (id, reason) =>
    api.post(`/settlements/withdrawals/${id}/reject`, { reason }),
  operatorEarnings: (id) => api.get(`/settlements/operator/${id}/earnings`),
  history: (page = 1, operatorId = "") =>
    api.get(`/settlements/history?page=${page}&operatorId=${operatorId}`),
};

export const search = {
  saveHistory: (query) => api.post("/search/history", { query }),
  getHistory: () => api.get("/search/history"),
  deleteHistory: (id) => api.del(`/search/history/${id}`),
  clearHistory: () => api.del("/search/history/all"),
  getPopular: () => api.get("/search/popular"),
  getTrending: () => api.get("/search/trending"),
  unified: (q, params = {}) => {
    const qs = new URLSearchParams({ q, ...params }).toString();
    return api.get(`/search/unified?${qs}`);
  },
};

export const crawlApi = {
  // Stats
  getStats: () => api.get("/crawl/stats"),

  // Sources
  getSources: () => api.get("/crawl/sources"),
  getSource: (id) => api.get(`/crawl/sources/${id}`),
  createSource: (data) => api.post("/crawl/sources", data),
  updateSource: (id, data) => api.put(`/crawl/sources/${id}`, data),
  deleteSource: (id) => api.del(`/crawl/sources/${id}`),
  toggleSource: (id) => api.post(`/crawl/sources/${id}/toggle`, {}),
  syncSource: (id) => api.post(`/crawl/sources/${id}/sync`, {}),

  // Jobs
  getJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/crawl/jobs${qs ? "?" + qs : ""}`);
  },
  getJob: (id) => api.get(`/crawl/jobs/${id}`),

  // Crawled tours
  getCrawledTours: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/crawl/tours${qs ? "?" + qs : ""}`);
  },
  reviewTour: (id, action, notes) =>
    api.post(`/crawl/tours/${id}/review`, { action, notes }),
};

// ─── Marketing API ────────────────────────────────────────────────────────────
export const marketing = {
  // Posts
  getPosts: (params) => api.get("/marketing/posts", { params }),
  createPost: (data) => api.post("/marketing/posts", data),
  updatePost: (id, data) => api.put("/marketing/posts/" + id, data),
  deletePost: (id) => api.del("/marketing/posts/" + id),
  publishPost: (id) => api.post("/marketing/posts/" + id + "/publish", {}),
  getPost: (id) => api.get("/marketing/posts/" + id),
  // AI Generation
  generateAds: (data) => api.post("/marketing/generate/ads", data),
  generateSingleAd: (data) => api.post("/marketing/generate/single", data),
  generateImage: (data) => api.post("/marketing/generate/image", data),
  // Social Accounts
  getSocialAccounts: () => api.get("/marketing/social-accounts"),
  connectSocialAccount: (data) => api.post("/marketing/social-accounts", data),
  disconnectAccount: (id) =>
    api.put("/marketing/social-accounts/" + id + "/disconnect", {}),
  deleteSocialAccount: (id) => api.del("/marketing/social-accounts/" + id),
  // Templates
  getTemplates: () => api.get("/marketing/templates"),
  // Auto Rules
  getAutoRules: () => api.get("/marketing/auto-rules"),
  createAutoRule: (data) => api.post("/marketing/auto-rules", data),
  updateAutoRule: (id, data) => api.put("/marketing/auto-rules/" + id, data),
  deleteAutoRule: (id) => api.del("/marketing/auto-rules/" + id),
  // Analytics
  getAnalytics: () => api.get("/marketing/analytics"),
  // Tours (for generator tour picker)
  getTours: () => api.get("/tours"),
};

export { BASE_URL };
