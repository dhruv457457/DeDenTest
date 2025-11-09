// File: scripts/check-bookings.ts
// Quick script to verify database data
// Run with: npx tsx scripts/check-bookings.ts

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkBookings() {
  console.log('🔍 Checking database...\n');

  try {
    // Check for the specific wallet
    const targetWallet = '0xe97827879D49444ebb50A008AEC4Bc81c13Eff6f';
    
    console.log('Looking for wallet:', targetWallet);
    console.log('Also checking lowercase:', targetWallet.toLowerCase());
    
    // Check user
    const user = await db.user.findUnique({
      where: { walletAddress: targetWallet.toLowerCase() },
    });

    if (!user) {
      console.log('❌ User not found\n');
      
      // Check if any users exist
      const allUsers = await db.user.findMany({ take: 5 });
      console.log(`Found ${allUsers.length} users in database:`);
      allUsers.forEach(u => {
        console.log(`  - ${u.walletAddress} | ${u.displayName}`);
      });
      return;
    }

    console.log('✅ User found!');
    console.log('   ID:', user.id);
    console.log('   ID type:', typeof user.id);
    console.log('   Name:', user.displayName);
    console.log('   Email:', user.email);
    console.log('');

    // Check bookings directly
    console.log('Searching for bookings with userId:', user.id);
    
    let bookings;
    try {
      bookings = await db.booking.findMany({
        where: { userId: user.id },
        include: {
          stay: {
            select: {
              stayId: true,
              title: true,
            },
          },
        },
      });
    } catch (bookingError) {
      console.error('❌ Error fetching bookings:', bookingError);
      bookings = [];
    }

    console.log(`Found ${bookings.length} bookings\n`);

    if (bookings.length === 0) {
      // Check all bookings
      console.log('⚠️ No bookings found for this user. Checking all bookings...\n');
      const allBookings = await db.booking.findMany({
        take: 10,
        include: {
          stay: { select: { title: true } },
        },
      });

      console.log(`Total bookings in database: ${allBookings.length}`);
      allBookings.forEach(b => {
        console.log(`\n📋 Booking: ${b.bookingId}`);
        console.log(`   User ID: ${b.userId}`);
        console.log(`   Stay: ${b.stay.title}`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Matches target: ${b.userId === user.id ? '✅ YES' : '❌ NO'}`);
        console.log(`   String match: ${b.userId.toString() === user.id.toString() ? '✅ YES' : '❌ NO'}`);
      });
    } else {
      bookings.forEach(b => {
        console.log(`📋 Booking: ${b.bookingId}`);
        console.log(`   Stay: ${b.stay.title} (${b.stay.stayId})`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Guest: ${b.guestName}`);
        console.log(`   Created: ${b.createdAt.toISOString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkBookings();