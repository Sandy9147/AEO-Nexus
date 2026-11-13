/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@aeo-nexus/ui',
    '@aeo-nexus/api-client',
    '@aeo-nexus/contracts',
    '@aeo-nexus/permissions',
    '@aeo-nexus/config',
  ],
};

module.exports = nextConfig;
