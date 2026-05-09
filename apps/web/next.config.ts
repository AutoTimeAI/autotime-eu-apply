import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/dashboard/extension/download": ["./private-downloads/**/*"]
  },
  transpilePackages: ["shared"]
}

export default nextConfig
