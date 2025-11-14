// File: lib/verification.ts (FINAL VERSION - Room Prices Only)
// This verification logic ONLY uses room prices for payment validation

import { db } from '@/lib/database';
import { BookingStatus } from '@prisma/client';
import { getPublicClient } from './web3-client';
import { chainConfig, treasuryAddress } from './config';
import { parseAbiItem } from 'viem';

/**
 * Check if a transaction hash has already been used
 */
export async function checkTransactionUsed(txHash: string): Promise<boolean> {
  const existingBooking = await db.booking.findFirst({
    where: {
      txHash: txHash,
      status: BookingStatus.CONFIRMED,
    },
  });
  
  return !!existingBooking;
}

/**
 * Verify a payment transaction on the blockchain with retries
 * CRITICAL: Only uses room prices - NO fallback to stay prices
 */
export async function verifyPayment(
  bookingId: string,
  txHash: string,
  chainId: number,
  maxRetries: number = 10,  // ~30s total with 3s intervals
  retryDelayMs: number = 3000
): Promise<void> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`[Verification] Starting verification for booking ${bookingId} (attempt ${retryCount + 1}/${maxRetries})`);
      
      // 1. Get the booking details including room prices
      const booking = await db.booking.findUnique({
        where: { bookingId },
        include: { 
          user: true,
          // We don't need stay prices anymore
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status === BookingStatus.CONFIRMED) {
        console.log('[Verification] Booking already confirmed, skipping');
        return;
      }

      // 2. Check payment details are locked
      if (!booking.paymentToken || !booking.paymentAmount) {
        console.error('[Verification] Payment details not locked');
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: 'Payment details not locked',
        });
        return;
      }

      // 3. CRITICAL: Verify room prices exist
      if (!booking.selectedRoomPriceUSDC || !booking.selectedRoomPriceUSDT) {
        console.error('[Verification] Room prices not set on booking');
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: 'Room prices not configured. Please contact support.',
        });
        return;
      }

      // 4. Get the expected amount based on locked token and room price
      let expectedAmount: number;
      
      if (booking.paymentToken === 'USDC') {
        expectedAmount = booking.selectedRoomPriceUSDC;
      } else if (booking.paymentToken === 'USDT') {
        expectedAmount = booking.selectedRoomPriceUSDT;
      } else {
        throw new Error(`Invalid payment token: ${booking.paymentToken}`);
      }

      console.log(`[Verification] Expected amount: ${expectedAmount} ${booking.paymentToken}`);
      console.log(`[Verification] Locked amount in DB: ${booking.paymentAmount}`);
      
      // Verify the locked amount matches the expected room price
      if (Math.abs(booking.paymentAmount - expectedAmount) > 0.01) {
        console.error(`[Verification] Amount mismatch! Expected: ${expectedAmount}, Locked: ${booking.paymentAmount}`);
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: 'Payment amount mismatch',
          expected: expectedAmount,
          locked: booking.paymentAmount,
        });
        return;
      }

      // 5. Get blockchain client
      const publicClient = getPublicClient(chainId);
      if (!publicClient) {
        throw new Error(`No client configured for chain ${chainId}`);
      }

      // 6. Get transaction receipt
      console.log('[Verification] Fetching transaction receipt...');
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt) {
        console.log(`[Verification] Transaction not found yet (attempt ${retryCount + 1}), retrying in ${retryDelayMs}ms...`);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;  // Retry
        } else {
          console.error(`[Verification] Max retries exceeded for tx ${txHash}`);
          await updateBookingStatus(bookingId, BookingStatus.FAILED, {
            error: 'Transaction timeout - not mined after retries',
          });
          return;
        }
      }

      // DEBUG: Log raw receipt details to diagnose log filtering issues
      console.log('[Verification] DEBUG - Receipt status:', receipt.status);
      console.log('[Verification] DEBUG - Raw logs count:', receipt.logs.length);
      console.log('[Verification] DEBUG - Raw logs:', receipt.logs.map((log, index) => ({
        index,
        address: log.address,
        topics: log.topics,
        data: log.data,
      })));

      if (!receipt.status || receipt.status !== 'success') {
        console.error('[Verification] Transaction failed on-chain');
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: 'Transaction failed on blockchain',
        });
        return;
      }

      // 7. Get chain and token configuration
      const chain = chainConfig[chainId];
      if (!chain) {
        throw new Error(`Chain ${chainId} not configured`);
      }

      const tokenInfo = chain.tokens[booking.paymentToken];
      if (!tokenInfo) {
        throw new Error(`Token ${booking.paymentToken} not configured for chain ${chainId}`);
      }

      console.log(`[Verification] DEBUG - Token address (lowercase): ${tokenInfo.address.toLowerCase()}`);

      // 8. Parse transfer logs - HARDCODED TOPIC FIX
      // The parseAbiItem was returning undefined for .topic; use known ERC20 Transfer topic hash
      const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const;

      console.log(`[Verification] DEBUG - Expected Transfer topic: ${TRANSFER_TOPIC}`);

      const logs = receipt.logs.filter(
        (log) =>
          log.address.toLowerCase() === tokenInfo.address.toLowerCase() &&
          log.topics[0] === TRANSFER_TOPIC
      );

      console.log(`[Verification] Found ${logs.length} potential Transfer logs from ${tokenInfo.address}`);

      if (logs.length === 0) {
        // For debugging: Log all logs that match address but not topic
        const addressMatchLogs = receipt.logs.filter(log => log.address.toLowerCase() === tokenInfo.address.toLowerCase());
        console.log(`[Verification] DEBUG - Logs matching token address but not topic:`, addressMatchLogs.map((log, index) => ({
          index,
          topics: log.topics,
          data: log.data,
        })));
        
        console.error('[Verification] No transfer events found');
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: 'No transfer events in transaction',
        });
        return;
      }

      // 9. Verify transfer details
      let validTransferFound = false;
      
      for (const log of logs) {
        const toAddress = `0x${log.topics[2]?.slice(26)}`;
        
        console.log(`[Verification] Checking log: to=${toAddress}, treasury=${treasuryAddress}`);
        
        if (toAddress.toLowerCase() === treasuryAddress.toLowerCase()) {
          // Found transfer to treasury
          validTransferFound = true;
          
          // OPTIONAL ENHANCEMENT: Decode and verify the transferred amount from log.data
          // This adds extra security: ensure the on-chain amount matches expected
          const transferredValue = BigInt(log.data);
          const expectedBaseUnits = BigInt(Math.floor(expectedAmount * 10 ** tokenInfo.decimals));
          if (transferredValue !== expectedBaseUnits) {
            console.error(`[Verification] Transferred amount mismatch! On-chain: ${transferredValue} units, Expected: ${expectedBaseUnits} units`);
            await updateBookingStatus(bookingId, BookingStatus.FAILED, {
              error: 'Payment amount mismatch on blockchain',
              onChain: Number(transferredValue) / 10 ** tokenInfo.decimals,
              expected: expectedAmount,
            });
            return;
          }
          console.log(`[Verification] ✅ Transferred amount verified: ${expectedAmount} ${booking.paymentToken}`);
          
          // Get transaction details for gas calculation
          const tx = await publicClient.getTransaction({
            hash: txHash as `0x${string}`,
          });
          
          // Calculate gas fee in USD (rough estimate)
          // TODO: Use dynamic native token price (ETH/BNB) instead of hardcoded ETH price
          const gasUsed = receipt.gasUsed.toString();
          const gasPrice = tx.gasPrice || BigInt(0);
          const gasFeeWei = BigInt(gasUsed) * gasPrice;
          const gasFeeNative = Number(gasFeeWei) / 1e18;
          const nativePriceUsd = 600; // Rough BNB price; fetch dynamically in production (e.g., via API)
          const gasFeeUSD = gasFeeNative * nativePriceUsd;
          
          // Update booking to CONFIRMED
          await db.booking.update({
            where: { bookingId },
            data: {
              status: BookingStatus.CONFIRMED,
              confirmedAt: new Date(),
              blockNumber: Number(receipt.blockNumber),
              senderAddress: tx.from,
              receiverAddress: treasuryAddress,
              gasUsed: gasUsed,
              gasFeeUSD: gasFeeUSD,
              totalPaid: booking.paymentAmount, // Use the locked amount
            },
          });

          // Log activity
          await db.activityLog.create({
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              action: 'payment_confirmed',
              entity: 'booking',
              entityId: booking.id,
              details: {
                txHash,
                chainId,
                amount: booking.paymentAmount,
                token: booking.paymentToken,
                blockNumber: Number(receipt.blockNumber),
              },
            },
          });
          
          // Send confirmation email
          if (booking.user?.email) {
            try {
              // You can implement sendConfirmationEmail
              console.log(`[Verification] Would send confirmation email to ${booking.user.email}`);
            } catch (emailError) {
              console.error('[Verification] Failed to send confirmation email:', emailError);
            }
          }
          
          console.log(`[Verification] ✅ Payment confirmed for booking ${bookingId}`);
          return;  // Success - exit the loop and function
        }
      }

      if (!validTransferFound) {
        console.error('[Verification] No valid transfer to treasury found');
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: 'Transfer not sent to correct treasury address',
        });
        return;
      }

    } catch (error) {
      console.error(`[Verification] Error on attempt ${retryCount + 1}:`, error);
      retryCount++;
      if (retryCount >= maxRetries) {
        await updateBookingStatus(bookingId, BookingStatus.FAILED, {
          error: (error as Error).message,
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }
}

/**
 * Helper to update booking status
 */
async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  details?: any
): Promise<void> {
  await db.booking.update({
    where: { bookingId },
    data: { status },
  });
  
  const booking = await db.booking.findUnique({ where: { bookingId } });
  
  if (booking) {
    await db.activityLog.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        action: `payment_${status.toLowerCase()}`,
        entity: 'booking',
        entityId: booking.id,
        details,
      },
    });
  }
}