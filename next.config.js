/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true
  },
  images: {
    domains: [
      // Allow team logos or other sports assets from known domains. Add more domains as needed.
      'static.theoddsapi.com',
      'cdn.vox-cdn.com'
    ]
  }
};

module.exports = nextConfig;