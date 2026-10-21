declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_TOKEN_KEY?: string;
    BOOTSTRAP_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
