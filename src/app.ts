import { Proxy } from "./structures/Proxy";
import { Server } from "./structures/Server";
import log4js from "log4js";

log4js.configure({
  appenders: {
    out: {
      type: "console"
    },
    file: {
      type: "file",
      filename: "log/proxy.log"
    }
  },
  categories: {
    default: {
      appenders: ["out", "file"],
      level: "all"
    }
  }
});

const proxy = new Proxy("127.0.0.1", 17069);
const server = new Server("127.0.0.1", 17094);

proxy.setServer(server);
server.setProxy(proxy);

proxy.start();
server.start();
