/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We need this for canvas if we use it on the server, but let's try client-side first
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {},
};

module.exports = nextConfig;
