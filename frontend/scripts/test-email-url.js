#!/usr/bin/env node

/**
 * Test script to verify email URL configuration
 * Run this to check if URLs will be correct in emails
 * 
 * Usage: node scripts/test-email-url.js
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Replicate the getBaseUrl logic from email.ts
function getBaseUrl() {
  const url = 
    process.env.NEXTAUTH_URL || 
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 
    'https://deden.space';
  
  return url.replace(/\/$/, '');
}

function testUrlGeneration() {
  log('\n🔍 Testing Email URL Generation\n', colors.cyan);
  
  // Get base URL
  const baseUrl = getBaseUrl();
  
  // Test data
  const testBookingId = 'GOA-2025-2025-1763109965135';
  const paymentPath = `/booking/${testBookingId}`;
  
  // Generate full URL (same logic as email.ts)
  const cleanPath = paymentPath.startsWith('/') ? paymentPath : `/${paymentPath}`;
  const fullPaymentUrl = `${baseUrl}${cleanPath}`;
  
  // Display results
  log('Environment Variables:', colors.cyan);
  log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '(not set)'}`, 
    process.env.NEXTAUTH_URL ? colors.green : colors.red);
  log(`  NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || '(not set)'}`,
    process.env.NEXT_PUBLIC_APP_URL ? colors.green : colors.yellow);
  log(`  VERCEL_URL: ${process.env.VERCEL_URL || '(not set)'}`,
    process.env.VERCEL_URL ? colors.green : colors.yellow);
  
  log('\n📧 Generated Email URL:', colors.cyan);
  log(`  Base URL: ${baseUrl}`, colors.green);
  log(`  Payment Path: ${paymentPath}`, colors.green);
  log(`  Full URL: ${fullPaymentUrl}`, colors.green);
  
  // Validation
  log('\n✅ Validation Checks:', colors.cyan);
  
  const checks = [
    {
      name: 'Base URL is not undefined',
      pass: baseUrl !== 'undefined' && !baseUrl.includes('undefined'),
      error: 'Base URL contains "undefined"',
    },
    {
      name: 'Base URL has protocol',
      pass: baseUrl.startsWith('http://') || baseUrl.startsWith('https://'),
      error: 'Base URL must start with http:// or https://',
    },
    {
      name: 'Base URL has no trailing slash',
      pass: !baseUrl.endsWith('/'),
      error: 'Base URL should not end with /',
    },
    {
      name: 'Full URL is valid',
      pass: fullPaymentUrl.startsWith('http') && !fullPaymentUrl.includes('undefined'),
      error: 'Full URL is invalid or contains undefined',
    },
    {
      name: 'Payment path starts with /',
      pass: cleanPath.startsWith('/'),
      error: 'Payment path must start with /',
    },
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (check.pass) {
      log(`  ✅ ${check.name}`, colors.green);
    } else {
      log(`  ❌ ${check.name}`, colors.red);
      log(`     Error: ${check.error}`, colors.red);
      allPassed = false;
    }
  });
  
  // Final result
  log('\n═══════════════════════════════════════\n', colors.cyan);
  
  if (allPassed) {
    log('✅ SUCCESS! Email URLs will be generated correctly.', colors.green);
    log(`\nExample email will contain:`, colors.cyan);
    log(`"Complete payment at: ${fullPaymentUrl}"`, colors.green);
  } else {
    log('❌ FAILED! Email URLs will be broken.', colors.red);
    log('\nTo fix:', colors.yellow);
    log('1. Add to your .env.local file:', colors.yellow);
    log('   NEXTAUTH_URL=https://deden.space', colors.yellow);
    log('2. Restart your dev server:', colors.yellow);
    log('   rm -rf .next && npm run dev', colors.yellow);
  }
  
  log('');
  
  return allPassed;
}

// Mock email HTML generation
function generateMockEmailHtml() {
  const baseUrl = getBaseUrl();
  const bookingId = 'TEST-2025-123456';
  const paymentPath = `/booking/${bookingId}`;
  const cleanPath = paymentPath.startsWith('/') ? paymentPath : `/${paymentPath}`;
  const fullPaymentUrl = `${baseUrl}${cleanPath}`;
  
  return `
<!DOCTYPE html>
<html>
<body>
  <h1>Payment Required</h1>
  <p>Click below to complete payment:</p>
  <a href="${fullPaymentUrl}">Complete Payment</a>
  <p>Or copy this link: ${fullPaymentUrl}</p>
</body>
</html>
  `.trim();
}

// Preview the email
function previewEmail() {
  log('\n📄 Email Preview\n', colors.cyan);
  log('─'.repeat(60), colors.cyan);
  const html = generateMockEmailHtml();
  
  // Show key parts
  const urlMatch = html.match(/href="([^"]+)"/);
  if (urlMatch) {
    log(`Link in email: ${urlMatch[1]}`, 
      urlMatch[1].includes('undefined') ? colors.red : colors.green);
  }
  
  log('─'.repeat(60), colors.cyan);
}

// Run tests
(function main() {
  log('\n╔════════════════════════════════════════╗', colors.cyan);
  log('║     Email URL Configuration Test      ║', colors.cyan);
  log('╚════════════════════════════════════════╝', colors.cyan);
  
  const passed = testUrlGeneration();
  previewEmail();
  
  process.exit(passed ? 0 : 1);
})();