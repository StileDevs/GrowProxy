import { Router } from "express";
import type { Proxy } from "../../../structures/Proxy.js";
import type { Server } from "../../../structures/Server.js";
import { Variant } from "growtopia.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

export function PlayerRouter(server: Server, proxy: Proxy): Router {
  router.get("/change-name", (req, res) => {
    const name = req.body.name;
    server.peer.send(Variant.from({ netID: proxy.serverNetID }, "OnNameChanged", "HelloWorld", ""));
    res.sendStatus(200);
  });
  return router;
}
