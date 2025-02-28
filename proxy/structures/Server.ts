import { Client } from "growtopia.js";

export class Server {
  public client: Client;

  constructor(
    public ip = "0.0.0.0",
    public port = 0,
  ) {}
}
