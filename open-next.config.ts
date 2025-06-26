// OpenNext.js configuration for Cloudflare Workers
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // Use R2 for incremental cache if you have an R2 bucket configured
  // Commenting out for now to use default in-memory cache to avoid deployment issues
  // incrementalCache: r2IncrementalCache,
});
