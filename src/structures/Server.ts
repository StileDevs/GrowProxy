import {
  Client,
  TextPacket,
  Peer,
  TankPacket,
  Variant,
  PacketTypes,
  TankTypes
} from "growtopia.js";
import { Proxy } from "./Proxy";
import axios from "axios";
import { readFileSync } from "fs";
import https from "https";
import ansi from "ansi-colors";

interface DataObject {
  [key: string]: string | number;
}

export class Server {
  public client: Client;
  public proxyNetID: number;
  public config: ProxyConfig;
  public proxy: Proxy;

  constructor(public ip: string, public port: number) {
    this.client = new Client({
      enet: {
        ip,
        port,
        maxPeers: 1024,
        useNewPacket: {
          asClient: true
        }
      },
      https: {
        port,
        enable: true,
        url: ip,
        type2: false
      }
    });

    this.config = JSON.parse(readFileSync("./config.json", "utf8"));
    this.proxyNetID = 0;
  }

  public setProxyNetID(netID: number) {
    this.proxyNetID = netID;
  }

  public setProxy(proxy: Proxy) {
    this.proxy = proxy;
  }

  public start() {
    this.client
      .on("ready", () => {
        console.log("Server ready!");
      })
      .on("connect", async (netID) => {
        console.log("New Peer connected to server: ", netID);
        this.proxy.setServerNetID(netID);
        const req = await this.request();
        console.log(req);
        if (
          this.proxy.client.connect(
            req.server as string,
            // parseInt(req.port as string),
            17091,
            this.proxyNetID
          )
        )
          console.log(`Successfully proxy connect to ${req.server}`);
      })
      .on("raw", (netID, data) => {
        // console.log(
        //   `[${netID}] Server Received`,
        //   data.toString("hex").match(/../g).join(" "),
        //   "\n"
        // );

        const type = data.readUInt32LE(0);
        const peerProxy = new Peer(this.proxy.client, this.proxyNetID);

        peerProxy.send(data);

        switch (type) {
          case PacketTypes.ACTION: {
            const parsed = this.parseText(data);

            if (parsed.action === "quit") {
              this.client._client.disconnect(netID);
            }
            console.log(
              `[${netID}] Server Received ${ansi.yellowBright("[ACTION]")}\n`,
              parsed,
              "\n"
            );
            break;
          }

          case PacketTypes.TANK: {
            const tankType = data.readUint8(4);
            console.log(
              `[${netID}] Server Received ${ansi.blueBright(
                `[TANK] | [${TankTypes[tankType]}] | [Length: ${data.length}]`
              )}`
            );
            switch (tankType) {
              case TankTypes.STATE: {
                // maybe change to something?
                console.log("");
                break;
              }

              case TankTypes.SEND_ITEM_DATABASE_DATA: {
                // maybe change to something?
                console.log("");
                break;
              }

              case TankTypes.SEND_MAP_DATA: {
                // maybe change to something?
                console.log("");
                break;
              }

              default: {
                console.log(data.toString("hex").match(/../g).join(" "), "\n");
                break;
              }
            }

            break;
          }
        }
      })
      .on("disconnect", (netID) => {
        console.log("Client disconnected", netID);
      })
      .listen();
  }

  private async request() {
    const res = await axios({
      method: "POST",
      url: `https://${this.config.server.host}/growtopia/server_data.php`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "UbiServices_SDK_2019.Release.27_PC64_unicode_static"
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    if (res.status !== 200) return null;
    return this.parseText(res.data);
  }

  private parseText(chunk: Buffer | string) {
    let data: DataObject = {};
    let str: string;

    if (Buffer.isBuffer(chunk)) {
      chunk[chunk.length - 1] = 0;
      str = chunk.toString("utf-8", 4);
    } else {
      str = chunk;
    }

    const lines = str.split("\n");

    lines.forEach((line) => {
      if (line.startsWith("|")) line = line.slice(1);
      const info = line.split("|");

      let key = info[0];
      let val = info[1];

      if (key && val) {
        if (val.endsWith("\x00")) val = val.slice(0, -1);
        data[key] = val;
      }
    });

    return data;
  }
}
