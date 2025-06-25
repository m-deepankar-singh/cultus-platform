import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration for different platforms
  output: "standalone", // For Vercel and Cloudflare compatibility
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Disable next/image optimization for Cloudflare Pages
    unoptimized: process.env.CLOUDFLARE_PAGES === "true",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'meizvwwhasispvfbprck.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // Add R2 public domain for image access
      {
        protocol: 'https',
        hostname: 'pub-696d7c88c1d1483e90f5fedec576342a.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assests.cultuslearn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    serverActions: {
      bodySizeLimit: '1mb', // ✅ Reduced from 100mb - only for metadata now
    },
  },
  
  // Conditionally set runtime for API routes based on deployment platform
  async headers() {
    if (process.env.CLOUDFLARE_PAGES === "true") {
      return [
        {
          source: "/api/:path*",
          headers: [
            {
              key: "x-middleware-runtime",
              value: "edge", // Force Edge runtime for Cloudflare Pages
            },
          ],
        },
      ];
    }
    return [];
  },
  webpack: (config) => {
    // Suppress the Supabase realtime-js critical dependency warning
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
}

export default withBundleAnalyzer(nextConfig)
