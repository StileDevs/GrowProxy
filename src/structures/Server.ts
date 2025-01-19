import { Client, TextPacket, Peer, TankPacket, Variant } from "growtopia.js";
import { Proxy } from "./Proxy.js";
import { readFileSync } from "fs";
import { ProxyConfig, ServerData } from "../types";
import log from "log4js";
import crypto from "crypto";
import { TankTypes } from "../enums/Tank.js";
import { PacketTypes, VariantTypes } from "../enums/Data.js";
import { TextParser } from "./Utils.js";

export class Server {
  public client: Client;
  public proxyNetID: number;
  public config: ProxyConfig;
  public proxy: Proxy;
  public meta: string;
  public klv: string;
  public destPort: string;
  public destIP: string;
  public data: ServerData;
  public hashItemsDat: number;

  constructor(public ip: string, public port: number) {
    this.client = new Client({
      enet: {
        ip,
        port,
        maxPeers: 1024,
        useNewPacket: {
          asServer: true
        }
      }
    });
    // this.client.toggleNewPacket();

    this.config = JSON.parse(readFileSync("./config.json", "utf8"));
    this.proxyNetID = 0;
    this.hashItemsDat = 0;
    this.data = {
      name: ""
    };
  }

  public setProxyNetID(netID: number) {
    this.proxyNetID = netID;
  }

  public setProxy(proxy: Proxy) {
    this.proxy = proxy;
  }

  public setMeta(meta: string) {
    this.meta = meta;
  }

  public setKlv(klv: string) {
    this.klv = klv;
  }

  public setDestPort(port: string) {
    this.destPort = port;
  }

  public setDestIP(ip: string) {
    this.destIP = ip;
  }

  public setHashItemsDat(num: number) {
    this.hashItemsDat = num;
  }

  public toFullBuffer(data: Buffer) {
    return data.toString("hex").match(/../g).join(" ");
  }

  public get peer() {
    return new Peer(this.client, this.proxy.serverNetID);
  }

  public get peerProxy() {
    return new Peer(this.proxy.client, this.proxyNetID);
  }

