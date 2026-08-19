import { config } from "dotenv";
import path from "node:path";
import type { NextConfig } from "next";

// One root .env feeds every workspace (Next doesn't read it on its own).
config({ path: path.resolve(process.cwd(), "../.env") });

const remotePatterns: { protocol: "http" | "https"; hostname: string }[] = [];
if (process.env.S3_PUBLIC_URL) {
  try {
    const u = new URL(process.env.S3_PUBLIC_URL);
    remotePatterns.push({
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
    });
  } catch {
    // invalid URL — image optimisation for S3 hosts just won't be allowed
  }
}
// YouTube thumbnails for the video hub
remotePatterns.push({ protocol: "https", hostname: "img.youtube.com" });

const nextConfig: NextConfig = {
  transpilePackages: ["@ctr/db", "@ctr/ui"],
  serverExternalPackages: ["ws"],
  images: { remotePatterns },
};

export default nextConfig;
