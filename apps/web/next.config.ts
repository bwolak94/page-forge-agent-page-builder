import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pageforge/ir", "@pageforge/registry", "@pageforge/contracts", "@pageforge/commands"],
  webpack(config) {
    // Allow TypeScript "bundler" mode .js imports to resolve to .ts/.tsx files.
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ".js": [".tsx", ".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