  public start() {
    this.client
      .on("ready", () => {
        log.getLogger("READY").info("Server Ready!");
      })
      .on("connect", async (netID) => {
        log
          .getLogger("CONNECT")
          .info(`New Client connected to server: ${netID} ProxyID: ${this.proxyNetID}`, "\n");

        this.client.host.setTimeout(netID, 0, 0, 12000);
        this.client.host.setPingInterval(netID, 32);

        this.proxy.setServerNetID(netID);

        const connected = this.proxy.client.host.connect(this.destIP, parseInt(this.destPort));
        if (connected)
          log
            .getLogger("CONNECT")
            .info(`Connecting proxy to ${this.destIP}:${this.destPort}`, "\n");
      })
      .on("raw", (netID, channelID, data) => {
        const type = data.readUInt32LE(0);

        switch (type) {
          case PacketTypes.ACTION: {
            const obj = new TextParser(data.subarray(4).toString("utf-8"));

            log.getLogger(`ACTION`).info(`Incoming Action from proxy:\n`, obj.data, "\n");

            this.peerProxy.send(data);

            break;
          }

          case PacketTypes.STR: {
            const obj = new TextParser(data.subarray(4).toString("utf-8"));

            log.getLogger(`STRING`).info(`Incoming String from proxy:\n`, obj.data, "\n");
            this.peerProxy.send(data);
            break;
          }

          case PacketTypes.TANK: {
            const tankType = data.readUint8(4);
            const tank = TankPacket.fromBuffer(data);

            switch (tankType) {
              case TankTypes.STATE: {
                const x = Math.floor(tank.data.xPos / 32);
                const y = Math.floor(tank.data.yPos / 32);
                const variant = Variant.from(
                  { netID },
                  "OnNameChanged",
                  `${this.data.name} \`4[${x}, ${y}]`,
                  ""
                );
                this.peer.send(variant);
                this.peerProxy.send(data);
                break;
              }

              case TankTypes.SEND_ITEM_DATABASE_DATA: {
                // ignore

                log
                  .getLogger(`TANK`)
                  .info(`Incoming TankType ${TankTypes[tankType]} from proxy:\nTOO LONG`, "\n");
                this.peerProxy.send(data);
                break;
              }
              case TankTypes.SEND_MAP_DATA: {
                // ignore

                log
                  .getLogger(`TANK`)
                  .info(`Incoming TankType ${TankTypes[tankType]} from proxy:\nTOO LONG`, "\n");
                this.peerProxy.send(data);
                break;
              }

              case TankTypes.DISCONNECT: {
                log
                  .getLogger(`TANK`)
                  .info(
                    `Incoming TankType ${TankTypes[tankType]} from proxy:\n${this.toFullBuffer(
                      data
                    )}`,
                    "\n"
                  );

                this.peer.send(data);
                this.peer.disconnect("now");
                this.peerProxy.send(data);
                this.peerProxy.disconnect("now");
                break;
              }

              case TankTypes.CALL_FUNCTION: {
                const variant = Variant.toArray(data);

                log
                  .getLogger(`TANK`)
                  .info(
                    `Incoming VariantList from proxy:\n${variant
                      .map((v) => `[${v.typeName}]: ${v.value}`)
                      .join("\n")}`,
                    "\n"
                  );
                this.peerProxy.send(data);
                break;
              }

              default: {
                const tankData = this.toFullBuffer(data.subarray(0, 60));
                const extraLength = data.readUInt32LE(56);
                const extraData =
                  extraLength > 0 ? this.toFullBuffer(data.subarray(60, 60 + extraLength)) : "None";

                log
                  .getLogger(`TANK`)
                  .info(
                    `Incoming TankType ${TankTypes[tankType]} from proxy:\nTank Data:\n${tankData}\n\nExtra Data:\n${extraData}`,
                    "\n"
                  );

                this.peerProxy.send(data);

                break;
              }
            }

            break;
          }

          default: {
            log
              .getLogger(`PACKET`)
              .info(
                `Incoming UnknownPacket ${PacketTypes[type]} from proxy:\n${this.toFullBuffer(
                  data
                )}`,
                "\n"
              );
            this.peerProxy.send(data);
            break;
          }
        }
      })
      .on("disconnect", (netID) => {
        log.getLogger("DISCONNECT").info("Client disconnected", netID, "\n");
        this.proxy.client.host.disconnect(this.proxyNetID);
      })
      .listen();
  }

  public generate_klv(protocol: number, version: string, rid: string) {
    const salts = [
      "e9fc40ec08f9ea6393f59c65e37f750aacddf68490c4f92d0d2523a5bc02ea63",
      "c85df9056ee603b849a93e1ebab5dd5f66e1fb8b2f4a8caef8d13b9f9e013fa4",
      "3ca373dffbf463bb337e0fd768a2f395b8e417475438916506c721551f32038d",
      "73eff5914c61a20a71ada81a6fc7780700fb1c0285659b4899bc172a24c14fc1"
    ];

    const values = [
      crypto
        .createHash("sha256")
        .update(
          crypto
            .createHash("md5")
            .update(crypto.createHash("sha256").update(`${protocol}`).digest("hex"))
            .digest("hex")
        )
        .digest("hex"),
      crypto
        .createHash("sha256")
        .update(crypto.createHash("sha256").update(version).digest("hex"))
        .digest("hex"),
      crypto
        .createHash("sha256")
        .update(crypto.createHash("sha256").update(`${protocol}${salts[3]}`).digest("hex"))
        .digest("hex")
    ];

    const generate_rid = crypto
      .createHash("sha256")
      .update(crypto.createHash("md5").update(rid).digest("hex"))
      .digest("hex");

    return crypto
      .createHash("sha256")
      .update(values[0] + salts[0] + values[1] + salts[1] + generate_rid + salts[2] + values[2])
      .digest("hex");
  }
}
