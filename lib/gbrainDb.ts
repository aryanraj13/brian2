import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const connectionString = process.env.GBRAIN_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "GBRAIN_DATABASE_URL is not configured. Check your .env.local file.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var gbrainPool: Pool | undefined;
}

export const gbrainPool =
  global.gbrainPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.gbrainPool = gbrainPool;
}