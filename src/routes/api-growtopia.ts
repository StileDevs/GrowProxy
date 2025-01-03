import type { Proxy } from "../structures/Proxy.js";
import type { Server } from "../structures/Server.js";
import { Variant } from "growtopia.js";

import { Hono } from "hono";

export class ApiGrowtopiaRoute {
  public app = new Hono().basePath("/growtopia");

  constructor(public server: Server, public proxy: Proxy) {}

  public execute() {
    this.app.get("/change-name", (ctx) => {
      const { name } = ctx.req.query();

      this.server.peer.send(
        Variant.from({ netID: this.proxy.serverNetID }, "OnNameChanged", "HelloWorld", "")
      );
      return ctx.json({ message: "Hello, world!" });
    });

    return this.app;
  }
}
