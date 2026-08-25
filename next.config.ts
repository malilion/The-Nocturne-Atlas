import type { NextConfig } from 'next';

// NOTE: vinext's static-export prerender doesn't account for `basePath` when
// requesting routes from its build-time server, so setting basePath here
// breaks `vinext build` (the root route 404s). GitHub Pages project-page
// hosting (served from /<repo-name>/) is handled by rewriting the exported
// HTML's asset URLs in .github/workflows/deploy-pages.yml instead.
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
