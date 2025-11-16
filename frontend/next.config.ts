import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.prestigesouthernstar.info",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // ✅ CRITICAL FIX: Handle environment variables for Next.js 15
  env: {
    NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM:
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ARBITRUM || "",
    NEXT_PUBLIC_ALCHEMY_API_KEY_BNB:
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BNB || "",
    NEXT_PUBLIC_ALCHEMY_API_KEY_BASE:
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BASE || "",
  },

  // ✅ Next.js 16: Use Turbopack config instead of webpack
  turbopack: {
    // Empty config is fine - Turbopack handles env vars automatically
  },
};

module.exports = nextConfig;
