declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    LINE_CHANNEL_ACCESS_TOKEN?: string;
    LINE_CHANNEL_SECRET?: string;
    LINE_GROUP_ID?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_PICKER_KEY?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_TOKEN_KEY?: string;
    BOOTSTRAP_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
