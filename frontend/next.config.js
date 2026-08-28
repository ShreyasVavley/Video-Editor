/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'http://backend:8000/api/:path*' 
          : 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/media/:path*',
        destination: process.env.NODE_ENV === 'production'
          ? 'http://backend:8000/media/:path*'
          : 'http://127.0.0.1:8000/media/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
