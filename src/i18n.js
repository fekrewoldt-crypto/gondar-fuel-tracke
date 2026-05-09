// Gondar Fuel Tracker - Internationalization (i18n) System
// Supports: English (en), Amharic (am)

const locales = {
  en: {
    app: { name: "Gondar Fuel Tracker", tagline: "Track real-time fuel availability in Gondar" },
    nav: { map: "Map", stations: "Stations", services: "Services", profile: "Profile", signIn: "Sign In", signOut: "Sign Out" },
    auth: { phone: "Phone Number", phonePlaceholder: "+251 91 234 5678", sendOtp: "Send OTP", verifyOtp: "Verify", otpSent: "OTP sent to your phone", enterOtp: "Enter the 6-digit code", register: "Register", forgotPassword: "Forgot Password?" },
    driver: { title: "Driver", myQuota: "My Quota", diesel: "Diesel", petrol: "Petrol", remaining: "remaining", purchase: "Buy Fuel", purchaseHistory: "Purchase History", dailyLimit: "Daily Limit" },
    station: { available: "Available", low: "Low", empty: "Empty", hours: "Operating Hours", amenities: "Amenities", reviews: "Reviews", call: "Call", navigate: "Navigate" },
    purchase: { title: "Purchase Fuel", fuelType: "Fuel Type", amount: "Amount (Liters)", total: "Total", goToTelebir: "Go to TeleBir", confirmPayment: "I've Completed Payment", quotaExceeded: "Daily limit reached", success: "Purchase successful!" },
    status: { loading: "Loading...", error: "An error occurred", retry: "Try Again", noConnection: "No internet connection", offline: "You are offline" },
    common: { save: "Save", cancel: "Cancel", confirm: "Confirm", close: "Close", search: "Search", filter: "Filter", refresh: "Refresh" }
  },
  am: {
    app: { name: "ጋንዳር ለነዳጅ አስተዳደር", tagline: "በጋንዳር የሚገኙ ለነዳጅ ጣቢያዎችን በጊዜያዊ ሁኔታ ይከታተሉ" },
    nav: { map: "ካርታ", stations: "ጣቢያዎች", services: "አገልግሎቶች", profile: "መገለጫ", signIn: "ግባ", signOut: "ውጣ" },
    auth: { phone: "ስልክ ቁጥር", phonePlaceholder: "+251 91 234 5678", sendOtp: "ኦቲፒ ላክ", verifyOtp: "ማረጋገጥ", otpSent: "ኦቲፒ ወደ ስልክዎ ተላከ", enterOtp: "6-አሃዝ ኮድ ያስገቡ", register: "ተመዝገብ", forgotPassword: "የሚሽር ቁልፍ ረስተሃለህ?" },
    driver: { title: "አሽከርካሪ", myQuota: "የሊት ቅነሳ", diesel: "ዲዝል", petrol: "ፔትሮል", remaining: "ቀርቷል", purchase: "ለነዳጅ ግዢ", purchaseHistory: "የግዢ ታሪክ", dailyLimit: "ቀናዊ ገደብ" },
    station: { available: "ይገኛል", low: "ቀርቷል", empty: "ባለቀ", hours: "የሥራ ሰዓታት", amenities: "ተጨማሪ አገልግሎቶች", reviews: "አስተያየቶች", call: "ይደውሉ", navigate: "ይሄዱ" },
    purchase: { title: "ለነዳጅ ግዢ", fuelType: "የሊት አይነት", amount: "መጠን (ሊተር)", total: "ጠቅላላ", goToTelebir: "ለቲሌቢር ይሂዱ", confirmPayment: "ለግዢ ማረጋገጫ", quotaExceeded: "የቀን ገደብ ደርሷል", success: "ግዢው ተሳካ!" },
    status: { loading: "በማስጀመር...", error: "ስህተት ተከስቷል", retry: "እንደገና ሞክር", noConnection: "ግንኙነት አልተገኘም", offline: "ከሽቃን ርቀት ላይ" },
    common: { save: "አስቀምጥ", cancel: "ተሰርዝ", confirm: "ማረጋገጥ", close: "ገሠጽ", search: "ፈልግ", filter: "ማጣሪያ", refresh: "አድስ" }
  }
};

let currentLocale = 'en';

function setLocale(locale) {
  if (locales[locale]) {
    currentLocale = locale;
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
    if (locale === 'am') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
    updateDOM();
  }
}

function t(key) {
  const keys = key.split('.');
  let value = locales[currentLocale];
  for (const k of keys) {
    value = value?.[k];
  }
  if (!value) {
    value = locales['en'];
    for (const k of keys) {
      value = value?.[k];
    }
  }
  return value || key;
}

function updateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

function initLocale() {
  const saved = localStorage.getItem('locale');
  if (saved && locales[saved]) {
    currentLocale = saved;
  } else {
    const browserLang = navigator.language.split('-')[0];
    currentLocale = locales[browserLang] ? browserLang : 'en';
  }
  document.documentElement.lang = currentLocale;
  if (currentLocale === 'am') {
    document.documentElement.dir = 'rtl';
  }
}

// RTL styles for Amharic
const rtlStyles = document.createElement('style');
rtlStyles.textContent = `
  html[lang="am"] body { direction: rtl; text-align: right; }
  html[lang="am"] .mobile-nav { flex-direction: row-reverse; }
  html[lang="am"] .nav-item { flex-direction: column-reverse; }
`;
document.head.appendChild(rtlStyles);
