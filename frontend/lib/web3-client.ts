// File: lib/web3-client.ts
// Provides blockchain clients for transaction verification

import { createPublicClient, http, PublicClient } from 'viem';
import { arbitrum, bsc, base } from 'viem/chains';

// Get RPC URLs from environment variables
const getRpcUrl = (chainId: number): string | undefined => {
  switch (chainId) {
    case 42161: // Arbitrum
      return process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM
        ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM}`
        : undefined;
    
    case 56: // BSC
      return process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BNB
        ? `https://bnb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BNB}`
        : 'https://bsc-dataseed.binance.org'; // Public RPC as fallback
    
    case 8453: // Base
      return process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BASE
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BASE}`
        : undefined;
    
    default:
      console.warn(`No RPC URL configured for chain ${chainId}`);
      return undefined;
  }
};

// Create public clients for each chain
const clients: Record<number, PublicClient | null> = {};

// Initialize Arbitrum client
const arbitrumRpc = getRpcUrl(42161);
if (arbitrumRpc) {
  clients[42161] = createPublicClient({
    chain: arbitrum,
    transport: http(arbitrumRpc),
  });
}

// Initialize BSC client
const bscRpc = getRpcUrl(56);
if (bscRpc) {
  clients[56] = createPublicClient({
    chain: bsc,
    transport: http(bscRpc),
  });
}

// Initialize Base client (with type assertion to fix viem/Base TS mismatch)
const baseRpc = getRpcUrl(8453);
if (baseRpc) {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(baseRpc),
  });
  // Cast to generic PublicClient to resolve OP Stack type conflicts (e.g., 'deposit' tx types)
  clients[8453] = baseClient as PublicClient;
}

/**
 * Get public client for a specific chain
 * @param chainId - The chain ID to get client for
 * @returns PublicClient or null if not configured
 */
export function getPublicClient(chainId: number): PublicClient | null {
  const client = clients[chainId];
  
  if (!client) {
    console.error(`No public client configured for chain ${chainId}`);
    return null;
  }
  
  return client;
}

/**
 * Get all configured chain IDs
 * @returns Array of chain IDs that have clients configured
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(clients)
    .map(Number)
    .filter(chainId => clients[chainId] !== null);
}

/**
 * Check if a chain is supported
 * @param chainId - The chain ID to check
 * @returns true if the chain has a client configured
 */
export function isChainSupported(chainId: number): boolean {
  return clients[chainId] !== null;
}

// Export clients for direct use if needed
export { clients };