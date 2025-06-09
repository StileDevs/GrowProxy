import { io } from "socket.io-client";

export const useWebsocket = () => {
  const isConnected = ref(false);
  const transport = ref("N/A");
  const socket = io();

  const onConnect = () => {
    isConnected.value = true;
    transport.value = socket.io.engine.transport.name;

    socket.io.engine.on("upgrade", (rawTransport) => {
      transport.value = rawTransport.name;
    });
  };

  const onDisconnect = () => {
    isConnected.value = false;
    transport.value = "N/A";
  };

  if (socket.connected) {
    onConnect();
  }

  onMounted(() => {
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
  });

  onUnmounted(() => {
    socket.off("connect", onConnect);
    socket.off("disconnect", onDisconnect);
  });

  // Create methods to interact with socket instead of returning raw socket
  const emit = (event: string, data: unknown) => socket.emit(event, data);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const on = (event: string, callback: Function) => socket.on(event, callback as never);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const off = (event: string, callback: Function) => socket.off(event, callback as never);

  return {
    isConnected,
    transport,
    emit,
    on,
    off
  };
};
