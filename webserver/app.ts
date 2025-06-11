import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serve } from "@hono/node-server";
import { Agent, createServer } from "https";
import { readFile, writeFile } from "fs/promises";
import ky from "ky";
import axios from "axios";
import { join } from "path";

(async () => {
  const app = new Hono();
  app.use(logg((str, ...rest) => console.log(str, ...rest)));
  const key = await readFile("./assets/ssl/server.key");
  const cert = await readFile("./assets/ssl/server.crt");

  app.all("/growtopia/server_data.php", async (ctx) => {
    const hostConfigPath = join(process.cwd(), ".config/host.json");
    let hostConfig;
    try {
      hostConfig = JSON.parse(await readFile(hostConfigPath, "utf-8"));
    } catch (error) {
      console.error("Failed to read host.json:", error);
      hostConfig = { host: "www.growtopia1.com" };
    }

    const host = hostConfig.host;

    let ip: string;
    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      console.log(`Fetching config host: ${host}`);
      const growtopia = await ky.get<DomainResolver>(`https://dns.google/resolve?name=${host}&type=A`).json();
      if (growtopia.Status !== DomainResolverStatus.NoError) return ctx.status(400);

      const answer = growtopia.Answer;
      ip = answer[answer.length - 1].data as string;
      console.log(`Successfully getting ip address of host ${host}: ${ip}`);
    } else ip = host;

    const body = await ctx.req.parseBody();
    console.log(`Fetching web server: ${ip}`);
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
    const destPort = textParsed.get("port") || "";
    const destServerIp = textParsed.get("server") || ""; // Update host.json with destination port and IP
    try {
      hostConfig.fetched = {
        port: parseInt(destPort) || 0,
        ip: destServerIp || ip
      };
      await writeFile(hostConfigPath, JSON.stringify(hostConfig, null, 2), "utf-8");
      console.log(`Updated host.json with port: ${destPort}, ip: ${destServerIp || ip}`);
    } catch (error) {
      console.error("Failed to update host.json:", error);
    }

    textParsed.set("server", "127.0.0.1");
    textParsed.set("port", "17091");
    textParsed.delete("RTENDMARKERBS1001");

    console.log(textParsed);
    const str = textParsed.toString(true);

    return ctx.body(str);
  });
  serve(
    {
      fetch: app.fetch,
      port: 443,
      createServer,
      serverOptions: {
        key,
        cert
      }
    },
    () => {
      console.log(`Running HTTPS server using Hono`);
    }
  );
})();

export enum DomainResolverStatus {
  NoError,
  FormatError,
  ServerFail,
  NameError,
  NotImplemented,
  Refused,
  YXDomain,
  YXRRSet,
  NXRRSet,
  NotAuth,
  NotZone
}

export interface DomainResolver {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Question[];
  Answer: Answer[];
  Comment: string;
}

export interface Answer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface Question {
  name: string;
  type: number;
}

export class TextParser {
  public data: Record<string, string | string[]>;

  constructor(input: string) {
    this.data = {};
    this.parse(input);
  }

  private parse(input: string) {
    const lines = input.split("\n");

    lines.forEach((line, i) => {
      const [key, ...values] = line.split("|");
      this.data[key || `arr-${i}`] =
        // eslint-disable-next-line no-control-regex
        values.length > 1 ? values.map((v) => v?.replace(/[\uFFFD\x00]+$/g, "")) : values[0]?.replace(/[\uFFFD\x00]+$/g, "");
    });
  }

  public get(key: string): string | undefined {
    return this.data[key] as string | undefined;
  }

  public set(key: string, value: string): void {
    this.data[key] = value;
  }

  public delete(key: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.data[key];
  }

  public toString(endMarker = false): string {
    const entries = Object.entries(this.data)
      .map(([key, value]) => `${key}|${Array.isArray(value) ? value.join("|") : value}`)
      .join("\n");

    return `${entries}${endMarker ? "\nRTENDMARKERBS1001" : ""}`;
  }
}
