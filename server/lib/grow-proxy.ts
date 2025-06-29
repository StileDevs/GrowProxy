import { Client, Peer } from "growtopia.js";
import { readFileSync } from "fs";
import { join } from "path";

// Import the io instance so we can emit events
import { useSocketIO } from "../utils/socketIOInstance";
import { storage } from "~/server/services/storage";

const hostConfigPath = join(process.cwd(), ".config/host.json");
let hostConfig;
try {
  hostConfig = JSON.parse(readFileSync(hostConfigPath, "utf-8"));
} catch (error) {
  console.error("Failed to read host.json:", error);
  hostConfig = {
    host: "www.growtopia1.com",
    fetched: {
      port: 17091,
      ip: "213.179.209.168"
    }
  };
}

// Get the socket.io instance
const { io } = useSocketIO();

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
    // port: 0,
    ip: "0.0.0.0",
    useNewPacket: {
      asClient: false
    },
    useNewServerPacket: true
  }
});
// Initialize connection
client.connect("127.0.0.1", 0);
client.host.disconnectNow(0);

server.listen();
client.listen();

client.on("connect", async () => {
  console.log("Client connected to Growtopia server");
  const eventData = {
    type: "connect",
    message: "Connected to Growtopia server",
    timestamp: new Date().toISOString()
  };

  // Save to storage
  await storage.setItem(`client_events:${Date.now()}`, eventData);

  io.emit("client_traffic", eventData);
});

client.on("raw", async (netID, _channelID, data) => {
  // Create peer if needed for other operations
  // const clientPeer = new Peer(client, netID);
  console.log("Client Raw data received from Growtopia client:", data);
  const eventData = {
    type: "raw",
    netID,
    channelID: _channelID,
    data: data.toString("hex").match(/../g)?.join(" "), // Convert buffer to hex string for websocket
    timestamp: new Date().toISOString()
  };

  // Save to storage
  await storage.setItem(`client_raw:${Date.now()}`, eventData);

  io.emit("client_traffic", eventData);
});

client.on("disconnect", async () => {
  console.log("Client disconnected from Growtopia server");
  const eventData = {
    type: "disconnect",
    message: "Disconnected from Growtopia server",
    timestamp: new Date().toISOString()
  };

  // Save to storage
  await storage.setItem(`client_events:${Date.now()}`, eventData);

  io.emit("client_traffic", eventData);
});

server.on("connect", async (netID) => {
  const _serverPeer = new Peer(server, netID);
  console.log("Server connected to Growtopia client");
  console.log(`Connecting to Growtopia server: ${hostConfig.fetched.ip}:${hostConfig.fetched.port}`);
  client.host.connect(hostConfig.fetched.ip, hostConfig.fetched.port);

  const eventData = {
    type: "connect",
    netID,
    message: "Growtopia client connected to server",
    timestamp: new Date().toISOString()
  };

  // Save to storage
  await storage.setItem(`server_events:${Date.now()}`, eventData);

  io.emit("server_traffic", eventData);
});

server.on("raw", async (netID, _channelID, data) => {
  // const serverPeer = new Peer(client, netID);
  console.log("Server Raw data received from Growtopia client:", data);
  const eventData = {
    type: "raw",
    netID,
    channelID: _channelID,
    data: data.toString("hex").match(/../g)?.join(" "), // Convert buffer to hex string for websocket
    timestamp: new Date().toISOString()
  };

  // Save to storage
  await storage.setItem(`server_raw:${Date.now()}`, eventData);

  io.emit("server_traffic", eventData);
});

server.on("disconnect", async (netID) => {
  console.log("Server disconnected from Growtopia client");
  const eventData = {
    type: "disconnect",
    netID,
    message: "Growtopia client disconnected from server",
    timestamp: new Date().toISOString()
  };

  // Save to storage
  await storage.setItem(`server_events:${Date.now()}`, eventData);

  io.emit("server_traffic", eventData);
});

export const useGrowProxy = () => {
  return { client, server };
};
