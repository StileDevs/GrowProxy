import { Client, TextPacket, Peer, TankPacket, Variant } from "growtopia.js";
import { Proxy } from "./Proxy.js";
import { readFileSync } from "fs";
import ansi from "ansi-colors";
import { ProxyConfig } from "../types";
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

  constructor(public ip: string, public port: number) {
    this.client = new Client({
      enet: {
        ip,
        port,
        maxPeers: 1024,
        useNewPacket: {
          asClient: false
        }
      },
      https: {
        enetPort: port,
        enable: false,
        ip
        // type2: true
      }
    });
    // this.client.toggleNewPacket();

    this.config = JSON.parse(readFileSync("./config.json", "utf8"));
    this.proxyNetID = 0;
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

  public toFullBuffer(data: Buffer) {
    return data.toString("hex").match(/../g).join(" ");
  }

  public start() {
    this.client
      .on("ready", () => {
        log.getLogger("READY").info("Server Ready!");
      })
      .on("connect", async (netID) => {
        console.log(this);
        // const peer = new Peer(this.client, this.proxy.serverNetID);

        log
          .getLogger("CONNECT")
          .info(`New Client connected to server: ${netID} ProxyID: ${this.proxyNetID}`);

        this.proxy.setServerNetID(netID);

        if (this.proxy.onsendserver) {
          const peerProxy = new Peer(this.proxy.client, this.proxyNetID);

          console.log(peerProxy.data.enet.getState());

          const connected = this.proxy.client.connect(
            "213.179.209.168",
            parseInt(this.destPort),
            this.proxyNetID
          );
          if (connected) log.getLogger("CONNECT").info(`Connecting proxy to 213.179.209.168`);
        } else {
          const connected = this.proxy.client.connect(
            "213.179.209.168",
            parseInt(this.destPort),
            this.proxyNetID
          );
          if (connected) log.getLogger("CONNECT").info(`Connecting proxy to 213.179.209.168`);
        }
      })
      .on("raw", (netID, data) => {
        console.log(`[${netID}] Server Received`, this.toFullBuffer(data), "\n");
        const type = data.readUInt32LE(0);
        const peerProxy = new Peer(this.proxy.client, this.proxyNetID);
        const peer = new Peer(this.client, this.proxy.serverNetID);

        switch (type) {
          case PacketTypes.ACTION: {
            const parsed = new TextParser(data.toString("utf-8"));

            console.log(parsed);

            // if ((parsed.action as string).replace(/\x00/gm, "") === "quit") {
            //   if (this.proxyNetID > -1) this.proxy.client._client.disconnect(this.proxyNetID);
            // }

            // log
            //   .getLogger(ansi.yellowBright("ACTION"))
            //   .info(`[${netID}] Server Received\n`, data.subarray(4).toString());

            // peerProxy.send(data);

            break;
          }

          case PacketTypes.STR: {
            const obj = new TextParser(data.subarray(4).toString("utf-8"));
            console.log(obj.data);

            peerProxy.send(data);

            /*

            if (strObj["requestedName"]) {
              const klv = this.generate_klv(
                parseInt(strObj.protocol as string),
                strObj.game_version as string,
                strObj.rid as string
              );
              // console.log("klv", klv);

              strObj.meta = this.meta;
              // strObj.country = "jp";
              if (!this.klv) this.setKlv(strObj.klv as string);
              strObj.klv = this.klv;
            }

            console.log(strObj);
            const buf = Buffer.alloc(4 + str.length);
            buf.writeUint32LE(2, 0);
            buf.write(parseText(strObj), 4);

            // console.log(this.toFullBuffer(buf));
            data = buf;

            log
              .getLogger(ansi.cyan(`STRING`))
              .info(`[${netID}] Server Received\n`, data.subarray(4).toString());

            peerProxy.send(data);
            */
            break;
          }

          case PacketTypes.TANK: {
            const tankType = data.readUint8(4);
            log
              .getLogger(ansi.blueBright(`TANK | Length: ${data.length}`))
              .info(`[${netID}] Server Received ${TankTypes[tankType]}`);

            switch (tankType) {
              case TankTypes.SEND_ITEM_DATABASE_DATA: {
                // ignore
                peerProxy.send(data);

                break;
              }

              case TankTypes.DISCONNECT: {
                // peerProxy.send(data);
                // this.proxy.client._client.disconnectNow(this.proxyNetID);

                // this.proxy.disconnectSelf();

                peer.send(data);
                peerProxy.send(data);
                peer.disconnect("now");
                peerProxy.disconnect("now");

                // peerProxy.disconnect("normal");
                // peer.disconnect("normal");

                break;
              }

              case TankTypes.CALL_FUNCTION: {
                const variant = Variant.toArray(data);

                log
                  .getLogger(`${VariantTypes[variant[0].type]} | VariantList`)
                  .info("\n", variant.map((v) => `[${v.index}]: ${v.value}`).join("\n"));
                peerProxy.send(data);

                break;
              }

              default: {
                log.getLogger(`${TankTypes[tankType]}`).info(`${this.toFullBuffer(data)}`);
                peerProxy.send(data);

                break;
              }
            }

            break;
          }
        }
      })
      .on("disconnect", (netID) => {
        console.log("Client disconnected", netID);
        this.proxy.client._client.disconnect(this.proxyNetID);
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
