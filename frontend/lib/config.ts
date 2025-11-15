// lib/config.ts - Production Mainnet Configuration with Hardcoded Treasury

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

// Helper function to safely get environment variables
function getEnvVar(key: string, friendlyName: string): string {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Get the value
  const value = process.env[key];
  
  // If value exists and is valid, return it
  if (value && value.trim() !== '') {
    return value.trim();
  }
  
  // During build phase, return placeholder to allow build to complete
  // The actual values will be used at runtime from the deployment platform
  if (!isBrowser) {
    console.warn(`⚠️  ${key} not set - using placeholder. Ensure it's set in your deployment platform.`);
    return '__PLACEHOLDER__'; // Non-empty placeholder to pass validation
  }
  
  // At runtime in browser, this shouldn't happen, but handle gracefully
  console.error(`❌ Missing runtime env var: ${key}`);
  return '__MISSING__';
}

// Get API keys with graceful fallback
const arbitrumApiKey = getEnvVar(
  'NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM',
  'Alchemy API key for Arbitrum network'
);

const bnbApiKey = getEnvVar(
  'NEXT_PUBLIC_ALCHEMY_API_KEY_BNB',
  'Alchemy API key for BNB Chain'
);

const baseApiKey = getEnvVar(
  'NEXT_PUBLIC_ALCHEMY_API_KEY_BASE',
  'Alchemy API key for Base network'
);

// Log initialization (only in non-build environments)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  console.log('🔍 Environment Check:');
  console.log('   Treasury:', treasuryAddress);
  console.log('   Arbitrum API:', arbitrumApiKey.substring(0, 8) + '...');
  console.log('   BNB API:', bnbApiKey.substring(0, 8) + '...');
  console.log('   Base API:', baseApiKey.substring(0, 8) + '...');
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
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
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

  // Base (Mainnet)
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
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin",
      },
    },
  },
};

// Helper functions
export function getSupportedTokens(chainId: number): string[] {
  const chain = chainConfig[chainId];
  return chain ? Object.keys(chain.tokens) : [];
}

export function validateChainAndToken(chainId: number, token: string): boolean {
  const chain = chainConfig[chainId];
  if (!chain) return false;
  return token in chain.tokens;
}

export function getChainName(chainId: number): string {
  return chainConfig[chainId]?.name || "Unknown Chain";
}

export const SUPPORTED_CHAINS = Object.keys(chainConfig).map(Number);

// Validate configuration
function validateConfiguration(): void {
  const errors: string[] = [];
  
  if (!/^0x[a-fA-F0-9]{40}$/i.test(treasuryAddress)) {
    errors.push(`Invalid treasury address format: ${treasuryAddress}`);
  }
  
  if (SUPPORTED_CHAINS.length === 0) {
    errors.push("No chains configured");
  }
  
  SUPPORTED_CHAINS.forEach((chainId) => {
    const chain = chainConfig[chainId];
    
    // Skip RPC validation during build if placeholder
    if (!chain.rpcUrl.includes('PLACEHOLDER') && !chain.rpcUrl.startsWith('http')) {
      errors.push(`Invalid RPC URL for chain ${chainId}`);
    }
    
    if (Object.keys(chain.tokens).length === 0) {
      errors.push(`No tokens configured for chain ${chainId}`);
    }
    
    Object.entries(chain.tokens).forEach(([symbol, token]) => {
      if (!/^0x[a-fA-F0-9]{40}$/i.test(token.address)) {
        errors.push(`Invalid token address for ${symbol} on chain ${chainId}`);
      }
    });
  });
  
  if (errors.length > 0) {
    throw new Error(
      '❌ Configuration validation failed:\n' +
      errors.map(e => `   - ${e}`).join('\n')
    );
  }
  
  if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    console.log(`✅ Config validated: ${SUPPORTED_CHAINS.length} chains, treasury: ${treasuryAddress}`);
  }
}

validateConfiguration();