/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ['@chess/ui', '@chess/contract'],
};

module.exports = nextConfig;
