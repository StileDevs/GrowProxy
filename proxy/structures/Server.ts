import { Client } from "growtopia.js";
import { TlsWebServer } from "./TlsWebServer";

export class Server {
  public client: Client;
  public web: TlsWebServer;

  constructor(
    public ip = "0.0.0.0",
    public port = 17091,
  ) {
    this.client = new Client({
      enet: {
        ip,
        port,
      },
    });
    this.web = new TlsWebServer(443);

    this.client
      .on("connect", (netID) => {
        console.log(`${netID} connected`);
      })
      .on("ready", () => {
        console.log("ENet Server Ready");
      });

    this.client.listen();
    this.web.serve();
  }
}
