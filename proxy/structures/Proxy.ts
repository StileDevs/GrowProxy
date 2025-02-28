import { Client } from "growtopia.js";

export class Proxy {
  public client: Client;

  constructor(
    public ip = "0.0.0.0",
    public port = 0,
  ) {}
}
