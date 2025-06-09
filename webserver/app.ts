import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serve } from "@hono/node-server";
import { createServer } from "https";
import { readFile } from "fs/promises";

(async () => {
  const app = new Hono();
  app.use(logg((str, ...rest) => console.log(str, ...rest)));
  const key = await readFile("./assets/ssl/server.key");
  const cert = await readFile("./assets/ssl/server.crt");
  app.all("/server_data.php", (ctx) => {
    let str = "";
    str += `server|127.0.0.1\n`;
    str += `port|17091\nloginurl|login.growtopiagame.com\ntype|1\ntype2|1\n#maint|test\nmeta|ignoremeta\nRTENDMARKERBS1001`;
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
