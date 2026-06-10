"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

interface LowStockAlert {
  items: any[];
  timestamp: string;
  storeId: string | null;
}

interface AdminSocketCallbacks {
  onLowStock?: (alert: LowStockAlert) => void;
  onNewOrder?: (data: any) => void;
  onOrderCancelled?: (data: any) => void;
}

export function useAdminSocket(callbacks?: AdminSocketCallbacks) {
  const [connected, setConnected] = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Clean up previous socket if re-connecting
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:4000",
      {
        auth: { token },
      }
    );

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("admin:low_stock", (data: LowStockAlert) => {
      callbacksRef.current?.onLowStock?.(data);
    });

    socket.on("order:new", (data: any) => {
      callbacksRef.current?.onNewOrder?.(data);
    });

    socket.on("order:cancelled", (data: any) => {
      callbacksRef.current?.onOrderCancelled?.(data);
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return { connected };
}
