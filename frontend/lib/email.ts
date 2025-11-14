import { Resend } from 'resend';
import { db } from '@/lib/database';
import { PaymentToken } from '@prisma/client';
import { chainConfig } from '@/lib/config';

// Initialize the Resend client
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined in .env");
}
const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = 'bookings@deden.space';
const supportEmail = 'bookings@deden.space';

// ✅ FIX: Get base URL with fallback and validation
function getBaseUrl(): string {
  // Try multiple sources in order of preference
  const url = 
    process.env.NEXTAUTH_URL || 
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
    'https://deden.space'; // Final fallback
  
  // Remove trailing slash
  const cleanUrl = url.replace(/\/$/, '');
  
  console.log('[EmailLib] Using base URL:', cleanUrl);
  
  return cleanUrl;
}

const baseUrl = getBaseUrl();

// Helper function to log emails to database
async function logEmailToDb(
  recipientEmail: string,
  subject: string,
  type: string,
  metadata: any = {}
) {
  try {
    await db.notification.create({
      data: {
        recipientEmail: recipientEmail,
        type: type,
        subject: subject,
        body: `Email of type ${type} sent to ${recipientEmail}`,
        status: 'sent',
        sentAt: new Date(),
        metadata: metadata,
      },
    });
  } catch (error) {
    console.error('[EmailLib] Failed to log email to DB:', error);
  }
}

// Helper to get block explorer URL based on chain
function getExplorerUrl(chainId: number, txHash: string): string {
  const chain = chainConfig[chainId];
  if (!chain) return '#';
  return `${chain.blockExplorer}/tx/${txHash}`;
}

// Helper to get chain display name
function getChainDisplayName(chainId: number): string {
  const chain = chainConfig[chainId];
  return chain?.name || 'Unknown Chain';
}

// --- Email Template: Booking Approved (Payment Required) ---
interface ApprovalEmailProps {
  recipientEmail: string;
  recipientName: string;
  bookingId: string;
  stayTitle: string;
  stayLocation: string;
  startDate: Date;
  endDate: Date;
  paymentAmount: number;
  paymentToken: string;
  chainId?: number;
  paymentUrl: string; // This should be the RELATIVE path, we'll make it absolute
  expiresAt: Date;
}

export async function sendApprovalEmail(props: ApprovalEmailProps) {
  const {
    recipientEmail,
    recipientName,
    bookingId,
    stayTitle,
    paymentAmount,
    paymentToken,
    chainId,
    paymentUrl,
    expiresAt,
  } = props;

  const subject = `🎉 Application Approved - ${stayTitle}`;
  const expiryString = expiresAt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const chainName = chainId ? getChainDisplayName(chainId) : 'your preferred network';

  // ✅ FIX: Construct full payment URL correctly
  // Remove leading slash if present, then add it back
  const cleanPath = paymentUrl.startsWith('/') ? paymentUrl : `/${paymentUrl}`;
  const fullPaymentUrl = `${baseUrl}${cleanPath}`;
  
  console.log('[EmailLib] Payment URL:', {
    original: paymentUrl,
    clean: cleanPath,
    full: fullPaymentUrl,
    baseUrl: baseUrl,
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .container {
      background-color: #172A46;
      padding: 20px;
      min-height: 100vh;
    }
    .card {
      background-color: #1F3A61;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #3a5b8a;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    .header {
      padding: 32px 24px;
      background: linear-gradient(135deg, #0070f3 0%, #00d4ff 100%);
      color: white;
      text-align: center;
    }
    .header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }
    .emoji {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .content {
      padding: 32px 24px;
      line-height: 1.6;
      color: #FFFFFF;
    }
    .content p {
      margin-bottom: 16px;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 16px;
      border-radius: 6px;
      margin: 24px 0;
      color: #856404;
    }
    .warning-box strong {
      display: block;
      margin-bottom: 8px;
      color: #856404;
    }
    .payment-details {
      background-color: #0f1f35;
      padding: 24px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #3a5b8a;
      margin: 24px 0;
    }
    .payment-details .label {
      font-size: 14px;
      color: #a0aec0;
      margin-bottom: 8px;
    }
    .payment-details .amount {
      font-size: 36px;
      font-weight: bold;
      color: #58a6ff;
      margin-bottom: 8px;
    }
    .payment-details .network {
      font-size: 14px;
      color: #a0aec0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
    }
    .cta-button:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    }
    .info-list {
      background-color: #0f1f35;
      padding: 20px 20px 20px 40px;
      border-radius: 8px;
      border: 1px solid #3a5b8a;
      margin: 24px 0;
    }
    .info-list li {
      margin-bottom: 12px;
      color: #e2e8f0;
    }
    .footer {
      padding: 24px;
      font-size: 12px;
      color: #a0aec0;
      text-align: center;
      background-color: #0f1f35;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer a {
      color: #58a6ff;
      text-decoration: none;
    }
    .url-box {
      background-color: #0f1f35;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #3a5b8a;
      margin-top: 16px;
      word-break: break-all;
      font-size: 12px;
      color: #a0aec0;
    }
    .url-box a {
      color: #58a6ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="emoji">🎉</div>
        <h2>Congratulations, ${recipientName}!</h2>
        <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your application has been approved</p>
      </div>
      
      <div class="content">
        <p>Great news! Your application for <strong>${stayTitle}</strong> has been approved.</p>
        
        <div class="warning-box">
          <strong>⏰ Action Required</strong>
          Complete your payment by <strong>${expiryString}</strong> to secure your spot.
        </div>
        
        <div class="payment-details">
          <div class="label">Amount Due</div>
          <div class="amount">$${paymentAmount} ${paymentToken}</div>
          <div class="network">Payment on ${chainName}</div>
        </div>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${fullPaymentUrl}" class="cta-button">
            💳 Complete Payment Now
          </a>
        </p>
        
        <h3 style="color: #e2e8f0; margin-top: 32px;">What happens next?</h3>
        <ul class="info-list">
          <li>Click the button above to complete your payment</li>
          <li>You can pay with ${paymentToken} on ${chainName}</li>
          <li>Once confirmed, you'll receive your booking confirmation</li>
          <li>Check-in details will be sent closer to your stay date</li>
        </ul>

        <p style="font-size: 13px; color: #a0aec0; margin-top: 32px;">
          <strong>Important:</strong> If you don't complete payment by ${expiryString}, your spot may be released to the waitlist.
        </p>
        
        <div class="url-box">
          <strong style="display: block; margin-bottom: 8px; color: #e2e8f0;">Payment Link:</strong>
          <a href="${fullPaymentUrl}">${fullPaymentUrl}</a>
          <p style="margin-top: 8px; font-size: 11px; color: #718096;">
            If the button doesn't work, copy and paste this link into your browser
          </p>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p>Questions? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
      <p style="margin-top: 16px; opacity: 0.7;">© ${new Date().getFullYear()} Decentralized Den. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html: htmlBody,
    });
    
    console.log('[EmailLib] Approval email sent:', response);

    await logEmailToDb(
      recipientEmail,
      subject,
      response.data ? 'booking_approved' : 'booking_approved_failed',
      { 
        bookingId, 
        chainId,
        paymentUrl: fullPaymentUrl, // Log the full URL for debugging
        apiResponse: response,
        resendId: response.data?.id 
      }
    );

    if (response.error) {
      throw response.error;
    }

    return true;
  } catch (error: any) {
    console.error('[EmailLib] Failed to send approval email:', error);
    await logEmailToDb(
      recipientEmail,
      subject,
      'booking_approved_failed',
      { bookingId, error: error?.message || error }
    );
    throw error;
  }
}

