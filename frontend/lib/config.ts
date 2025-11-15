// lib/config.ts - Production Mainnet Configuration (Next.js 15 Compatible)

interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  tokens: {
    [symbol: string]: TokenConfig;
  };
}

// ✅ HARDCODED TREASURY ADDRESS
export const treasuryAddress = '0x317914bc4db3f61c0cba933a3e00d7a8bed124a5';

// ✅ Next.js 15 Compatible: Get environment variables safely
function getEnvVar(key: string): string {
  const value = process.env[key];
  
  // If value exists and is valid, return it
  if (value && value.trim() !== '' && value !== 'undefined') {
    return value.trim();
  }
  
  // Return placeholder for build phase - will be replaced at runtime
  return '__BUILD_TIME_PLACEHOLDER__';
}

// Get API keys (safe for build phase)
const arbitrumApiKey = getEnvVar('NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM');
const bnbApiKey = getEnvVar('NEXT_PUBLIC_ALCHEMY_API_KEY_BNB');
const baseApiKey = getEnvVar('NEXT_PUBLIC_ALCHEMY_API_KEY_BASE');

// Log status (only server-side)
if (typeof window === 'undefined') {
  const hasRealValues = !arbitrumApiKey.includes('PLACEHOLDER') && 
                        !arbitrumApiKey.includes('undefined') &&
                        arbitrumApiKey.length > 10;
  
  if (hasRealValues) {
    console.log('✅ Environment variables loaded successfully');
    console.log('   Treasury:', treasuryAddress);
    console.log('   Arbitrum API:', arbitrumApiKey.substring(0, 8) + '...');
    console.log('   BNB API:', bnbApiKey.substring(0, 8) + '...');
    console.log('   Base API:', baseApiKey.substring(0, 8) + '...');
  } else {
    console.log('⚠️  Build-time mode: Environment variables will load at runtime');
  }
}

// MAINNET CONFIGURATION
export const chainConfig: { [key: number]: ChainConfig } = {
  // Arbitrum One (Mainnet)
  42161: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${arbitrumApiKey}`,
    blockExplorer: "https://arbiscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    tokens: {
      USDC: {
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Native USDC
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin",
      },
      USDT: {
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD",
      },
    },
  },

  // BNB Smart Chain (Mainnet)
  56: {
    name: "BNB Smart Chain",
    chainId: 56,
    rpcUrl: `https://bnb-mainnet.g.alchemy.com/v2/${bnbApiKey}`,
    blockExplorer: "https://bscscan.com",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    tokens: {
      USDC: {
        address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        decimals: 18,
        symbol: "USDC",
        name: "USD Coin",
      },
      USDT: {
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
        symbol: "USDT",
        name: "Tether USD",
      },
    },
  },

  // Base (Mainnet) - USDC only
  8453: {
    name: "Base",
    chainId: 8453,
    rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${baseApiKey}`,
    blockExplorer: "https://basescan.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    tokens: {
      USDC: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin",
      },
    },
  },
};

// Helper function to get supported tokens for a chain
export function getSupportedTokens(chainId: number): string[] {
  const chain = chainConfig[chainId];
  return chain ? Object.keys(chain.tokens) : [];
}

// Helper function to validate chain and token
export function validateChainAndToken(
  chainId: number,
  token: string
): boolean {
  const chain = chainConfig[chainId];
  if (!chain) return false;
  return token in chain.tokens;
}

// Get chain name by ID
export function getChainName(chainId: number): string {
  return chainConfig[chainId]?.name || "Unknown Chain";
}

// Export list of supported chain IDs
export const SUPPORTED_CHAINS = Object.keys(chainConfig).map(Number);

// Validate configuration at module load time
function validateConfiguration(): void {
  const errors: string[] = [];
  
  // Validate treasury address format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(treasuryAddress)) {
    errors.push(`Invalid treasury address format: ${treasuryAddress}`);
  }
  
  // Check that we have at least one chain configured
  if (SUPPORTED_CHAINS.length === 0) {
    errors.push("No chains configured");
  }
  
  // Validate each chain configuration
  SUPPORTED_CHAINS.forEach((chainId) => {
    const chain = chainConfig[chainId];
    
    // Skip RPC validation if using placeholder (during build)
    const isPlaceholder = chain.rpcUrl.includes('PLACEHOLDER') || 
                         chain.rpcUrl.includes('undefined') ||
                         chain.rpcUrl.length < 20;
    
    if (!isPlaceholder && !chain.rpcUrl.startsWith('http')) {
      errors.push(`Invalid RPC URL for chain ${chainId}`);
    }
    
    if (Object.keys(chain.tokens).length === 0) {
      errors.push(`No tokens configured for chain ${chainId}`);
    }
    
    // Validate token addresses
    Object.entries(chain.tokens).forEach(([symbol, token]) => {
      if (!/^0x[a-fA-F0-9]{40}$/i.test(token.address)) {
        errors.push(`Invalid token address for ${symbol} on chain ${chainId}`);
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    // Don't throw during build - let it continue
    if (typeof window !== 'undefined') {
      throw new Error('Configuration validation failed - check console for details');
    }
  } else if (typeof window === 'undefined') {
    console.log(`✅ Config validated: ${SUPPORTED_CHAINS.length} chains, treasury: ${treasuryAddress}`);
  }
}

// Run validation on module load
validateConfiguration();