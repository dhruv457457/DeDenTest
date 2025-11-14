// File: app/api/bookings/lock-payment/route.ts (CORRECTED with Base Unit Calculation)

import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { BookingStatus } from '@prisma/client';
import { parseUnits } from 'viem'; // Import viem's utility for base unit calculation
import { chainConfig } from '@/lib/config'; // Import config to get decimals

/**
 * POST /api/bookings/lock-payment
 * * Locks the user's chosen payment details (Token, Amount, Chain) 
 * to the booking record immediately before they execute the on-chain transaction.
 * * Body: { bookingId: string, paymentToken: "USDC" | "USDT", paymentAmount: number, chainId: number }
 */
export async function POST(request: Request) {
  try {
    // 1. Read the request body
    const body = await request.json();
    const { bookingId, paymentToken, paymentAmount, chainId } = body;

    console.log('[API/LockPayment] Request to lock payment details:', { bookingId, paymentToken, paymentAmount, chainId });

    // 2. Basic Validation (Kept as is)
    if (!bookingId || !paymentToken || paymentAmount === undefined || !chainId) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, paymentToken, paymentAmount, chainId' },
        { status: 400 }
      );
    }

    if (paymentToken !== 'USDC' && paymentToken !== 'USDT') {
      return NextResponse.json(
        { error: 'Invalid paymentToken. Must be USDC or USDT.' },
        { status: 400 }
      );
    }
    
    if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid paymentAmount.' },
        { status: 400 }
      );
    }
    
    // --- 🔑 CRITICAL CALCULATION ---
    const chain = chainConfig[chainId];
    if (!chain) {
        return NextResponse.json(
            { error: `Unsupported chain ID: ${chainId}` },
            { status: 400 }
        );
    }
    
    const tokenInfo = chain.tokens[paymentToken];
    if (!tokenInfo) {
        return NextResponse.json(
            { error: `Token ${paymentToken} not supported on chain ${chain.name}` },
            { status: 400 }
        );
    }

    // ✅ Convert human amount (0.01) to base units (e.g., 10000)
    const amountBaseUnits = parseUnits(
        paymentAmount.toString(),
        tokenInfo.decimals
    ).toString(); // Save as string to avoid floating point issues in DB
    
    console.log(`[API/LockPayment] Calculated Base Units: ${amountBaseUnits} for ${paymentAmount} ${paymentToken}`);
    // --- END CRITICAL CALCULATION ---


    // 3. Find and check the booking status
    const booking = await db.booking.findUnique({
      where: { bookingId },
      select: {
        id: true,
        status: true,
        paymentToken: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 4. Check if the booking is in a lockable state (e.g., PENDING)
    if (booking.status !== BookingStatus.PENDING) {
      return NextResponse.json(
        { 
          error: `Cannot lock payment. Booking status is: ${booking.status}`,
          currentStatus: booking.status 
        },
        { status: 409 } // Conflict
      );
    }

    // 5. Check if payment is already locked (optional check for redundant requests)
    if (booking.paymentToken && booking.paymentToken === paymentToken) {
        console.log('[API/LockPayment] Details already locked, returning success.');
        return NextResponse.json({ success: true, message: 'Payment details already locked' });
    }


    // 6. Lock the payment details in the database
    const updatedBooking = await db.booking.update({
      where: { id: booking.id },
      data: {
        paymentToken: paymentToken,
        paymentAmount: paymentAmount, // Store the human-readable amount (0.01)
        amountBaseUnits: amountBaseUnits, // ✅ CRITICAL: Store the base units (e.g., 10000)
        chainId: chainId,
        // Optional: Reset txHash and confirmedAt if re-locking a failed payment
        txHash: null,
        confirmedAt: null,
      },
      select: { bookingId: true, paymentToken: true, paymentAmount: true, chainId: true }
    });
    
    console.log('[API/LockPayment] Successfully locked booking details:', updatedBooking);

    // 7. Log activity (Kept as is)
    await db.activityLog.create({
      data: {
        bookingId: booking.id,
        action: 'payment_details_locked',
        entity: 'booking',
        entityId: booking.id,
        details: {
          token: paymentToken,
          amount: paymentAmount,
          amountBaseUnits: amountBaseUnits, // Log base units too
          chainId: chainId,
        },
      },
    });

    // 8. Return success
    return NextResponse.json({ 
      success: true, 
      message: 'Payment details locked successfully',
      lockedDetails: updatedBooking
    });

  } catch (error) {
    console.error('[API/LockPayment] Error locking payment details:', error);
    // Handle Prisma validation errors specifically
    if ((error as any).code === 'P2025') { 
        return NextResponse.json(
            { error: 'Booking record not found during update' },
            { status: 404 }
        );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}