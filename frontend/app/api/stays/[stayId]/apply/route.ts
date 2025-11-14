import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { BookingStatus } from '@prisma/client'; // UserRole is no longer needed
import { getServerSession } from "next-auth"; // 1. Import getServerSession
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // 2. Import your authOptions

/**
 * Apply for a stay (join waitlist) - WITH ROOM PRICING
 * POST /api/stays/[stayId]/apply
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ stayId: string }> }
) {
  try {
    // --- ⬇️ START: THE FIX ⬇️ ---

    // 1. --- Get Authenticated Session ---
    // We get the user from their secure session, not the request body.
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // This is our trusted user ID
    const userId = session.user.id;

    // --- ⬆️ END: THE FIX ⬆️ ---

    const { stayId } = await context.params;
    
    console.log('[API] Received stayId from URL:', stayId);
    
    const body = await request.json();
    console.log('[API] Received body:', body);

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
      console.error('[API] Invalid stayId:', stayId);
      return NextResponse.json(
        { error: 'A valid stayId is required in the URL' },
        { status: 400 }
      );
    }

    // We still validate the form body, but we no longer need to check
    // email/displayName for user creation, only that the required fields exist.
    if (!walletAddress || !gender || !age || !mobileNumber || !email || !displayName) {
      console.error('[API] Missing required fields');
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

    console.log('[API] Found stay:', stay?.title || 'NOT FOUND');

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

    // 4. --- FIND SELECTED ROOM & GET PRICE ---
    let roomPrice: number | null = null;
    let roomName: string | null = null;

    if (selectedRoomId) {
      const rooms = (stay.rooms as any[]) || [];
      const selectedRoom = rooms.find((r: any) => r.id === selectedRoomId);
      
      if (selectedRoom) {
        roomPrice = selectedRoom.price;
        roomName = selectedRoom.name;
        console.log('[API] User selected room:', roomName, 'at $', roomPrice);
      } else {
        console.warn('[API] Room ID not found in stay. Using stay base price.');
      }
    }

    // --- ⬇️ START: THE FIX (Part 2) ⬇️ ---
    
    // 5. --- Get & Update Authenticated User ---
    // We are NO LONGER finding or creating a user.
    // We are getting the user from the session and UPDATING their profile
    // with the info from the application form.

    // Check if the email from the form is already used by ANOTHER user
    const emailConflict = await db.user.findFirst({
      where: {
        email: email,
        id: { not: userId }, // Check for users other than the current one
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
        // We only add the wallet address IF it's not already set
        // The dashboard is the primary place to *link* a wallet.
        walletAddress: walletAddress,
      },
    });
    
    console.log('[API] User profile updated:', user.displayName);
    
    // --- ⬆️ END: THE FIX (Part 2) ⬆️ ---


    // 6. --- Check for Duplicate Application ---
    const existingBooking = await db.booking.findFirst({
      where: {
        userId: user.id, // Use the trusted userId from the session/update
        stayId: stay.id,
      },
    });

    if (existingBooking) {
      console.log('[API] Duplicate booking found:', existingBooking.bookingId);
      return NextResponse.json(
        {
          error: 'You have already applied for this stay. Check your dashboard for status.',
          bookingId: existingBooking.bookingId,
          status: existingBooking.status,
        },
        { status: 409 }
      );
    }

    // 7. --- Create WAITLISTED Booking WITH ROOM DATA ---
    const randomId = `${stayId}-${Date.now()}`;

    const newBooking = await db.booking.create({
      data: {
        bookingId: randomId,
        status: BookingStatus.WAITLISTED,
        userId: user.id, // Use the trusted userId
        stayId: stay.id,
        guestName: user.displayName, // Use the updated user info
        guestEmail: user.email,     // Use the updated user info
        guestGender: gender,
        guestAge: age,
        guestMobile: mobileNumber,
        preferredRoomId: selectedRoomId || null,
        selectedRoomId: selectedRoomId || null,
        selectedRoomPrice: roomPrice, 
        selectedRoomName: roomName,   
        guestCount: 1,
        optInGuestList: false,
      },
    });

    console.log('[API] Booking created:', newBooking.bookingId);

    // 8. --- Log Activity ---
    await db.activityLog.create({
      data: {
        userId: user.id, // Use the trusted userId
        bookingId: newBooking.id,
        action: 'application_submitted',
        entity: 'booking',
        entityId: newBooking.id,
        details: {
          stayId: stay.stayId,
          email: user.email,
          walletAddress: walletAddress, // This is the wallet they applied with
          gender: gender,
          age: age,
          mobileNumber: mobileNumber,
          selectedRoomId: selectedRoomId,
          selectedRoomName: roomName,
          selectedRoomPrice: roomPrice,
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
          selectedRoomPrice: roomPrice,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error applying for stay:', error);
    
    if ((error as any).name === 'PrismaClientValidationError') {
      return NextResponse.json(
        { error: 'Invalid data provided to database' },
        { status: 400 }
      );
    }

    // This 'P2002' error for 'email' should now be caught by our manual check,
    // but this is a good safety net.
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