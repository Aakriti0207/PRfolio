import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => console.log(`PRfolio backend listening on ${env.BACKEND_URL}`));
async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
