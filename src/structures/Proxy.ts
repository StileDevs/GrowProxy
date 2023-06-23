import {
  Client,
  TextPacket,
  Peer,
  TankPacket,
  Variant,
  PacketTypes,
  parseText,
  TankTypes
} from "growtopia.js";
import { Server } from "./Server";
import ansi from "ansi-colors";

export class Proxy {
  public client: Client;
  public serverNetID: number;
  public server: Server;

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
        port,
        enable: false,
        url: "0.0.0.0",
        type2: false
      }
    });

    this.serverNetID = 0;
  }

  public setServerNetID(netID: number) {
    this.serverNetID = netID;
  }

  public setServer(server: Server) {
    this.server = server;
  }

  public start() {
    this.client
      .on("ready", () => {
        console.log("Proxy ready!");
      })
      .on("connect", (netID) => {
        console.log("New Peer connected to Proxy: ", netID);
        this.server.setProxyNetID(netID);
      })
      .on("raw", (netID, data) => {
        // console.log(`[${netID}] Proxy Received`, data.toString("hex").match(/../g).join(" "), "\n");
        const type = data.readUInt32LE(0);
        const peer = new Peer(this.server.client, this.serverNetID);

        switch (type) {
          case PacketTypes.ACTION: {
            const parsed = parseText(data);

            console.log(
              `[${netID}] Proxy Received ${ansi.yellowBright("[ACTION]")}\n`,
              parsed,
              "\n"
            );
            break;
          }

          case PacketTypes.TANK: {
            const tankType = data.readUint8(4);
            console.log(
              `[${netID}] Proxy Received ${ansi.blueBright(
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

              case TankTypes.CALL_FUNCTION: {
                const count = data.readUint16LE(60);
                const VariantType = data.readUint8(62);

                if (VariantType === 2) {
                  const strLength = data.readUint16LE(63);
                  const strType = data.subarray(67, 67 + strLength).toString();

                  if (strType === "OnConsoleMessage") {
                    const textLength = data.readUint32LE(67 + strLength + 4);
                    const text = data
                      .subarray(67 + strLength + 4, 67 + strLength + 4 + textLength)
                      .toString();

                    const newText = `\`4[PROXY]\`\` ${data
                      .subarray(67 + strLength + 4, 67 + strLength + 4 + textLength)
                      .toString()}`;

                    data = Variant.from("OnConsoleMessage", newText).parse().parse();
                  }
                }
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
        // if (type === 1) {
        //   // idk
        // } else if (type === 4) {
        //   const tank = TankPacket.fromBuffer(data);
        //   if (tank.data.type === 1) {
        //     // peer.send(Variant.from("OnConsoleMessage", "Sucessfully connect with `4proxy"));
        //   }
        // }
        peer.send(data);
      })
      .listen();
  }
}
