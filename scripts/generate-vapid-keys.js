const crypto = require('crypto');

const vapidKeys = {
  publicKey: crypto.randomBytes(65).toString('base64'),
  privateKey: crypto.randomBytes(65).toString('base64')
};

console.log('VAPID Keys generated:');
console.log('PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\nAdd these to your environment variables.');
