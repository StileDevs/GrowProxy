import { Client, TextPacket, Peer, TankPacket, Variant } from "growtopia.js";
import { Server } from "./Server.js";
import ansi from "ansi-colors";
import log from "log4js";
import { PacketTypes, VariantTypes } from "../enums/Data.js";
import { TankTypes } from "../enums/Tank.js";
import { TextParser } from "./Utils.js";

export class Proxy {
  public client: Client;
  public serverNetID: number;
  public server: Server;
  public onsendserver: boolean;

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

  public start() {
    this.client
      .on("ready", () => {
        log.getLogger("READY").info("Proxy Ready!");
      })
      .on("connect", (netID) => {
        log.getLogger("CONNECT").info(`Proxy successfully connect`);

        this.server.setProxyNetID(netID);
      })
      .on("disconnect", (netID) => {
        console.log(`Proxy disconnect`, netID);
      })
      .on("raw", (netID, data) => {
        console.log(`[${netID}] Proxy Received`, this.toFullBuffer(data), "\n");
        const type = data.readUInt32LE(0);
        const peer = new Peer(this.server.client, this.serverNetID);
        const peerProxy = new Peer(this.client, netID);

        switch (type) {
          case PacketTypes.HELLO: {
            peer.send(data);
            break;
          }

          case PacketTypes.ACTION: {
            const parsed = new TextParser(data.subarray(4).toString("utf-8"));
            console.log(parsed.data);

            log
              .getLogger(ansi.yellowBright("ACTION"))
              .info(`[${netID}] Proxy Received\n${data.subarray(4).toString()}`);
            peer.send(data);
            break;
          }

          case PacketTypes.STR: {
            log
              .getLogger(ansi.cyan(`STRING`))
              .info(`[${netID}] Proxy Received\n`, data.subarray(4).toString());
            peer.send(data);
            break;
          }

          case PacketTypes.TANK: {
            const tankType = data.readUint8(4);

            log
              .getLogger(ansi.blueBright(`TANK | Length: ${data.length}`))
              .info(`[${netID}] Proxy Received ${TankTypes[tankType]}`);

            switch (tankType) {
              case TankTypes.CALL_FUNCTION: {
                const variant = Variant.toArray(data);

                log
                  .getLogger(`${VariantTypes[variant[0].type]} | VariantList`)
                  .info(
                    "\n",
                    variant.map((v) => `[${v.index} | ${v.typeName}]: ${v.value}`).join("\n")
                  );

                if (variant[0].typeName === "STRING" && variant[0].value === "OnConsoleMessage") {
                  const newText = `\`4[PROXY]\`\` ${variant[1].value}`;

                  data = Variant.from("OnConsoleMessage", newText).parse().parse();
                } else if (variant[0].typeName === "STRING" && variant[0].value === "OnSpawn") {
                  const obj = new TextParser(variant[1].value as string);
                  obj.set("mstate", "1");
                  obj.set("smstate", "0");

                  data = Variant.from({ delay: -1 }, "OnSpawn", obj.toString()).parse().parse();
                } else if (
                  variant[0].typeName === "STRING" &&
                  variant[0].value === "OnSendToServer"
                ) {
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
                }

                this.server.setDestPort(`${variant[1].value}`);
                this.setOnSend(true);
                // peerProxy.send(data);
                peer.send(data);

                break;
              }

              default: {
                log.getLogger(`${TankTypes[tankType]}`).info(`${this.toFullBuffer(data)}`);

                peer.send(data);

                break;
              }
            }
            // switch (tankType) {
            //   case TankTypes.SEND_ITEM_DATABASE_DATA: {
            //     // ignore
            //     peer.send(data);
            //     break;
            //   }

            //   case TankTypes.CALL_FUNCTION: {

            //     break;
            //   }

            break;
          }
        }

        // peer.send(data);
      })
      .listen();
  }
}
