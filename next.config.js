/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  outputFileTracingExcludes: {
    '/api/prepare-order': ['./public/**/*'],
    '/api/redeem-coupon': ['./public/**/*']
  },
  outputFileTracingIncludes: {
    '/api/prepare-order': ['./public/fonts/**/*'],
    '/api/redeem-coupon': ['./public/fonts/**/*']
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  }
};

export default nextConfig;
