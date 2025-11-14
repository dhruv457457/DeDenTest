import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyPayment, checkTransactionUsed } from '@/lib/verification';
import { BookingStatus } from '@prisma/client';

/**
 * Updated API to submit payment for a booking with replay protection
 * POST /api/payments/submit-payment
 * * Body: { bookingId: string, txHash: string, chainId: number, paymentToken: string }
 * * This is called from the frontend AFTER the user has sent their transaction
 */
export async function POST(request: Request) {
  try {
    // 1. Read the request body
    const body = await request.json();
    const { bookingId, txHash, chainId, paymentToken } = body;

    console.log('[API] Payment submission received:', { bookingId, txHash, chainId, paymentToken });

    // 2. Basic Validation
    if (!bookingId || !txHash || !chainId || !paymentToken) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, txHash, chainId, paymentToken' },
        { status: 400 }
      );
    }

    // 2.5. Validate txHash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    // 3. 🔒 SECURITY: Check if this transaction hash has already been used
    const isUsed = await checkTransactionUsed(txHash);
    if (isUsed) {
      console.warn(`[API] Transaction replay attempt detected: ${txHash}`);
      return NextResponse.json(
        { 
          error: 'This transaction has already been used for another booking',
          code: 'TRANSACTION_ALREADY_USED'
        },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. Find the booking in the database
    const booking = await db.booking.findUnique({
      where: { bookingId },
      select: {
        id: true,
        bookingId: true,
        status: true,
        paymentToken: true,
        paymentAmount: true,
        expiresAt: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 5. Check if booking is in PENDING status
    if (booking.status !== BookingStatus.PENDING) {
      return NextResponse.json(
        { 
          error: `Cannot submit payment. Booking status is: ${booking.status}`,
          currentStatus: booking.status 
        },
        { status: 409 } // 409 Conflict
      );
    }
    
    // 6. Check if payment details are set (REQUIRED after successful lock-payment call)
    if (!booking.paymentToken || !booking.paymentAmount) {
        console.error('[API] Booking not configured for payment (lock-payment not called or failed).');
        return NextResponse.json(
            { error: 'Payment details were not locked. Please retry or contact support.' },
            { status: 400 }
        );
    }
    
    // NOTE: The token mismatch check is removed here, as the lock-payment API
    // guarantees that booking.paymentToken matches the token the user intended to pay with.
    // The verifyPayment function will now strictly check against booking.paymentToken and booking.paymentAmount.

    // 7. Save the txHash to the booking immediately
    await db.booking.update({
      where: { bookingId },
      data: {
        txHash: txHash,
        chainId: chainId,
      },
    });

    // 8. Create activity log
    await db.activityLog.create({
      data: {
        bookingId: booking.id,
        action: 'payment_submitted',
        entity: 'booking',
        entityId: booking.id,
        details: {
          txHash,
          chainId,
          token: booking.paymentToken, // Use the locked token from the DB
          amount: booking.paymentAmount, // Use the locked amount from the DB
        },
      },
    });

    console.log('[API] Payment submission saved. Starting background verification...');

    // 9. --- "Fire-and-Forget" ---
    // Call verifyPayment but do NOT 'await' it. With retries for timing issues.
    verifyPayment(bookingId, txHash, chainId, 10, 3000).catch((error) => {
      // Log errors but don't block the response
      console.error('[API] Background verification error:', error);
    });

    // 10. --- Respond Immediately ---
    return NextResponse.json({
      success: true,
      bookingId: booking.bookingId,
      status: 'verifying',
      message: 'Transaction submitted for verification',
    });

  } catch (error) {
    console.error('[API] Error submitting payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}