// --- Email Template: Payment Confirmed ---
interface ConfirmationEmailProps {
  recipientEmail: string;
  recipientName: string;
  bookingId: string;
  stayTitle: string;
  stayLocation: string;
  startDate: Date;
  endDate: Date;
  paidAmount: number;
  paidToken: PaymentToken;
  txHash: string;
  chainId: number;
}

export async function sendConfirmationEmail(props: ConfirmationEmailProps) {
  const {
    recipientEmail,
    recipientName,
    stayTitle,
    stayLocation,
    startDate,
    endDate,
    bookingId,
    paidAmount,
    paidToken,
    txHash,
    chainId,
  } = props;

  const subject = `✅ Payment Confirmed - ${stayTitle}`;
  const explorerUrl = getExplorerUrl(chainId, txHash);
  const chainName = getChainDisplayName(chainId);
  
  const dateRange = `${startDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  })} - ${endDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })}`;

  // ✅ FIX: Use baseUrl for dashboard link
  const dashboardUrl = `${baseUrl}/dashboard`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      background-color: #172A46;
      padding: 20px;
      min-height: 100vh;
    }
    .card {
      background-color: #1F3A61;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #3a5b8a;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    .header {
      padding: 32px 24px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-align: center;
    }
    .header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }
    .emoji {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .content {
      padding: 32px 24px;
      line-height: 1.6;
      color: #FFFFFF;
    }
    .content p {
      margin-bottom: 16px;
    }
    .success-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 24px 0;
      color: #065f46;
    }
    .success-box strong {
      display: block;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .details-box {
      background-color: #0f1f35;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #3a5b8a;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #2d3748;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #a0aec0;
      font-size: 14px;
    }
    .detail-value {
      color: #e2e8f0;
      font-weight: 600;
      text-align: right;
      word-break: break-all;
      max-width: 60%;
    }
    .tx-link {
      color: #58a6ff;
      text-decoration: none;
      font-family: monospace;
      font-size: 12px;
    }
    .next-steps {
      background-color: #0f1f35;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #58a6ff;
      margin: 24px 0;
    }
    .next-steps h3 {
      color: #58a6ff;
      margin-top: 0;
    }
    .next-steps ul {
      color: #e2e8f0;
      padding-left: 20px;
    }
    .next-steps li {
      margin-bottom: 8px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #0070f3 0%, #0051cc 100%);
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      text-align: center;
    }
    .footer {
      padding: 24px;
      font-size: 12px;
      color: #a0aec0;
      text-align: center;
      background-color: #0f1f35;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer a {
      color: #58a6ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="emoji">✅</div>
        <h2>Payment Confirmed!</h2>
        <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your spot is secured</p>
      </div>
      
      <div class="content">
        <p>Hi ${recipientName},</p>
        
        <div class="success-box">
          <strong>🎉 You're all set!</strong>
          Your spot for ${stayTitle} is confirmed.
        </div>
        
        <p>We've successfully received your payment. Get ready for an amazing experience in <strong>${stayLocation}</strong>!</p>
        
        <h3 style="color: #e2e8f0; margin-top: 32px;">Booking Details</h3>
        <div class="details-box">
          <div class="detail-row">
            <span class="detail-label">Stay</span>
            <span class="detail-value">${stayTitle}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location</span>
            <span class="detail-value">${stayLocation}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dates</span>
            <span class="detail-value">${dateRange}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Booking ID</span>
            <span class="detail-value">${bookingId}</span>
          </div>
        </div>

        <h3 style="color: #e2e8f0; margin-top: 32px;">Payment Details</h3>
        <div class="details-box">
          <div class="detail-row">
            <span class="detail-label">Amount Paid</span>
            <span class="detail-value">$${paidAmount} ${paidToken}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Network</span>
            <span class="detail-value">${chainName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Transaction</span>
            <span class="detail-value">
              <a href="${explorerUrl}" class="tx-link" target="_blank">
                ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}
              </a>
            </span>
          </div>
        </div>

        <div class="next-steps">
          <h3>📋 What's Next?</h3>
          <ul>
            <li>You'll receive check-in instructions 48 hours before your arrival</li>
            <li>Join our community chat to connect with other guests</li>
            <li>Review the packing list and house rules in your dashboard</li>
            <li>Let us know if you have any dietary restrictions or special requirements</li>
          </ul>
        </div>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" class="cta-button">
            View Dashboard
          </a>
        </p>

        <p style="color: #a0aec0; font-size: 14px; margin-top: 32px;">
          We're looking forward to hosting you! If you have any questions before your stay, don't hesitate to reach out.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
      <p style="margin-top: 16px; opacity: 0.7;">© ${new Date().getFullYear()} Decentralized Den. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    });
    
    console.log('[EmailLib] Confirmation email sent:', response);

    await logEmailToDb(
      recipientEmail, 
      subject, 
      response.data ? 'payment_confirmed' : 'payment_confirmed_failed', 
      { 
        bookingId, 
        txHash,
        chainId,
        apiResponse: response,
        resendId: response.data?.id
      }
    );

    if (response.error) {
      throw response.error;
    }

    return true;
  } catch (error: any) {
    console.error('[EmailLib] Failed to send confirmation email:', error);
    await logEmailToDb(
      recipientEmail, 
      subject, 
      'payment_confirmed_failed', 
      {
        bookingId, 
        txHash, 
        chainId,
        error: error?.message || error
      }
    );
    throw error;
  }
}

