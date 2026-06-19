/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Will ignore strict TypeScript production check errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Will ignore strict lint analysis check warnings during build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;