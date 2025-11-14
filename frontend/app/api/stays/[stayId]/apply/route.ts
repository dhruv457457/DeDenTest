// File: app/api/stays/[stayId]/apply/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { BookingStatus } from '@prisma/client'; 
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

/**
 * Apply for a stay (join waitlist) - WITH ROOM PRICING
 * POST /api/stays/[stayId]/apply
 */
export async function POST(
	request: Request,
	context: { params: Promise<{ stayId: string }> }
) {
	try {
		// 1. --- Get Authenticated Session ---
		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.id) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}
		const userId = session.user.id;

		const { stayId } = await context.params;
		
		const body = await request.json();

		const {
			walletAddress,
			email,
			displayName,
			firstName,
			lastName,
			role,
			gender,
			age,
			mobileNumber,
			selectedRoomId,
			socialTwitter,
			socialTelegram,
			socialLinkedin,
		} = body;

		// 2. --- Validation ---
		if (!stayId || stayId === 'undefined') {
			return NextResponse.json(
				{ error: 'A valid stayId is required in the URL' },
				{ status: 400 }
			);
		}

		if (!walletAddress || !gender || !age || !mobileNumber || !email || !displayName) {
			return NextResponse.json(
				{ error: 'Missing required fields: walletAddress, email, displayName, gender, age, mobileNumber' },
				{ status: 400 }
			);
		}

		if (age < 18) {
			return NextResponse.json(
				{ error: 'You must be at least 18 years old to apply' },
				{ status: 400 }
			);
		}

		// 3. --- Find the Stay ---
		const stay = await db.stay.findUnique({
			where: { stayId: stayId },
		});

		if (!stay) {
			return NextResponse.json(
				{ error: `Stay with ID '${stayId}' not found` },
				{ status: 404 }
			);
		}

		if (!stay.allowWaitlist) {
			return NextResponse.json(
				{ error: 'This stay is not accepting applications' },
				{ status: 400 }
			);
		}

		// ============================================
		// 4. --- FIND SELECTED ROOM & GET BOTH PRICES ---
		// ============================================
		let roomPriceUSDC: number | null = null;
		let roomPriceUSDT: number | null = null;
		let roomName: string | null = null;

		if (selectedRoomId) {
			const rooms = (stay.rooms as any[]) || [];
			const selectedRoom = rooms.find((r: any) => r.id === selectedRoomId);
			
			if (selectedRoom) {
				// ✅ Use the dual price fields, falling back to stay price if not set on room
				roomPriceUSDC = selectedRoom.priceUSDC || stay.priceUSDC;
				roomPriceUSDT = selectedRoom.priceUSDT || stay.priceUSDT;
				roomName = selectedRoom.name;
			}
		}

		// 5. --- Get & Update Authenticated User ---
		const emailConflict = await db.user.findFirst({
			where: {
				email: email,
				id: { not: userId },
			},
		});

		if (emailConflict) {
			return NextResponse.json(
				{ error: 'This email is already registered with another account.' },
				{ status: 409 }
			);
		}

		// Update the user's profile with the form data
		const user = await db.user.update({
			where: { id: userId },
			data: {
				displayName: displayName,
				email: email,
				firstName: firstName,
				lastName: lastName,
				role: role,
				gender: gender,
				age: age,
				mobileNumber: mobileNumber,
				socialTwitter: socialTwitter,
				socialTelegram: socialTelegram,
				socialLinkedin: socialLinkedin,
				walletAddress: walletAddress,
			},
		});
		
		
		// 6. --- Check for ANY Existing Booking (CRITICAL FIX) ---
		const existingBooking = await db.booking.findFirst({
			where: {
				userId: user.id, // Use the trusted userId from the session/update
				stayId: stay.id,
			},
			select: {
				id: true,
				bookingId: true,
				status: true
			}
		});

		if (existingBooking) {
			
			// Define all non-active, terminal statuses
			const isTerminalStatus = 
				existingBooking.status === BookingStatus.FAILED ||
				existingBooking.status === BookingStatus.EXPIRED ||
				existingBooking.status === BookingStatus.CANCELLED ||
				existingBooking.status === BookingStatus.REFUNDED;

			if (isTerminalStatus) {
				// ✅ FIX: Update the old booking to WAITLISTED instead of failing the constraint
				const updatedBooking = await db.booking.update({
					where: { id: existingBooking.id },
					data: {
						status: BookingStatus.WAITLISTED,
						// Update new details from the application form
						preferredRoomId: selectedRoomId || null,
						selectedRoomId: selectedRoomId || null,
						// ✅ Store both prices
						selectedRoomPriceUSDC: roomPriceUSDC,  
						selectedRoomPriceUSDT: roomPriceUSDT,  
						// ❌ Remove old single price field
						// selectedRoomPrice: roomPrice, // DELETE or ensure schema is updated
						selectedRoomName: roomName,
						guestName: user.displayName,
						guestEmail: user.email,
						guestGender: gender,
						guestAge: age,
						guestMobile: mobileNumber,
						// Clear all payment fields for a fresh payment flow
						paymentToken: null,
						paymentAmount: null,
						txHash: null,
						chainId: null,
						expiresAt: null,
						confirmedAt: null,
					}
				});
				
				// Return success response based on the updated booking
				return NextResponse.json(
					{
						success: true,
						message: 'Application re-submitted successfully. Check your dashboard for status updates.',
						booking: {
							bookingId: updatedBooking.bookingId,
							status: updatedBooking.status,
							stayTitle: stay.title,
							selectedRoomName: roomName,
							// Return one or both prices for the confirmation message
							selectedRoomPrice: roomPriceUSDC, // For display in old format if needed
							selectedRoomPriceUSDC: roomPriceUSDC,
							selectedRoomPriceUSDT: roomPriceUSDT,
						},
					},
					{ status: 201 }
				);

			} else {
				// If the status is PENDING, CONFIRMED, or WAITLISTED, block the application
				return NextResponse.json(
					{
						error: `You have an active application for this stay. Status: ${existingBooking.status}. Check your dashboard for details.`,
						bookingId: existingBooking.bookingId,
						status: existingBooking.status,
					},
					{ status: 409 }
				);
			}
		}


		// 7. --- Create WAITLISTED Booking (If NO previous booking was found) ---
		const randomId = `${stayId}-${Date.now()}`;

		const newBooking = await db.booking.create({
			data: {
				bookingId: randomId,
				status: BookingStatus.WAITLISTED,
				userId: user.id,
				stayId: stay.id,
				guestName: user.displayName,
				guestEmail: user.email,
				guestGender: gender,
				guestAge: age,
				guestMobile: mobileNumber,
				preferredRoomId: selectedRoomId || null,
				selectedRoomId: selectedRoomId || null,
				// ✅ Store both prices
				selectedRoomPriceUSDC: roomPriceUSDC, 
				selectedRoomPriceUSDT: roomPriceUSDT, 
				// ❌ Remove old single price field
				// selectedRoomPrice: roomPrice, // DELETE or ensure schema is updated
				selectedRoomName: roomName,
				guestCount: 1,
				optInGuestList: false,
				shareContactInfo: false, 
				contentReuseConsent: false, 
				needsTravelHelp: false, 
			},
		});

		// 8. --- Log Activity ---
		await db.activityLog.create({
			data: {
				userId: user.id,
				bookingId: newBooking.id,
				action: 'application_submitted',
				entity: 'booking',
				entityId: newBooking.id,
				details: {
					stayId: stay.stayId,
					email: user.email,
					walletAddress: walletAddress,
					gender: gender,
					age: age,
					mobileNumber: mobileNumber,
					selectedRoomId: selectedRoomId,
					selectedRoomName: roomName,
					// ✅ Log both prices
					selectedRoomPriceUSDC: roomPriceUSDC,
					selectedRoomPriceUSDT: roomPriceUSDT,
					// selectedRoomPrice: roomPrice, // DELETE or ensure schema is updated
				},
			},
		});

		// 9. --- Return Success ---
		return NextResponse.json(
			{
				success: true,
				message: 'Application submitted successfully. Check your dashboard for status updates.',
				booking: {
					bookingId: newBooking.bookingId,
					status: newBooking.status,
					stayTitle: stay.title,
					selectedRoomName: roomName,
					// Return one or both prices for the confirmation message
					selectedRoomPrice: roomPriceUSDC, // Use USDC as the main price for old consumers
					selectedRoomPriceUSDC: roomPriceUSDC,
					selectedRoomPriceUSDT: roomPriceUSDT,
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		
		if ((error as any).name === 'PrismaClientValidationError') {
			return NextResponse.json(
				{ error: 'Invalid data provided to database' },
				{ status: 400 }
			);
		}

		if ((error as any).code === 'P2002') {
			const meta = (error as any).meta;
			if (meta?.target?.includes('email')) {
				return NextResponse.json(
					{ error: 'This email is already registered. Please use a different email or sign in.' },
					{ status: 409 }
				);
			}
			return NextResponse.json(
				{ error: 'You have already applied for this stay' },
				{ status: 409 }
			);
		}

		return NextResponse.json(
			{ error: 'Internal server error', details: (error as Error).message },
			{ status: 500 }
		);
	}
}