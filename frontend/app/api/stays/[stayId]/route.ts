// File: app/api/stays/[stayId]/route.ts
// ✅ FIXED: Returns ALL fields needed for the apply page

import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * GET /api/stays/[stayId]
 * Fetches public details for a single stay,
 * including dates, duration, prices, and room options for the apply page.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ stayId: string }> } 
) {
  try {
    const { stayId } = await context.params; 

    if (!stayId) {
      return NextResponse.json(
        { error: 'Stay ID not provided' },
        { status: 400 }
      );
    }

    const stay = await db.stay.findUnique({
      where: { stayId: stayId },
      select: {
        // ✅ Basic Info
        stayId: true,
        title: true,
        location: true,
        description: true,
        
        // ✅ CRITICAL: Date & Duration fields for the apply form
        startDate: true,
        endDate: true,
        duration: true,
        
        // ✅ Pricing (defaults if no room selected)
        priceUSDC: true,
        priceUSDT: true,
        
        // ✅ Room options with their prices
        rooms: true,
        
        // ✅ Additional useful fields
        slotsTotal: true,
        slotsAvailable: true,
        allowWaitlist: true,
        images: true,
        amenities: true,
        highlights: true,
      },
    });

    if (!stay) {
      return NextResponse.json(
        { error: 'Stay not found' },
        { status: 404 }
      );
    }

    // ✅ Convert dates to ISO strings for JSON serialization
    const stayWithFormattedDates = {
      ...stay,
      startDate: stay.startDate.toISOString(),
      endDate: stay.endDate.toISOString(),
    };

    return NextResponse.json(stayWithFormattedDates);

  } catch (error) {
    console.error('[API] Error fetching stay details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}