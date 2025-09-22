#!/usr/bin/env node

import webpush from 'web-push';

console.log('Generating VAPID keys...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Add these to your .env file:');
console.log('');
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log('');
console.log('Add this to your .env.local file:');
console.log('');
console.log(`VITE_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log('');
console.log('Keys generated successfully!');