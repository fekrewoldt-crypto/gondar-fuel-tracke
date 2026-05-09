// Simulated SMS notification service
// In production, this would integrate with Ethio Telecom, Twilio, or Africa's Talking
//
// PRODUCTION SMS PROVIDERS:
// 1. Ethio Telecom SMS Gateway - Official Ethiopian carrier API
// 2. Twilio - International with Ethiopian number support (+251)
//
// RATE LIMITING CONSIDERATIONS:
// - 1 SMS per second per account (Twilio standard)
// - Batch endpoints available for bulk notifications
// - Queue system recommended for high-volume notifications
//
// MESSAGE LENGTH LIMITS:
// - Single SMS: 160 characters (GSM-7 encoding)
// - Multi-part SMS: 153 chars per segment
// - Unicode messages: 70 characters per segment

const NOTIFICATION_TYPES = {
  OTP: 'otp',
  WELCOME: 'welcome',
  VERIFICATION_APPROVED: 'verification_approved',
  VERIFICATION_REJECTED: 'verification_rejected',
  PURCHASE_CONFIRMED: 'purchase_confirmed',
  QUOTA_WARNING: 'quota_warning',
  QUOTA_EXCEEDED: 'quota_exceeded',
  STATION_CAPACITY_LOW: 'station_capacity_low',
  STATION_CAPACITY_CRITICAL: 'station_capacity_critical'
};

// SMS length limits
const SMS_MAX_LENGTH = 160;
const SMS_MULTI_PART_LENGTH = 153;

// In-memory message log for demo
const messageLog = [];

/**
 * Send an SMS message (simulated)
 * @param {string} phone - Ethiopian phone number (+251...)
 * @param {string} message - Message content
 * @param {string} type - Notification type
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendSMS(phone, message, type) {
  // Validate phone format
  if (!validateEthiopianPhone(phone)) {
    throw new Error('Invalid Ethiopian phone number format. Expected: +251XXXXXXXXX');
  }

  // Truncate message if too long
  const truncatedMessage = message.length > SMS_MAX_LENGTH
    ? message.substring(0, SMS_MAX_LENGTH - 3) + '...'
    : message;

  const messageId = generateMessageId();

  // Simulated - logs to console
  console.log(`[SMS] To: ${phone}`);
  console.log(`[SMS] Type: ${type}`);
  console.log(`[SMS] Message: ${truncatedMessage}`);
  console.log(`[SMS] Length: ${truncatedMessage.length} chars`);

  // Store in message log for demo purposes
  messageLog.push({
    id: messageId,
    phone,
    message: truncatedMessage,
    type,
    timestamp: new Date().toISOString(),
    status: 'sent'
  });

  return { success: true, messageId };
}

/**
 * Validate Ethiopian phone numbers
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function validateEthiopianPhone(phone) {
  // Ethiopian format: +251 followed by 9 digits (mobile) or fixed line
  const mobileRegex = /^\+251(9[1-9])[0-9]{7}$/;
  const landlineRegex = /^\+251[0-9]{9}$/;
  return mobileRegex.test(phone) || landlineRegex.test(phone);
}

/**
 * Generate a unique message ID (cryptographically secure)
 * @returns {string}
 */
