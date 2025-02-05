/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BITRIX24_WEBHOOK_URL: process.env.BITRIX24_WEBHOOK_URL,
  },
}

module.exports = nextConfig

