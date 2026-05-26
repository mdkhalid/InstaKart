import http from "http";
import app from "./app";
import { initSocket } from "./services/socket.service";
import { prisma } from "./lib/prisma";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`✅ API server running on http://localhost:${PORT}`);
    logger.info(` Health check: http://localhost:${PORT}/health`);
  } catch (error) {
    logger.error("Failed to connect to database:", error);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Database disconnected, server closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
