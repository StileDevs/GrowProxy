import { Client, TextPacket, Peer } from "growtopia.js";

const client = new Client({
  enet: {
    ip: "0.0.0.0",
    port: 17091
  }
});

client.on("ready", () => {
  console.log(`ENet server ready`);
});

client.on("error", (err) => {
  console.log("Something wrong", err);
});

client.on("connect", (netID) => {
  console.log(`Connected netID ${netID}`);
  const peer = new Peer(client, netID);
  peer.send(TextPacket.from(0x1));
});

client.on("disconnect", (netID) => {
  console.log(`Disconnected netID ${netID}`);
});

client.on("raw", (netID, channelID, data) => {
  const peer = new Peer(client, netID);
  console.log("raw", data);
});

client.listen();
