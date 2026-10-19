declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BOOTSTRAP_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
