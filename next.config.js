/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
    experimental: {
        // Disables the excessive RSC background fetching on scroll/focus that causes tab freezing
        clientRouterFilter: false,
    }
};

module.exports = nextConfig;
