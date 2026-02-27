/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost/teachersbank/teachers-bank-api/index.php/:path*',
      },
    ]
  },
}
module.exports = nextConfig