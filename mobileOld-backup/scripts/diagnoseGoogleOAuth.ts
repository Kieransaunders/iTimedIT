/**
 * Google OAuth Diagnostic Script
 *
 * This script helps diagnose Google OAuth configuration issues
 * Run with: npx ts-node scripts/diagnoseGoogleOAuth.ts
 */

import * as AuthSession from 'expo-auth-session';

console.log('\n=== Google OAuth Configuration Diagnostics ===\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
console.log(`   EXPO_PUBLIC_GOOGLE_CLIENT_ID: ${clientId ? '✓ Set' : '✗ Missing'}`);
if (clientId) {
  console.log(`   Value: ${clientId}`);
}

// 2. Check redirect URI
console.log('\n2. Redirect URI Configuration:');
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'itimeditapp',
  path: 'auth/callback'
});
console.log(`   Generated Redirect URI: ${redirectUri}`);
console.log(`   ⚠️  This MUST be registered in Google Cloud Console exactly as shown`);

// 3. Expected configuration
console.log('\n3. Expected Google Cloud Console Configuration:');
console.log('   OAuth Client Type: iOS');
console.log('   Bundle ID: com.itimedit.app');
console.log(`   Redirect URI: ${redirectUri}`);

// 4. Common issues
console.log('\n4. Common Issues to Check:');
console.log('   ✓ OAuth client type is "iOS" (not "Web application")');
console.log('   ✓ Bundle ID matches: com.itimedit.app');
console.log(`   ✓ Redirect URI is exactly: ${redirectUri}`);
console.log('   ✓ OAuth consent screen is configured');
console.log('   ✓ Scopes include: openid, profile, email');
console.log('   ✓ App is not in "Testing" mode, or your Google account is added as test user');

// 5. OAuth consent screen requirements
console.log('\n5. OAuth Consent Screen Requirements:');
console.log('   - Application name: iTimedIT');
console.log('   - User support email: [your-email]');
console.log('   - Developer contact: [your-email]');
console.log('   - Authorized domains: (leave empty for mobile)');
console.log('   - Scopes: openid, profile, email (non-sensitive)');

// 6. Testing status
console.log('\n6. Testing Status:');
console.log('   If app is in "Testing" mode:');
console.log('   - Add your Google account as a test user');
console.log('   - Or publish the app to "Production" (for public use)');

console.log('\n=== Next Steps ===\n');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log('2. Verify the OAuth client configuration matches above');
console.log('3. Check OAuth consent screen at: https://console.cloud.google.com/apis/credentials/consent');
console.log('4. Ensure your Google account is added as a test user (if in Testing mode)\n');
