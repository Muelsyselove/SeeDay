import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/themes": path.resolve(__dirname, "themes"),
      "@/components": path.resolve(__dirname, "components"),
      "@/layouts": path.resolve(__dirname, "src/layouts"),
      "@/hooks": path.resolve(__dirname, "src/hooks"),
      "@/lib": path.resolve(__dirname, "src/lib"),
    };
    return config;
  },
};

export default nextConfig;
