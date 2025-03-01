import { DomainResolverStatus } from "../enums/Data";
import { TextParser } from "../utils/utils";
import { WebServer } from "./WebServer";
import type { BunFile } from "bun";
import ky from "ky";

export class TlsWebServer extends WebServer {
  private readonly tls: Record<string, BunFile>;

  constructor(
    public port: number,
    public data?: TextParser,
  ) {
    super(port);
    this.tls = {
      key: Bun.file("./assets/ssl/server.key"),
      cert: Bun.file("./assets/ssl/server.crt"),
    };
  }

  public override async serve() {
    await this.routes();

    Bun.serve({
      fetch: this.app.fetch,
      port: this.port,
      // @ts-expect-error probably a bug in the types
      tls: {
        key: this.tls.key,
        cert: this.tls.cert,
      },
    });
  }

  public override async routes() {
    this.app.post("/growtopia/server_data.php", async (ctx) => {
      const headers = ctx.req.header();
      const formData = await ctx.req.formData();
      const platform = formData.get("platform") as string;
      const protocol = formData.get("protocol") as string;
      const version = formData.get("version") as string;
      const userAgent = headers["user-agent"];
      const headerHost = headers["host"];

      const host = (await this.getDNSIp("www.growtopia1.com")) as string;

      const data = await this.getServerDataPhp(
        host,
        platform,
        protocol,
        version,
        userAgent,
        headerHost,
      );

      const text = new TextParser(data);

      text.set("server", "127.0.0.1");
      text.set("port", "17091");
      text.delete("type2");
      text.delete("RTENDMARKERBS1001");

      const str = text.toString(true);
      console.log(str);

      return ctx.body(str);
    });
  }

  private async getDNSIp(host: string) {
    const resp = await ky.get(`https://dns.google/resolve?name=${host}&type=A`);

    if (resp.status !== 200) return undefined;

    const data = await resp.json<Record<string, number | string | string[] | boolean | unknown>>();
    if ((data.Status as number) !== DomainResolverStatus.NoError) return undefined;

    const answer = data.Answer as { data: string }[];
    return answer[answer.length - 1].data;
  }

  private async getServerDataPhp(
    host: string,
    platform: string,
    protocol: string,
    version: string,
    userAgent: string,
    headerHost: string,
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const resp = await ky.post(
      `https://${host}/growtopia/server_data.php?platform=${platform}&protocol=${protocol}&version=${version}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
          "User-Agent": userAgent,
          Host: headerHost,
        },
        body: `version=${version}&platform=${platform}&protocol=${protocol}`,
      },
    );
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = undefined;

    const text = await resp.text();

    return text;
  }
}
