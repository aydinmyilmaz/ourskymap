/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  }
};

export default nextConfig;
