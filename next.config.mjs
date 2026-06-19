/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignores strict TypeScript compilation errors on build
    ignoreBuildErrors: true,
  },
  // Modern configuration parameter for Next.js to ignore ESLint blocks on build
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;