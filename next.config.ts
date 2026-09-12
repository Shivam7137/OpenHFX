import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // AGENTS.md is a canonical contributor document owned by the team, so Next.js
  // does not append its own generated block to it on every dev run.
  agentRules: false,
};

export default nextConfig;
