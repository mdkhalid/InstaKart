"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

let socket: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      setConnected(false);
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      auth: { token },
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [user?.id]);

  const on = (event: string, callback: (data: any) => void) => {
    socket?.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  };

  return { socket, connected, on };
}
