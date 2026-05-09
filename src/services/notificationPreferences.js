// User notification preferences management
//
// This module handles user preferences for SMS and in-app notifications.
// Preferences are stored in-memory for the demo - in production, this would
// be stored in the database with the user record.

const DEFAULT_PREFERENCES = {
  sms: {
    otp: true,               // OTP codes for authentication
    purchaseReceipt: true,   // Purchase confirmations
    quotaWarning: true,      // Quota low warnings
    promotions: false        // Promotional messages
  },
  inApp: {
    stationUpdates: true,     // Station status changes nearby
    priceAlerts: true,       // Price drop alerts
    capacityAlerts: true     // Capacity alerts for saved stations
  }
};

// In-memory storage for user preferences
const userPreferences = new Map();

/**
 * Get user notification preferences
 * @param {string} userId - User ID
 * @returns {object} User preferences (merged with defaults)
 */
function getUserPreferences(userId) {
  const stored = userPreferences.get(userId);
  if (!stored) {
    return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
  }
  return {
    sms: { ...DEFAULT_PREFERENCES.sms, ...stored.sms },
    inApp: { ...DEFAULT_PREFERENCES.inApp, ...stored.inApp }
  };
}

/**
 * Update user notification preferences
 * @param {string} userId - User ID
 * @param {object} preferences - New preferences to merge
 * @returns {object} Updated preferences
 */
function updatePreferences(userId, preferences) {
  const current = userPreferences.get(userId) || {};

  const updated = {
    sms: { ...current.sms, ...(preferences.sms || {}) },
    inApp: { ...current.inApp, ...(preferences.inApp || {}) }
  };

  userPreferences.set(userId, updated);
  return getUserPreferences(userId);
}

/**
 * Reset preferences to defaults
 * @param {string} userId - User ID
 * @returns {object} Default preferences
 */
function resetPreferences(userId) {
  userPreferences.delete(userId);
  return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
}

/**
 * Check if a notification type is enabled for a user
 * @param {string} userId - User ID
 * @param {string} channel - 'sms' or 'inApp'
 * @param {string} notificationType - Notification type key
 * @returns {boolean}
 */
function isNotificationEnabled(userId, channel, notificationType) {
  const prefs = getUserPreferences(userId);
  return prefs[channel]?.[notificationType] ?? false;
}

/**
 * Get all stored preferences (for admin/debug)
 * @returns {Map}
 */
function getAllPreferences() {
  return new Map(userPreferences);
}

module.exports = {
  DEFAULT_PREFERENCES,
  getUserPreferences,
  updatePreferences,
  resetPreferences,
  isNotificationEnabled,
  getAllPreferences
};