function generateMessageId() {
  const crypto = require('crypto');
  return `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Format a message template with variables
 * @param {string} template - Template string with {variable} placeholders
 * @param {object} variables - Key-value pairs for replacement
 * @returns {string}
 */
function formatMessage(template, variables) {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return message;
}

/**
 * Get message log entries
 * @param {number} limit - Maximum entries to return
 * @returns {Array}
 */
function getMessageLog(limit = 50) {
  return messageLog.slice(-limit);
}

// Notification templates
const TEMPLATES = {
  otp: 'Your Gondar Fuel verification code is: {code}. Valid for 5 minutes.',
  welcome: 'Welcome to Gondar Fuel! Your account has been created. Start tracking fuel availability near you.',
  verification_approved: 'Your Gondar Fuel account has been verified! You can now access all features.',
  verification_rejected: 'Your Gondar Fuel verification was rejected. Reason: {reason}',
  purchase_confirmed: 'Purchase confirmed! {liters}L {fuelType} for ETB {amount}. Station: {station}',
  quota_warning: 'You have only {remaining}L remaining for today. Purchase now before the daily reset.',
  quota_exceeded: 'Daily quota reached for {fuelType}. Next reset at midnight EAT.',
  station_capacity_low: 'Your station {name} capacity is low ({capacity}%). Consider ordering a delivery.',
  station_capacity_critical: 'CRITICAL: {name} capacity is nearly empty ({capacity}%)!'
};

/**
 * Send OTP via SMS
 * @param {string} phone - Recipient phone number
 * @param {string} otp - One-time password
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendOTP(phone, otp) {
  const message = formatMessage(TEMPLATES.otp, { code: otp });
  return sendSMS(phone, message, NOTIFICATION_TYPES.OTP);
}

/**
 * Send verification result notification
 * @param {string} phone - Recipient phone number
 * @param {boolean} approved - Whether verification was approved
 * @param {string} reason - Rejection reason (if rejected)
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendVerificationResult(phone, approved, reason = '') {
  const type = approved
    ? NOTIFICATION_TYPES.VERIFICATION_APPROVED
    : NOTIFICATION_TYPES.VERIFICATION_REJECTED;

  const template = approved ? TEMPLATES.verification_approved : TEMPLATES.verification_rejected;
  const message = formatMessage(template, { reason });

  return sendSMS(phone, message, type);
}

/**
 * Send purchase confirmation notification
 * @param {string} phone - Recipient phone number
 * @param {object} purchase - Purchase details
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendPurchaseConfirmation(phone, purchase) {
  const message = formatMessage(TEMPLATES.purchase_confirmed, {
    liters: purchase.liters,
    fuelType: purchase.fuelType,
    amount: purchase.amount.toFixed(2),
    station: purchase.station
  });
  return sendSMS(phone, message, NOTIFICATION_TYPES.PURCHASE_CONFIRMED);
}

/**
 * Send quota warning notification
 * @param {string} phone - Recipient phone number
 * @param {number} remaining - Remaining quota in liters
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendQuotaWarning(phone, remaining) {
  const message = formatMessage(TEMPLATES.quota_warning, { remaining });
  return sendSMS(phone, message, NOTIFICATION_TYPES.QUOTA_WARNING);
}

/**
 * Send quota exceeded notification
 * @param {string} phone - Recipient phone number
 * @param {string} fuelType - Fuel type (diesel/petrol)
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendQuotaExceeded(phone, fuelType) {
  const message = formatMessage(TEMPLATES.quota_exceeded, { fuelType });
  return sendSMS(phone, message, NOTIFICATION_TYPES.QUOTA_EXCEEDED);
}

/**
 * Notify provider about station capacity
 * @param {object} provider - Provider object with phone
 * @param {object} station - Station object with name and capacity
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function notifyProviderCapacity(provider, station) {
  const type = station.capacity <= 20
    ? NOTIFICATION_TYPES.STATION_CAPACITY_CRITICAL
    : NOTIFICATION_TYPES.STATION_CAPACITY_LOW;

  const template = type === NOTIFICATION_TYPES.STATION_CAPACITY_CRITICAL
    ? TEMPLATES.station_capacity_critical
    : TEMPLATES.station_capacity_low;

  const message = formatMessage(template, {
    name: station.name,
    capacity: station.capacity
  });

  return sendSMS(provider.phone, message, type);
}

/**
 * Send welcome message to new user
 * @param {string} phone - Recipient phone number
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendWelcome(phone) {
  return sendSMS(phone, TEMPLATES.welcome, NOTIFICATION_TYPES.WELCOME);
}

module.exports = {
  NOTIFICATION_TYPES,
  TEMPLATES,
  sendSMS,
  sendOTP,
  sendVerificationResult,
  sendPurchaseConfirmation,
  sendQuotaWarning,
  sendQuotaExceeded,
  notifyProviderCapacity,
  sendWelcome,
  formatMessage,
  validateEthiopianPhone,
  generateMessageId,
  getMessageLog,
  SMS_MAX_LENGTH,
  SMS_MULTI_PART_LENGTH
};
