/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.clarity.ms https://scripts.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co https://www.facebook.com https://www.clarity.ms https://c.clarity.ms https://c.bing.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.facebook.com https://www.clarity.ms https://graph.facebook.com; worker-src 'self' blob:; frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;