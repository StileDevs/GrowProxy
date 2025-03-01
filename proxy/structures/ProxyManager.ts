import { Proxy } from "./Proxy";
import { Server } from "./Server";

export class ProxyManager {
  public server: Server;
  public proxies: Proxy[];

  constructor() {
    this.server = new Server();

    this.proxies = [];
  }

  public createProxy(ip: string, port: number) {
    this.proxies.push(new Proxy(ip, port));
  }
}
