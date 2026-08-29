/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'production' && !process.env.VERCEL
    ? 'http://backend:8000'
    : 'http://127.0.0.1:8000'
);

const nextConfig = {
  output: 'export',
  reactStrictMode: false,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
