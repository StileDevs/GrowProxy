import axios from "axios";
import express from "express";
import { readFileSync } from "fs";
import http from "http";
import https from "https";
import log from "log4js";
import { DomainResolverStatus } from "../enums/Data.js";
import { TextParser } from "./Utils.js";
import type { Proxy } from "./Proxy.js";
import type { Server } from "./Server.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { PlayerRouter } from "../routes/api/growtopia/player.js";

const options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
};

export function Web(server: Server, proxy: Proxy) {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use("/assets", express.static(path.join(__dirname, "..", "..", "build", "assets")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "build", "index.html"));
  });

  app.use("/api/growtopia/player", PlayerRouter(server, proxy));

  app.use("/growtopia/server_data.php", async (req, res) => {
    let host = server.config.server.host;
    let ip: string;

    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      log.getLogger(`REQUEST`).info(`Fetching config host: ${host}`);
      const growtopia = await axios.get(`https://dns.google/resolve?name=${host}&type=A`);
      if (growtopia.data.Status !== DomainResolverStatus.NoError)
        return res.status(400).send("Failed");

      const answer = growtopia.data.Answer;
      ip = answer[answer.length - 1].data as string;
      log.getLogger(`REQUEST`).info(`Successfully getting ip address of host ${host}: ${ip}`);
    } else ip = server.config.server.host;

    const body = req.body;

    log.getLogger(`REQUEST`).info(`Fetching web server: ${ip}`);
    const result = await axios({
      method: "POST",
      url: `https://${ip}/growtopia/server_data.php?platform=${body.platform}&protocol=${body.protocol}&version=${body.version}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "UbiServices_SDK_2022.Release.9_PC64_ansi_static",
        Host: "www.growtopia1.com"
      },
      data: `version=${body.version}&platform=${body.platform}&protocol=${body.protocol}`,
      httpsAgent: new https.Agent({
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

    const str = textParsed.toString(true);
    res.send(str);
  });

  const httpServer = http.createServer(app);
  const httpsServer = https.createServer(options, app);

  httpServer.listen(80);
  httpsServer.listen(443);
}
