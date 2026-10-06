import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Uma foto por pedido; o cliente já comprime antes de enviar.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
