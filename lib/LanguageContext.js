import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "app_language";

const STRINGS = {
  EN: {
    // App brand
    jai: "Book Yatra",
    appName: "Monthly Yatra Parivar",
    quickAccess: "Quick Access",

    // Quick action cards
    bookBus: "Book Bus",
    bookBusSub: "Book a seat",
    membership: "Membership",
    membershipSub: "Join Parivar",
    donate: "Donate",
    donateSub: "Support seva",
    contact: "Contact",
    contactSub: "Get in touch",

    // Banner
    monthlyYatra: "· Book Your Yatra ·",
    bannerTitle: "Plan Your\nSacred Journey",
    bannerSub: "AC & Non-AC buses · Trusted operators · Easy seat booking",
    exploreToursBtn: "Explore Tours",
    bookingOpen: "Booking open",
    yatrasReady: "upcoming yatra ready for darshan",

    // Sections
    upcomingYatras: "Upcoming Yatras",
    upcomingYatrasSub: "Plan your next pilgrimage",
    viewAll: "View All →",
    noUpcomingYatras: "No upcoming yatras at the moment",

    // Devotional services
    devotionalServices: "Devotional Services",
    devotionalServicesSub: "Spiritual offerings",
    dailyAarti: "Daily Aarti",
    readChalisa: "Read Chalisa",
    devotionalBhajans: "Devotional Bhajans",

    // Feedback
    devoteesVoice: "Devotees' Voice",
    devoteesVoiceSub: "Blessed experiences",

    // Footer tagline
    mantra: "Your Journey, Our Promise",
    mantraEn: "Seamless Yatras · Sacred Destinations",

    // Tab bar
    home: "Home",
    tours: "Tours",
    bookings: "Bookings",
    profile: "Profile",
    devotion: "Devotion",

    // Common actions
    loading: "Loading...",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    confirm: "Confirm",
    error: "Error",
    success: "Success",
    refresh: "Refresh",
    submit: "Submit",
    close: "Close",

    // Auth
    login: "Login",
    logout: "Logout",
    register: "Register",

    // Tours
    bookNow: "Book Now",
    upcoming: "Upcoming Tours",
    noTours: "No tours available",
    seatsLeft: "seats left",
    perSeat: "Per seat",
    duration: "Duration",
    aboutYatra: "About this yatra",
    whatsIncluded: "What's included",
    itinerary: "Itinerary",

    // Bookings
    myBookings: "My Bookings",
    noBookings: "No bookings yet",
    confirmBooking: "Confirm Booking",
    bookingConfirmed: "Booking Confirmed",

    // Profile
    editProfile: "Edit Profile",
    changePassword: "Change Password",
    adminPanel: "Admin Panel",
    logoutConfirm: "Are you sure you want to logout?",
    memberSince: "Member since",

    // Booking form steps
    personalDetails: "Personal Details",
    travelDetails: "Travel Details",
    reviewPay: "Review & Pay",

    // Form fields
    fullName: "Full Name",
    mobile: "Mobile Number",
    emailOpt: "Email (optional)",
    address: "Address",
    age: "Age",
    fatherName: "Father / Husband Name",
    gender: "Gender",
    aadhar: "Aadhar Number",
    vrat: "Observing Vrat?",
    vatHint: "Will you fast during the yatra?",
    noOfSeats: "Number of Seats",
    boardingPoint: "Boarding Point",
    totalAmount: "Total Amount",
    continueBtn: "Continue",
    confirmPay: "Confirm & Pay",
    additionalPassengers: "Additional Passengers",
    passengerNum: "Passenger",

    // Gallery
    gallery: "Gallery",
    photos: "Photos",
    videos: "Videos",

    // Devotional
    bhajans: "Bhajans",
    chalisa: "Chalisa",
    aarti: "Aarti",

    // Admin
    dashboard: "Dashboard",
    users: "Users",
    members: "Members",
    enquiries: "Enquiries",
    feedback: "Feedback",
    donations: "Donations",
    settings: "Settings",

    // Misc
    noResults: "No results found",
    tryAgain: "Try again",
    contactUs: "Contact Us",
    about: "About Us",

    // Bookings tab
    myBookingsSub: "Your journeys",
    loginToViewBookings: "Login to view your bookings",
    loginRegister: "Login / Register",
    noBookingYet: "No bookings yet",
    sacredJourneyAwaits: "Your sacred journey awaits",
    exploreYatras: "Explore Yatras",
    viewTicket: "View Ticket",

    // Auth screens
    welcomeBack: "Welcome Back",
    welcomeBackSub: "Glad to see you, devotee",
    joinUs: "Join Us",
    joinUsSub: "Welcome to Shyam Parivar",
    resetPwd: "Reset Password",
    resetPwdSub: "We will send a reset link to your email",

    // Profile menu subs
    marriageAidSub: "Marriage assistance",
    aartiSub: "Daily Aarti",
    chalisaSub: "Khatu Shyam Chalisa",

    // Donate
    donationSuccessTitle: "Donation Successful",
    donationSuccessMsg: "Jai Shree Shyam! Your donation has been received.",
    donateHeroSub: "Every service is by Shyam Ji's grace.",
    anonymousDonate: "Make this donation anonymous",

    // Gallery
    gallerySub: "Memories & Darshan",

    // About
    aboutHeroSub: "Book Yatra Parivar",
    aboutMissionDesc:
      "Book Yatra Parivar is a spiritual family dedicated to the service of Khatu Shyam Ji and the community. We organize monthly yatras, devotional events, and social services to bring devotees together and spread the message of love, faith, and compassion.",

    // Membership
    membershipHeroSub: "Become part of the Parivar",
    membershipSuccessSub:
      "Your application has been submitted successfully.\nWe will review and contact you shortly.",

    // Devotion / Bhajans tab
    devotionHeaderSub: "Bhakti · Music · Aarti",
    bhajanChipSub: "Songs",
    aartiChipSub: "Prayer",
    chalisaChipSub: "Hymn",
    kirtanChipSub: "Chorus",

    // Feedback
    feedbackNote: "Jai Shree Shyam · Your feedback helps us serve better",
  },

  HI: {
    jai: "जय श्री श्याम",
    appName: "श्याम सवारिया परिवार",
    quickAccess: "त्वरित पहुँच",

    bookBus: "बस बुक करें",
    bookBusSub: "सीट बुक करे",
    membership: "सदस्यता",
    membershipSub: "सदस्य बने",
    donate: "दान करें",
    donateSub: "सेवा में दान",
    contact: "संपर्क",
    contactSub: "संपर्क करें",

    monthlyYatra: "· यात्रा बुक करें ·",
    bannerTitle: "पवित्र यात्रा\nकी योजना बनाएं",
    bannerSub: "AC व Non-AC बसें · विश्वसनीय संचालक · आसान सीट बुकिंग",
    exploreToursBtn: "यात्राएं देखें",
    bookingOpen: "बुकिंग खुली है",
    yatrasReady: "आगामी यात्रा दर्शन के लिए तैयार",

    upcomingYatras: "आगामी यात्राएं",
    upcomingYatrasSub: "अगली यात्रा की योजना बनाएं",
    viewAll: "सभी देखें →",
    noUpcomingYatras: "इस समय कोई आगामी यात्रा नहीं",

    devotionalServices: "भक्ति सेवाएं",
    devotionalServicesSub: "आध्यात्मिक सेवाएं",
    dailyAarti: "श्याम जी आरती",
    readChalisa: "खाटू चालीसा",
    devotionalBhajans: "भजन व कीर्तन",

    devoteesVoice: "श्रद्धालु प्रतिक्रिया",
    devoteesVoiceSub: "भक्तों के अनुभव",

    mantra: "आपकी यात्रा, हमारा वादा",
    mantraEn: "सहज यात्रा · पवित्र मंजिलें",

    home: "होम",
    tours: "यात्राएं",
    bookings: "बुकिंग",
    profile: "प्रोफाइल",
    devotion: "भक्ति",

    loading: "लोड हो रहा है...",
    back: "वापस",
    save: "सहेजें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    edit: "बदलें",
    confirm: "पुष्टि करें",
    error: "गलती",
    success: "सफलता",
    refresh: "रीफ्रेश",
    submit: "जमा करें",
    close: "बंद करें",

    login: "लॉगिन",
    logout: "लॉगआउट",
    register: "पंजीकरण",

    bookNow: "अभी बुक करें",
    upcoming: "आगामी यात्राएं",
    noTours: "कोई यात्रा उपलब्ध नहीं",
    seatsLeft: "सीटें बची",
    perSeat: "प्रति सीट",
    duration: "अवधि",
    aboutYatra: "इस यात्रा के बारे में",
    whatsIncluded: "क्या शामिल है",
    itinerary: "कार्यक्रम",

    myBookings: "मेरी बुकिंग",
    noBookings: "अभी तक कोई बुकिंग नहीं",
    confirmBooking: "बुकिंग पुष्टि करें",
    bookingConfirmed: "बुकिंग पुष्ट",

    editProfile: "प्रोफाइल संपादित करें",
    changePassword: "पासवर्ड बदलें",
    adminPanel: "एडमिन पैनल",
    logoutConfirm: "क्या आप लॉगआउट करना चाहते हैं?",
    memberSince: "सदस्य बने",

    personalDetails: "व्यक्तिगत विवरण",
    travelDetails: "यात्रा विवरण",
    reviewPay: "समीक्षा करें",

    fullName: "पूरा नाम",
    mobile: "मोबाइल नंबर",
    emailOpt: "ईमेल (वैकल्पिक)",
    address: "पता",
    age: "आयु",
    fatherName: "पिता / पति का नाम",
    gender: "लिंग",
    aadhar: "आधार संख्या",
    vrat: "व्रत रखेंगे?",
    vatHint: "क्या आप यात्रा के दौरान उपवास रखेंगे?",
    noOfSeats: "सीटों की संख्या",
    boardingPoint: "चढ़ने का स्थान",
    totalAmount: "कुल राशि",
    continueBtn: "जारी रखें",
    confirmPay: "पुष्टि करें और भुगतान करें",
    additionalPassengers: "अतिरिक्त यात्री",
    passengerNum: "यात्री",

    gallery: "गैलरी",
    photos: "फोटो",
    videos: "वीडियो",

    bhajans: "भजन",
    chalisa: "चालीसा",
    aarti: "आरती",

    dashboard: "डैशबोर्ड",
    users: "उपयोगकर्ता",
    members: "सदस्य",
    enquiries: "पूछताछ",
    feedback: "प्रतिक्रिया",
    donations: "दान",
    settings: "सेटिंग",

    noResults: "कोई परिणाम नहीं",
    tryAgain: "पुनः प्रयास",
    contactUs: "संपर्क करें",
    about: "हमारे बारे में",

    myBookingsSub: "आपकी यात्राएं",
    loginToViewBookings: "अपनी यात्राएं देखने के लिए लॉगिन करें",
    loginRegister: "लॉगिन / पंजीकरण",
    noBookingYet: "अभी तक कोई बुकिंग नहीं",
    sacredJourneyAwaits: "आपकी पावन यात्रा आपका इंतजार कर रही है",
    exploreYatras: "यात्राएं देखें",
    viewTicket: "टिकट देखें",

    welcomeBack: "पुनः स्वागत",
    welcomeBackSub: "पुनः स्वागत है, भक्त",
    joinUs: "जुड़ें",
    joinUsSub: "श्याम परिवार में आपका स्वागत है",
    resetPwd: "पासवर्ड रीसेट",
    resetPwdSub: "हम आपके ईमेल पर रीसेट लिंक भेजेंगे",

    marriageAidSub: "विवाह सहायता",
    aartiSub: "श्याम जी की आरती",
    chalisaSub: "खाटू श्याम चालीसा",

    donationSuccessTitle: "दान सफल",
    donationSuccessMsg: "जय श्री श्याम! आपका दान प्राप्त हो गया।",
    donateHeroSub: "हर सेवा, श्याम जी की कृपा।",
    anonymousDonate: "गुप्त दान करें",

    // Gallery
    gallerySub: "दर्शन और स्मृतियाँ",

    // About
    aboutHeroSub: "श्याम सावरिया परिवार",
    aboutMissionDesc:
      "श्याम सावरिया परिवार एक आध्यात्मिक परिवार है, जो खाटू श्याम जी और समाज की सेवा के लिए समर्पित है। हम हर महीने यात्रा, भक्ति कार्यक्रम और सामाजिक सेवाएं आयोजित करते हैं।",

    // Membership
    membershipHeroSub: "श्याम परिवार का हिस्सा बनें",
    membershipSuccessSub:
      "आपका आवेदन सफलतापूर्वक जमा हो गया।\nWe will review and contact you shortly.",

    // Devotion / Bhajans tab
    devotionHeaderSub: "भक्ति · संगीत · आरती",
    bhajanChipSub: "भजन",
    aartiChipSub: "आरती",
    chalisaChipSub: "चालीसा",
    kirtanChipSub: "कीर्तन",

    // Feedback
    feedbackNote: "जय श्री श्याम · आपकी प्रतिक्रिया हमारी सेवा बेहतर बनाती है",
  },
};

const LanguageContext = createContext({
  lang: "EN",
  t: STRINGS.EN,
  toggle: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("EN");

  // Load saved language on app start
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "EN" || saved === "HI") setLang(saved);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setLang((l) => {
      const next = l === "EN" ? "HI" : "EN";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: STRINGS[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
