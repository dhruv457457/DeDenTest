// File: app/api/test-query/route.ts
// Temporary test endpoint to diagnose the ObjectId issue

import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const walletAddress = '0xe97827879D49444ebb50A008AEC4Bc81c13Eff6f';
    
    // Find the user
    const user = await db.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User found:', {
      id: user.id,
      idType: typeof user.id,
      idConstructor: user.id.constructor.name,
      displayName: user.displayName,
    });

    // Try different ways to query bookings
    
    // Method 1: Direct query with user.id
    const bookings1 = await db.booking.findMany({
      where: { userId: user.id },
      include: { stay: { select: { title: true } } },
    });

    // Method 2: Get ALL bookings and filter manually
    const allBookings = await db.booking.findMany({
      include: { 
        user: { select: { id: true, walletAddress: true, displayName: true } },
        stay: { select: { title: true } },
      },
    });

    // Method 3: Try with string conversion
    const userIdString = String(user.id);
    const bookings3 = await db.booking.findMany({
      where: { userId: userIdString as any },
      include: { stay: { select: { title: true } } },
    });

    const results = {
      user: {
        id: user.id,
        idType: typeof user.id,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
      },
      method1_directQuery: {
        count: bookings1.length,
        bookings: bookings1.map(b => ({
          bookingId: b.bookingId,
          userId: b.userId,
          status: b.status,
        })),
      },
      method2_allBookings: {
        total: allBookings.length,
        matchingBookings: allBookings.filter(b => b.userId === user.id).map(b => ({
          bookingId: b.bookingId,
          userId: b.userId,
          userIdType: typeof b.userId,
          userName: b.user.displayName,
          matches: b.userId === user.id,
          stringMatch: String(b.userId) === String(user.id),
        })),
        sampleBooking: allBookings[0] ? {
          bookingId: allBookings[0].bookingId,
          userId: allBookings[0].userId,
          userIdType: typeof allBookings[0].userId,
          userIdConstructor: allBookings[0].userId.constructor.name,
          userName: allBookings[0].user.displayName,
          userWallet: allBookings[0].user.walletAddress,
        } : null,
      },
      method3_stringConversion: {
        count: bookings3.length,
        bookings: bookings3.map(b => ({
          bookingId: b.bookingId,
          status: b.status,
        })),
      },
      comparison: {
        userIdString: String(user.id),
        sampleBookingUserId: allBookings[0] ? String(allBookings[0].userId) : null,
        areEqual: allBookings[0] ? String(user.id) === String(allBookings[0].userId) : null,
      },
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}