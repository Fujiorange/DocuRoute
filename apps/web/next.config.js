const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  workboxOptions: {
    // CRITICAL: default Workbox limit is 2MB.
    // Engineering drawings are 5–50MB. Without this override,
    // offline mode is non-functional in the hull of a ship.
    maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(js|css|woff2|woff|ttf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'docuroute-static-v1',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      // NEVER cache upload or transmittal send — these must always hit the server
      urlPattern: ({ url }) => {
        const neverCache = ['/api/upload/', '/api/transmittals/']
        return (
          url.pathname.startsWith('/api/') &&
          !neverCache.some((p) => url.pathname.startsWith(p))
        )
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'docuroute-api-v1',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 200, maxAgeSeconds: 5 * 60 },
      },
    },
    {
      urlPattern: /\/dashboard\//,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'docuroute-pages-v1' },
    },
  ],
})

module.exports = withPWA({
  transpilePackages: [
    '@docuroute/core',
    '@docuroute/db',
    '@docuroute/types',
    '@docuroute/emails',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Cloudflare R2 public URL — configure hostname in production
      },
    ],
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
})
