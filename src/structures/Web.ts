import axios from "axios";
import { readFileSync } from "fs";
import log from "log4js";
import { DomainResolverStatus } from "../enums/Data.js";
import { TextParser } from "./Utils.js";
import type { Proxy } from "./Proxy.js";
import type { Server } from "./Server.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { join, relative } from "path";
import { serve } from "@hono/node-server";
import { createServer, Agent } from "https";

import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { ApiRoute } from "../routes/api.js";

const options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
};

export function Web(server: Server, proxy: Proxy) {
  const app = new Hono();

  app.use(logg((str, ...rest) => log.getLogger("WEBSERVER").info(str, ...rest)));
  app.use(
    "/assets",
    serveStatic({
      root: relative(__dirname, join(__dirname, "..", "..", "build", "assets"))
    })
  );

  app.get("/", (ctx) => {
    return ctx.html(join(__dirname, "..", "..", "build", "index.html"));
  });

  // app.use("/api/growtopia/player", PlayerRouter(server, proxy));
  app.route("/", new ApiRoute(server, proxy).execute());

  app.all("/growtopia/server_data.php", async (ctx) => {
    let host = server.config.server.host;
    let ip: string;

    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      log.getLogger(`REQUEST`).info(`Fetching config host: ${host}`);
      const growtopia = await axios.get(`https://dns.google/resolve?name=${host}&type=A`);
      if (growtopia.data.Status !== DomainResolverStatus.NoError) return ctx.status(400);

      const answer = growtopia.data.Answer;
      ip = answer[answer.length - 1].data as string;
      log.getLogger(`REQUEST`).info(`Successfully getting ip address of host ${host}: ${ip}`);
    } else ip = server.config.server.host;

    const body = await ctx.req.parseBody();

    log.getLogger(`REQUEST`).info(`Fetching web server: ${ip}`);
    const headers = ctx.req.header();

    const result = await axios({
      method: "POST",
      url: `https://${ip}/growtopia/server_data.php?platform=${body.platform}&protocol=${body.protocol}&version=${body.version}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": headers["user-agent"],
        Host: headers.host
      },
      data: `version=${body.version}&platform=${body.platform}&protocol=${body.protocol}`,
      httpsAgent: new Agent({
        rejectUnauthorized: false
      })
    });

    const textParsed = new TextParser(result.data);

    server.setMeta(textParsed.get("meta"));
    server.setDestPort(textParsed.get("port"));

    const serverIP = textParsed.get("server");
    server.setDestIP(serverIP || ip);

    textParsed.set("server", "127.0.0.1");
    textParsed.set("port", "17094");
    textParsed.delete("type2");
    textParsed.delete("RTENDMARKERBS1001");

    const str = textParsed.toString(true);

    return ctx.body(str);
  });

  serve(
    {
      fetch: app.fetch,
      port: 443,
      createServer,
      serverOptions: {
        key: options.key,
        cert: options.cert
      }
    },
    (info) => {
      console.log(`⛅ Running HTTPS server on https://localhost`);
    }
  );
}
