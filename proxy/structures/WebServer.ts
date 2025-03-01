import { Hono } from "hono";

export class WebServer {
  public app: Hono;

  constructor(public port: number) {
    this.app = new Hono();
  }

  public async serve() {
    await this.routes();

    Bun.serve({
      fetch: this.app.fetch,
      port: this.port,
    });
  }

  public async routes() {
    this.app.get("/", (c) => c.text("Hello World"));
  }
}
