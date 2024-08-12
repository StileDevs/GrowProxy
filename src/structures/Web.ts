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

const options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
};

export function Web(proxy: Proxy, server: Server) {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use("/growtopia/server_data.php", async (req, res) => {
    const growtopia = await axios.get("https://dns.google/resolve?name=www.growtopia1.com&type=A");
    const body = req.body;

    if (growtopia.data.Status !== DomainResolverStatus.NoError)
      return res.status(400).send("Failed");

    const answer = growtopia.data.Answer;
    const ip = answer[answer.length - 1].data as string;

    log.getLogger(`REQUEST`).info(`Fetching ${ip}`);
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
