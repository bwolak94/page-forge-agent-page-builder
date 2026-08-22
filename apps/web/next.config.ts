import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pageforge/ir", "@pageforge/registry", "@pageforge/contracts"],
};

export default nextConfig;
