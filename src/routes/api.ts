import type { Proxy } from "../structures/Proxy.js";
import type { Server } from "../structures/Server.js";

import { Hono } from "hono";
import { ApiGrowtopiaRoute } from "./api-growtopia.js";

export class ApiRoute {
  public app = new Hono().basePath("/api");

  constructor(public server: Server, public proxy: Proxy) {}

  public execute() {
    this.app.route("/", new ApiGrowtopiaRoute(this.server, this.proxy).execute());

    return this.app;
  }
}
