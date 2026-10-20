import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bundle the example scripts so /examples/[file] can read them on Vercel.
  outputFileTracingIncludes: { "/examples/[file]": ["./examples/**/*"] },
  async headers() {
    return [
      {
        // Open CORS everywhere so agents anywhere can call the API, MCP and discovery files.
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Mcp-Session-Id, Accept, X-Requested-With" },
          { key: "Access-Control-Expose-Headers", value: "Mcp-Session-Id" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
