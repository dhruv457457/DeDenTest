// lib/price-feed.ts - Robust price feed with multiple sources

interface PriceCache {
  [symbol: string]: {
    price: number;
    timestamp: number;
  };
}

// In-memory cache (5 minute TTL)
const priceCache: PriceCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch native token price with fallback sources
 */
export async function getNativeTokenPrice(symbol: string): Promise<number> {
  // Check cache first
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Price] Using cached ${symbol} price: $${cached.price}`);
    return cached.price;
  }

  // Try multiple sources in order
  const sources = [
    () => fetchFromCoinGecko(symbol),
    () => fetchFromCoinCap(symbol),
    () => fetchFromBinance(symbol),
  ];

  for (const source of sources) {
    try {
      const price = await source();
      if (price > 0) {
        // Cache the result
        priceCache[symbol] = {
          price,
          timestamp: Date.now(),
        };
        console.log(`[Price] ${symbol} = $${price}`);
        return price;
      }
    } catch (error) {
      console.warn(`[Price] Source failed for ${symbol}:`, error);
      continue; // Try next source
    }
  }

  // All sources failed - use last known price or fallback
  if (cached) {
    console.warn(`[Price] Using stale cache for ${symbol}: $${cached.price}`);
    return cached.price;
  }

  // Absolute fallback (better than failing)
  const fallbackPrices: { [key: string]: number } = {
    ETH: 3000,
    BNB: 600,
  };

  const fallback = fallbackPrices[symbol] || 0;
  console.warn(`[Price] Using fallback price for ${symbol}: $${fallback}`);
  return fallback;
}

/**
 * Source 1: CoinGecko (Free, reliable)
 */
async function fetchFromCoinGecko(symbol: string): Promise<number> {
  const coinIds: { [key: string]: string } = {
    ETH: "ethereum",
    BNB: "binancecoin",
  };

  const coinId = coinIds[symbol];
  if (!coinId) throw new Error(`Unknown symbol: ${symbol}`);

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
    {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Next.js cache
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API returned ${response.status}`);
  }

  const data = await response.json();
  const price = data[coinId]?.usd;

  if (!price || price <= 0) {
    throw new Error(`Invalid price from CoinGecko: ${price}`);
  }

  return price;
}

/**
 * Source 2: CoinCap (Free, good backup)
 */
async function fetchFromCoinCap(symbol: string): Promise<number> {
  const assetIds: { [key: string]: string } = {
    ETH: "ethereum",
    BNB: "binance-coin",
  };

  const assetId = assetIds[symbol];
  if (!assetId) throw new Error(`Unknown symbol: ${symbol}`);

  const response = await fetch(
    `https://api.coincap.io/v2/assets/${assetId}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`CoinCap API returned ${response.status}`);
  }

  const data = await response.json();
  const price = parseFloat(data.data?.priceUsd);

  if (!price || price <= 0) {
    throw new Error(`Invalid price from CoinCap: ${price}`);
  }

  return price;
}

/**
 * Source 3: Binance (Reliable, but needs symbol mapping)
 */
async function fetchFromBinance(symbol: string): Promise<number> {
  const tradingPairs: { [key: string]: string } = {
    ETH: "ETHUSDT",
    BNB: "BNBUSDT",
  };

  const pair = tradingPairs[symbol];
  if (!pair) throw new Error(`Unknown symbol: ${symbol}`);

  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Binance API returned ${response.status}`);
  }

  const data = await response.json();
  const price = parseFloat(data.price);

  if (!price || price <= 0) {
    throw new Error(`Invalid price from Binance: ${price}`);
  }

  return price;
}

/**
 * Clear the price cache (useful for testing)
 */
export function clearPriceCache(): void {
  Object.keys(priceCache).forEach((key) => delete priceCache[key]);
}

/**
 * Get cached price (for display purposes, not payments)
 */
export function getCachedPrice(symbol: string): number | null {
  const cached = priceCache[symbol];
  if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
    return null;
  }
  return cached.price;
}