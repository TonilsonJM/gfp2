/** @type {import('next').NextConfig} */

// Quando o build corre no GitHub Actions, calcula automaticamente o
// basePath/assetPrefix a partir do nome do repositório, para que os
// ficheiros funcionem em https://<usuario>.github.io/<repo>/
const isGithubActions = process.env.GITHUB_ACTIONS || false;

let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  const repo = (process.env.GITHUB_REPOSITORY || '').replace(/.*?\//, '');
  if (repo) {
    assetPrefix = `/${repo}/`;
    basePath = `/${repo}`;
  }
}

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix,
  env: {
    // Exposto ao código do cliente para montar caminhos absolutos
    // (ex: registo do service worker) que respeitem o basePath do GitHub Pages
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
