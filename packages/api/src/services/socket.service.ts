import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
  const corsOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim());

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket as any;

    // Join personal room
    socket.join(`user:${userId}`);

    // Admin joins admin room
    if (role === "ADMIN") {
      socket.join("admin");
    }

    console.log(`Socket connected: user:${userId} (${role})`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: user:${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

// Helper to emit to a specific user
export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Helper to emit to admin room
export const emitToAdmin = (event: string, data: any) => {
  if (io) {
    io.to("admin").emit(event, data);
  }
};
