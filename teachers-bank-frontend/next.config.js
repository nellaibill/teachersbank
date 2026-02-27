/** @type {import('next').NextConfig} */
const nextConfig = {
  // PHP_API_BASE is server-only (not NEXT_PUBLIC_) — used by the proxy route
  env: {
    PHP_API_BASE: process.env.PHP_API_BASE || 'http://localhost/teachersbank/teachers-bank-api/index.php',
  },
}
module.exports = nextConfig





