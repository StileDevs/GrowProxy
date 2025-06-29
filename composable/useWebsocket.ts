import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

// Define a more generic type for the socket
type SocketType = Socket;

// Global socket instance to prevent multiple connections
let globalSocket: SocketType | null = null;

export const useWebsocket = () => {
  const isConnected = ref(false);
  const transport = ref("N/A");
  const isConnecting = ref(false);

  const initSocket = () => {
    // Don't create a new connection if one already exists and is connected
    if (globalSocket && globalSocket.connected) {
      console.log("WebSocket already connected, reusing existing connection");
      // Update our local state to match the existing connection
      onConnect();
      return;
    }

    // Don't create multiple connections simultaneously
    if (isConnecting.value) {
      console.log("WebSocket connection already in progress");
      return;
    }

    // Only create a new socket if one doesn't exist or is disconnected
    if (!globalSocket || (globalSocket && !globalSocket.connected)) {
      isConnecting.value = true;

      // If there's an existing disconnected socket, clean it up first
      if (globalSocket) {
        globalSocket.off("connect", onConnect);
        globalSocket.off("disconnect", onDisconnect);
        globalSocket.disconnect();
      }

      console.log("Creating new WebSocket connection");
      // Create new socket connection
      globalSocket = io(import.meta.client ? window.location.origin : undefined);

      // Setup event handlers
      globalSocket.on("connect", onConnect);
      globalSocket.on("disconnect", onDisconnect);
    }
  };

  const reconnect = () => {
    console.log("Manually reconnecting WebSocket");
    if (globalSocket) {
      globalSocket.disconnect();
    }
    isConnecting.value = false;
    initSocket();
  };

  const onConnect = () => {
    isConnected.value = true;
    isConnecting.value = false;
    if (globalSocket) {
      transport.value = globalSocket.io.engine.transport.name;

      globalSocket.io.engine.on("upgrade", (rawTransport: unknown) => {
        transport.value = (rawTransport as { name: string }).name;
      });
    }
  };

  const onDisconnect = () => {
    isConnected.value = false;
    isConnecting.value = false;
    transport.value = "N/A";
  };

  onMounted(() => {
    // Only initialize if we don't have a connected socket
    if (!globalSocket || !globalSocket.connected) {
      initSocket();
    } else {
      // Socket is already connected, just update our state
      onConnect();
    }
  });

  onUnmounted(() => {
    // Don't disconnect the global socket, just remove event listeners for this instance
    if (globalSocket) {
      globalSocket.off("connect", onConnect);
      globalSocket.off("disconnect", onDisconnect);
    }
  });

  // Create methods to interact with socket instead of returning raw socket
  const emit = (event: string, data: unknown) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit(event, data);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const on = (event: string, callback: Function) => {
    if (globalSocket) {
      globalSocket.on(event, callback as never);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const off = (event: string, callback: Function) => {
    if (globalSocket) {
      globalSocket.off(event, callback as never);
    }
  };

  return {
    isConnected,
    transport,
    isConnecting,
    emit,
    on,
    off,
    reconnect
  };
};
