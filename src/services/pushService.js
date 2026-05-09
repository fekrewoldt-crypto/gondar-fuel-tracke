const crypto = require('crypto');

// VAPID keys should be in environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = 'mailto:admin@gondarfuel.et';

// In-memory store for push subscriptions
let pushSubscriptions = []; // { userId, endpoint, keys }

/**
 * Subscribe a user to push notifications
 */
function subscribe(userId, subscription) {
  const existing = pushSubscriptions.findIndex(s => s.userId === userId);
  if (existing > -1) {
    pushSubscriptions[existing] = { userId, ...subscription };
  } else {
    pushSubscriptions.push({ userId, ...subscription });
  }
}

/**
 * Unsubscribe user from push notifications
 */
function unsubscribe(userId) {
  pushSubscriptions = pushSubscriptions.filter(s => s.userId !== userId);
}

/**
 * Send push notification to a user
 */
async function sendPushNotification(userId, payload) {
  const subscription = pushSubscriptions.find(s => s.userId === userId);
  if (!subscription) {
    return { success: false, error: 'No subscription found' };
  }

  // In production, use web-push library
  // For demo, simulate notification
  console.log(`[PUSH] Sending to ${userId}:`, payload);

  return { success: true };
}

/**
 * Broadcast to multiple users
 */
async function broadcast(userIds, payload) {
  const results = await Promise.all(
    userIds.map(userId => sendPushNotification(userId, payload))
  );
  return results;
}

module.exports = {
  subscribe,
  unsubscribe,
  sendPushNotification,
  broadcast,
  getVapidPublicKey: () => VAPID_PUBLIC_KEY,
  getVapidPrivateKey: () => VAPID_PRIVATE_KEY,
  getVapidSubject: () => VAPID_SUBJECT
};
