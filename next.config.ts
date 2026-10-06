import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor mínimo + dependências necessárias) para a imagem Docker.
  output: 'standalone',
  experimental: {
    // Uma foto por pedido; o cliente já comprime antes de enviar.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
