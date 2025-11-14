"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApproveButtonProps {
  bookingId: string;
  onApproved?: () => void;
}

export function ApproveWaitlistButton({ bookingId, onApproved }: ApproveButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!confirm('Approve this application and send payment request?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // REMOVED: paymentToken - let user choose during payment
          sessionExpiryMinutes: 60 * 24, // 24 hours to pay
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve');
      }

      // Check if the API reported an email failure
      if (data.emailSent === false) {
        alert(
          `⚠️ Booking Approved, BUT Email FAILED!\n\n` +
          `The booking was approved, but the email to the user failed to send.\n\n` +
          `Error: ${data.emailError || 'Unknown error. Check server logs.'}\n\n` +
          `You may need to contact them manually.\n\n` +
          `Payment link: ${window.location.origin}${data.booking.paymentLink}`
        );
      } else {
        // This is the true success case
        alert(
          `✅ Application approved!\n\n` +
          `Payment link: ${window.location.origin}${data.booking.paymentLink}\n\n` +
          `User will receive an email notification.\n\n` +
          `They can choose between USDC/USDT when paying.`
        );
      }

      onApproved?.();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      alert(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleApprove}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          backgroundColor: isLoading ? '#ccc' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontSize: '0.9rem',
        }}
      >
        {isLoading ? 'Approving...' : '✓ Approve'}
      </button>
      {error && <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

// Batch approve component for admin dashboard
export function BatchApproveWaitlist({ bookingIds }: { bookingIds: string[] }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBatchApprove = async () => {
    if (!confirm(`Approve ${bookingIds.length} applications?`)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/bookings/approve-batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIds,
          // REMOVED: paymentToken - let users choose during payment
          sessionExpiryMinutes: 60 * 24, // 24 hours
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Batch approval failed');
      }
      
      const approvedCount = data.results?.approved?.length || 0;
      const failedCount = data.results?.failed?.length || 0;
      let alertMessage = `✅ Batch complete!\n\n${approvedCount} approved.\n${failedCount} failed.`;

      // Check if any of the "successful" ones had email errors
      const emailErrors = data.results?.failed?.filter((f: any) => f.error?.includes('email failed')) || [];
      if (emailErrors.length > 0) {
        alertMessage += `\n\n⚠️ ${emailErrors.length} booking(s) were approved, but their emails FAILED to send. Check server logs.`;
      }
      
      alert(alertMessage);

      window.location.reload();
    } catch (err) {
      alert(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (bookingIds.length === 0) return null;

  return (
    <button
      onClick={handleBatchApprove}
      disabled={isLoading}
      style={{
        padding: '10px 20px',
        backgroundColor: isLoading ? '#ccc' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontWeight: '600',
        fontSize: '1rem',
      }}
    >
      {isLoading ? 'Processing...' : `✓ Approve ${bookingIds.length} Selected`}
    </button>
  );
}