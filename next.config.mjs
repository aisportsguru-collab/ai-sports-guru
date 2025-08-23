/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure API routes are deployed (no static export)
  output: 'standalone',
  experimental: {
    appDir: true,
  },
};
export default nextConfig;
