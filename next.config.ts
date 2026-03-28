import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['neo4j-driver'],
  // gitagent YAML/MD 파일을 Vercel 빌드에 포함 (fs.readFile로 접근)
  outputFileTracingIncludes: {
    '/api/**': ['./agents/**/*', './workflows/**/*', './tools/**/*'],
  },
  async headers() {
    return [
      {
        source: '/api/creative/:path*',
        headers: [
          { key: 'X-API-Deprecated', value: 'Use /api/v1/creative/ instead' },
          { key: 'Sunset', value: '2026-06-30' },
        ],
      },
      {
        source: '/api/graph/:path*',
        headers: [
          { key: 'X-API-Deprecated', value: 'Use /api/v1/graph/ instead' },
          { key: 'Sunset', value: '2026-06-30' },
        ],
      },
    ];
  },
};

export default nextConfig;
