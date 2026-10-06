import type { NextConfig } from 'next';

// No Docker limita os workers do build (memória); localmente usa o valor por defeito.
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || undefined;

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor mínimo + dependências necessárias) para a imagem Docker.
  output: 'standalone',
  experimental: {
    // Uma foto por pedido; o cliente já comprime antes de enviar.
    serverActions: { bodySizeLimit: '6mb' },
    ...(buildCpus ? { cpus: buildCpus } : {}),
  },
};

export default nextConfig;