// --- Email Template: Payment Failed ---
interface PaymentFailedEmailProps {
  recipientEmail: string;
  recipientName: string;
  bookingId: string;
  stayTitle: string;
  reason: string;
}

export async function sendPaymentFailedEmail(props: PaymentFailedEmailProps) {
  const {
    recipientEmail,
    recipientName,
    bookingId,
    stayTitle,
    reason,
  } = props;

  const subject = `Payment Issue - ${stayTitle}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .container {
      background-color: #172A46;
      padding: 20px;
    }
    .card {
      background-color: #1F3A61;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #3a5b8a;
    }
    .header {
      padding: 32px 24px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      text-align: center;
    }
    .content {
      padding: 32px 24px;
      color: #FFFFFF;
    }
    .error-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 16px;
      border-radius: 6px;
      margin: 24px 0;
      color: #856404;
    }
    .footer {
      padding: 24px;
      text-align: center;
      color: #a0aec0;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h2>⚠️ Payment Issue Detected</h2>
      </div>
      <div class="content">
        <p>Hi ${recipientName},</p>
        <p>We encountered an issue processing your payment for <strong>${stayTitle}</strong>.</p>
        
        <div class="error-box">
          <strong>Reason:</strong> ${reason}
        </div>
        
        <p>Please contact support at <a href="mailto:${supportEmail}" style="color: #58a6ff;">${supportEmail}</a> with your booking ID: <strong>${bookingId}</strong></p>
      </div>
      <div class="footer">
        <p>Decentralized Den Support Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html: htmlBody,
    });

    await logEmailToDb(
      recipientEmail,
      subject,
      'payment_failed',
      { bookingId, reason, resendId: response.data?.id }
    );

    return true;
  } catch (error: any) {
    console.error('[EmailLib] Failed to send payment failed email:', error);
    return false;
  }
}