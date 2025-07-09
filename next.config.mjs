import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Conditional output for dual deployment
  // Vercel: default (no output specified)
  // Cloudflare Workers: handled by OpenNext.js automatically
  images: {
    // Conditional image optimization for dual deployment
    unoptimized: process.env.CLOUDFLARE_WORKERS === "true",
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
    optimizePackageImports: [
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      '@google/genai',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      'gsap',
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Suppress the Supabase realtime-js critical dependency warning
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    // Optimize bundle splitting for production builds
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          ui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'ui-vendor',
            priority: 20,
            chunks: 'all',
          },
          animations: {
            test: /[\\/]node_modules[\\/](framer-motion|gsap)[\\/]/,
            name: 'animations-vendor',
            priority: 15,
            chunks: 'all',
          },
          query: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/,
            name: 'query-vendor',
            priority: 15,
            chunks: 'all',
          },
          ai: {
            test: /[\\/]node_modules[\\/]@google[\\/]genai/,
            name: 'ai-vendor',
            priority: 15,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            enforce: true,
          },
        },
      };

      // Enable tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },
}

export default withBundleAnalyzer(nextConfig)
