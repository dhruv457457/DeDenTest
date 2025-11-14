// lib/config.ts - Production Mainnet Configuration with Robust Error Handling

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

// Helper function to safely get environment variables with detailed error messages
function getRequiredEnvVar(key: string, friendlyName: string): string {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `   Purpose: ${friendlyName}\n` +
      `   Action: Add this to your .env file:\n` +
      `   ${key}=your_${friendlyName.toLowerCase().replace(/\s+/g, '_')}_here`
    );
  }
  
  return value.trim();
}

// Validate and get treasury address with specific format validation
function getTreasuryAddress(): string {
  const address = getRequiredEnvVar(
    'NEXT_PUBLIC_Main_TREASURY_ADDRESS',
    'Treasury wallet address for receiving payments'
  );
  
  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    throw new Error(
      `❌ Invalid treasury address format: ${address}\n` +
      `   Expected format: 0x followed by 40 hexadecimal characters\n` +
      `   Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1`
    );
  }
  
  return address.toLowerCase();
}

// Validate environment variables with detailed error messages
let treasuryAddress: string;
let arbitrumApiKey: string;
let bnbApiKey: string;
let baseApiKey: string;

try {
  // Debug: Log all NEXT_PUBLIC_ environment variables
  if (typeof window === 'undefined') {
    console.log('🔍 Checking environment variables...');
    console.log('   NEXT_PUBLIC_Main_TREASURY_ADDRESS:', process.env.NEXT_PUBLIC_Main_TREASURY_ADDRESS ? '✅ Present' : '❌ Missing');
    console.log('   NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM:', process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM ? '✅ Present' : '❌ Missing');
    console.log('   NEXT_PUBLIC_ALCHEMY_API_KEY_BNB:', process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BNB ? '✅ Present' : '❌ Missing');
    console.log('   NEXT_PUBLIC_ALCHEMY_API_KEY_BASE:', process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BASE ? '✅ Present' : '❌ Missing');
  }

  // Validate treasury address first (most critical)
  treasuryAddress = getTreasuryAddress();
  
  // Validate API keys
  arbitrumApiKey = getRequiredEnvVar(
    'NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM',
    'Alchemy API key for Arbitrum network'
  );
  
  bnbApiKey = getRequiredEnvVar(
    'NEXT_PUBLIC_ALCHEMY_API_KEY_BNB',
    'Alchemy API key for BNB Chain'
  );
  
  baseApiKey = getRequiredEnvVar(
    'NEXT_PUBLIC_ALCHEMY_API_KEY_BASE',
    'Alchemy API key for Base network'
  );
  
  if (typeof window === 'undefined') {
    console.log('✅ All required environment variables validated successfully');
    console.log(`   Treasury: ${treasuryAddress}`);
    console.log(`   Arbitrum API: ${arbitrumApiKey.substring(0, 8)}...`);
    console.log(`   BNB API: ${bnbApiKey.substring(0, 8)}...`);
    console.log(`   Base API: ${baseApiKey.substring(0, 8)}...`);
  }
  
} catch (error) {
  console.error('\n🚨 CONFIGURATION ERROR:\n');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('\n📝 Check your .env file and ensure all required variables are set.');
  console.error('💡 Make sure to restart your dev server after adding/changing .env variables!\n');
  
  // In development, provide fallback values to prevent hard crash
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Using fallback configuration for development...\n');
    treasuryAddress = '0x317914bc4db3f61c0cba933a3e00d7a8bed124a5';
    arbitrumApiKey = 'development-fallback-key';
    bnbApiKey = 'development-fallback-key';
    baseApiKey = 'development-fallback-key';
  } else {
    // In production, re-throw to prevent the app from starting with invalid config
    throw error;
  }
}

// Export validated treasury address
export { treasuryAddress };

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
  
  // Check that we have at least one chain configured
  if (SUPPORTED_CHAINS.length === 0) {
    errors.push("No chains configured");
  }
  
  // Validate each chain configuration
  SUPPORTED_CHAINS.forEach((chainId) => {
    const chain = chainConfig[chainId];
    
    if (!chain.rpcUrl.startsWith('http')) {
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
    throw new Error(
      '❌ Configuration validation failed:\n' +
      errors.map(e => `   - ${e}`).join('\n')
    );
  }
  
  if (typeof window === 'undefined') {
    console.log(`✅ Configuration validated: ${SUPPORTED_CHAINS.length} chains, treasury: ${treasuryAddress}`);
  }
}

// Run validation on module load
validateConfiguration();