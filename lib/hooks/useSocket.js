import { useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";

const BASE_WS = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://tripkart.com/api"
).replace("/api", "");

export const useSocket = (namespace = "") => {
  const socketRef = useRef(null);

  const connect = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    socketRef.current = io(BASE_WS + namespace, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    return socketRef.current;
  }, [namespace]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect, emit, on, socket: socketRef };
};
