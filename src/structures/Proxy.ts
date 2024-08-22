import { Client, TextPacket, Peer, TankPacket, Variant } from "growtopia.js";
import { Server } from "./Server.js";
import log from "log4js";
import { PacketTypes, VariantTypes } from "../enums/Data.js";
import { TankTypes } from "../enums/Tank.js";
import { TextParser } from "./Utils.js";
import type { ProxyData } from "../types/index.js";
import { inflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";

export class Proxy {
  public client: Client;
  public serverNetID: number;
  public server: Server;
  public onsendserver: boolean;
  public data: ProxyData;

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
        ip,
        enetPort: port,
        enable: false,
        type2: false
      }
    });

    if (this.client.config.enet.useNewPacket.asClient) this.client.toggleNewPacket();

    this.serverNetID = 0;
    this.onsendserver = false;
    this.data = {
      name: ""
    };
  }

  public setServerNetID(netID: number) {
    this.serverNetID = netID;
  }

  public setServer(server: Server) {
    this.server = server;
  }

  public setOnSend(bool: boolean) {
    this.onsendserver = bool;
  }

  public toFullBuffer(data: Buffer) {
    return data.toString("hex").match(/../g).join(" ");
  }

  public disconnectSelf() {
    this.client._client.disconnectNow(this.server.proxyNetID);
  }

  public get peer() {
    return new Peer(this.server.client, this.serverNetID);
  }

  public get peerProxy() {
    return new Peer(this.client, this.server.proxyNetID);
  }

  public start() {
    this.client
      .on("ready", () => {
        log.getLogger("READY").info("Proxy Ready!");
      })
      .on("connect", (netID) => {
        log.getLogger("CONNECT").info(`Proxy successfully connect`, "\n");

        this.server.setProxyNetID(netID);
      })
      .on("disconnect", (netID) => {
        log.getLogger("DISCONNECT").info(`Proxy disconnect`, netID, "\n");
      })
      .on("raw", (netID, data) => {
        const type = data.readUInt32LE(0);

        switch (type) {
          case PacketTypes.HELLO: {
            log
              .getLogger(`HELLO`)
              .info(`Incoming HelloPacket from server:\n${this.toFullBuffer(data)}`, "\n");

            this.peer.send(data);
            break;
          }

          case PacketTypes.ACTION: {
            const obj = new TextParser(data.subarray(4).toString("utf-8"));

            log.getLogger(`ACTION`).info(`Incoming Action from server:\n`, obj.data, "\n");
            this.peer.send(data);
            break;
          }

          case PacketTypes.STR: {
            const obj = new TextParser(data.subarray(4).toString("utf-8"));

            log.getLogger(`STRING`).info(`Incoming String from server:\n`, obj.data, "\n");
            this.peer.send(data);
            break;
          }

          case PacketTypes.TANK: {
            const tankType = data.readUint8(4);

            switch (tankType) {
              case TankTypes.CALL_FUNCTION: {
                const variant = Variant.toArray(data);

                log
                  .getLogger(`TANK`)
                  .info(
                    `Incoming VariantList from server:\n${variant
                      .map((v) => `[${v.typeName}]: ${v.value}`)
                      .join("\n")}`,
                    "\n"
                  );

                if (variant[0].typeName === "STRING") {
                  switch (variant[0].value) {
                    case "OnConsoleMessage": {
                      const newText = `\`4[PROXY]\`\` ${variant[1].value}`;

                      data = Variant.from("OnConsoleMessage", newText).parse().parse();
                      this.peer.send(data);
                      break;
                    }

                    case "OnSpawn": {
                      const obj = new TextParser(variant[1].value as string);
                      obj.set("mstate", "1");
                      // obj.set("smstate", "0");
                      data = Variant.from({ delay: -1 }, "OnSpawn", obj.toString()).parse().parse();
                      this.peer.send(data);
                      break;
                    }

                    case "OnNameChanged": {
                      this.server.data.name = variant[1].value as string;
                      break;
                    }
                    case "OnSendToServer": {
                      const tokenize = (variant[4].value as string).split("|");

                      data = Variant.from(
                        "OnSendToServer",
                        this.server.port,
                        variant[2].value,
                        variant[3].value,
                        `127.0.0.1|${tokenize[1]}|${tokenize[2]}`,
                        variant[5].value
                      )
                        .parse()
                        .parse();
                      this.server.setDestIP(tokenize[0]);
                      this.server.setDestPort(`${variant[1]?.value}`);
                      this.setOnSend(true);
                      this.peer.send(data);
                      break;
                    }

                    case "OnSuperMainStartAcceptLogonHrdxs47254722215a": {
                      this.server.setHashItemsDat(parseInt(variant[1].value as string));
                      this.peer.send(data);
                      break;
                    }

                    default: {
                      this.peer.send(data);
                      break;
                    }
                  }
                }

                break;
              }
              case TankTypes.SEND_ITEM_DATABASE_DATA: {
                // ignore
                log
                  .getLogger(`TANK`)
                  .info(
                    `Incoming TankType ${TankTypes[tankType]} from server:\nTOO LONG, SAVING TO "./data/items-dat/${this.server.config.server.host}_${this.server.hashItemsDat}.dat"`,
                    "\n"
                  );

                const extraLength = data.readUInt32LE(56);
                const compressedItemsDat = data.subarray(60, 60 + extraLength);
                let itemsdat: Buffer;

                if (compressedItemsDat.readUint8(0) === 0x78) {
                  itemsdat = inflateSync(compressedItemsDat);
                } else itemsdat = compressedItemsDat;

                mkdirSync("./data/items-dat/", { recursive: true });
                writeFileSync(
                  `./data/items-dat/${this.server.config.server.host}_${this.server.hashItemsDat}.dat`,
                  itemsdat
                );
                this.peer.send(data);
                break;
              }

              case TankTypes.SEND_MAP_DATA: {
                // ignore

                log
                  .getLogger(`TANK`)
                  .info(`Incoming TankType ${TankTypes[tankType]} from server:\nTOO LONG`, "\n");
                this.peer.send(data);
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
                    `Incoming TankType ${TankTypes[tankType]} from server:\nTank Data:\n${tankData}\n\nExtra Data:\n${extraData}`,
                    "\n"
                  );

                this.peer.send(data);
                break;
              }
            }
            break;
          }

          default: {
            log
              .getLogger(`PACKET`)
              .info(
                `Incoming UnknownPacket ${PacketTypes[type]} from server:\n${this.toFullBuffer(
                  data
                )}`,
                "\n"
              );
            this.peer.send(data);
            break;
          }
        }
      })
      .listen();
  }
}
