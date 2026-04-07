import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    // Use direct connection (port 5432) for migrations, pgbouncer for runtime
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
