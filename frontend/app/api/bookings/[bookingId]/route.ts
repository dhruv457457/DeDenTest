// File: app/api/bookings/[bookingId]/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Assuming you have an authOptions path

/**
 * GET /api/bookings/[bookingId]
 * Fetches the details for a single booking, e.g., for the payment page.
 * This should be secured to only let the owner view it.
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ bookingId: string }> }
) {
	try {
		const { bookingId } = await params;

		// 1. --- AUTHENTICATION/AUTHORIZATION ---
		// TODO: Add authentication here to ensure the user owns this booking
		// Example check (if you implement the session access):
		/*
		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.id) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}
		*/

		if (!bookingId) {
			return NextResponse.json(
				{ error: 'Booking ID not provided' },
				{ status: 400 }
			);
		}

		// 2. --- FETCH BOOKING ---
		const booking = await db.booking.findUnique({
			where: { bookingId },
			select: {
				userId: true, // Used for authorization check
				bookingId: true,
				status: true,
				txHash: true,
				expiresAt: true,
				// ✅ Payment Details (locked after lock-payment call)
				paymentToken: true,
				paymentAmount: true,
				amountBaseUnits: true,
				chain: true,
				chainId: true,
				// ✅ NEW: Selected Room Prices (set during application/waitlist)
				selectedRoomPriceUSDC: true, // <-- ADDED
				selectedRoomPriceUSDT: true, // <-- ADDED
				stay: {
					select: {
						title: true,
						priceUSDC: true,
						priceUSDT: true,
					},
				},
			},
		});

		if (!booking) {
			return NextResponse.json(
				{ error: 'Booking not found' },
				{ status: 404 }
			);
		}
		
		// 3. --- AUTHORIZATION CHECK (Placeholder) ---
		// Example: Check if the session user ID matches the booking userId
		/*
		if (session.user.id !== booking.userId) {
			return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
		}
		*/

		// Remove userId before sending to client if not needed
		const { userId: _, ...safeBooking } = booking;


		return NextResponse.json(safeBooking);
	} catch (error) {
		console.error('[API] Error fetching booking details:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}