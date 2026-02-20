import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Detect if we're using local PostgreSQL or Neon/Supabase
const isLocalPostgres = process.env.DATABASE_URL.includes('localhost') ||
                        process.env.DATABASE_URL.includes('127.0.0.1');

let pool: any;
let db: any;

if (isLocalPostgres) {
  // Use standard pg driver for local PostgreSQL
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = pgDrizzle({ client: pool, schema });
} else {
  // Use Neon serverless driver for cloud databases
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool, schema });
}

export { pool, db };
