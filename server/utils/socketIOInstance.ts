// Socket.io instance singleton
import type { Server } from "socket.io";

let io: Server;

export const useSocketIO = () => {
  const setSocketIO = (socketIO: Server) => {
    io = socketIO;
  };

  return {
    io,
    setSocketIO
  };
};
