import { Client } from "growtopia.js";

const client = new Client({
  enet: {
    port: 0,
    ip: "0.0.0.0",
    useNewPacket: {
      asClient: true
    }
  }
});

const server = new Client({
  enet: {
    port: 17091,
    ip: "0.0.0.0",
    useNewPacket: {
      asClient: false
    },
    useNewServerPacket: true
  }
});

export const useGrowClient = () => {
  return client;
};

export const useGrowServer = () => {
  return server;
};
