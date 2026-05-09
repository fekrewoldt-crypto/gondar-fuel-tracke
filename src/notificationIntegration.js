// Notification integration module for server.js
//
// This module provides integration functions to call notification services
// from existing server endpoints.

const notificationService = require('./services/notificationService');
const notificationPreferences = require('./services/notificationPreferences');

/**
 * Send OTP notification (called during login/registration)
 * @param {string} phone - User phone number
 * @param {string} otp - Generated OTP code
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyOTP(phone, otp) {
  try {
    return await notificationService.sendOTP(phone, otp);
  } catch (error) {
    console.error('[Notification] OTP send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send verification result (called by admin actions)
 * @param {string} phone - User phone number
 * @param {boolean} approved - Whether verification was approved
 * @param {string} reason - Rejection reason if not approved
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyVerificationResult(phone, approved, reason = '') {
  try {
    return await notificationService.sendVerificationResult(phone, approved, reason);
  } catch (error) {
    console.error('[Notification] Verification result send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send purchase confirmation (called after successful purchase)
 * @param {string} phone - User phone number
 * @param {object} purchaseDetails - Purchase information
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyPurchaseConfirmed(phone, purchaseDetails) {
  // Check user preferences before sending
  if (!notificationPreferences.isNotificationEnabled(
    purchaseDetails.userId,
    'sms',
    'purchaseReceipt'
  )) {
    return { success: false, reason: 'User has disabled purchase notifications' };
  }

  try {
    return await notificationService.sendPurchaseConfirmation(phone, purchaseDetails);
  } catch (error) {
    console.error('[Notification] Purchase confirmation send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check and notify providers about capacity changes
 * @param {object} provider - Provider object
 * @param {object} station - Station object with capacity info
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyProviderCapacity(provider, station) {
  const capacityThresholds = {
    low: 40,      // Notify at 40% capacity
    critical: 20  // Urgent notify at 20% capacity
  };

  const capacity = station.capacity || 0;

  // Only notify if capacity is below thresholds
  if (capacity > capacityThresholds.low) {
    return { success: false, reason: 'Capacity above threshold' };
  }

  try {
    return await notificationService.notifyProviderCapacity(provider, station);
  } catch (error) {
    console.error('[Notification] Provider capacity notify failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send quota warning (called when user is running low)
 * @param {string} phone - User phone number
 * @param {number} remainingLiters - Remaining quota
 * @param {string} userId - User ID for preference check
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyQuotaWarning(phone, remainingLiters, userId) {
  if (!notificationPreferences.isNotificationEnabled(userId, 'sms', 'quotaWarning')) {
    return { success: false, reason: 'User has disabled quota warnings' };
  }

  try {
    return await notificationService.sendQuotaWarning(phone, remainingLiters);
  } catch (error) {
    console.error('[Notification] Quota warning send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send quota exceeded notification
 * @param {string} phone - User phone number
 * @param {string} fuelType - Type of fuel
 * @param {string} userId - User ID for preference check
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyQuotaExceeded(phone, fuelType, userId) {
  if (!notificationPreferences.isNotificationEnabled(userId, 'sms', 'quotaWarning')) {
    return { success: false, reason: 'User has disabled quota notifications' };
  }

  try {
    return await notificationService.sendQuotaExceeded(phone, fuelType);
  } catch (error) {
    console.error('[Notification] Quota exceeded send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome message to new user
 * @param {string} phone - User phone number
 * @returns {Promise<object>} Result with success status and messageId
 */
async function notifyWelcome(phone) {
  try {
    return await notificationService.sendWelcome(phone);
  } catch (error) {
    console.error('[Notification] Welcome send failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  notifyOTP,
  notifyVerificationResult,
  notifyPurchaseConfirmed,
  notifyProviderCapacity,
  notifyQuotaWarning,
  notifyQuotaExceeded,
  notifyWelcome,
  notificationService,
  notificationPreferences,
  pushService: require('./services/pushService')
};
