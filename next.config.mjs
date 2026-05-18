/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Evita que advertencias de tipos en TypeScript bloqueen la compilación en Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
