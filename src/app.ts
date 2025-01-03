import { Proxy } from "./structures/Proxy.js";
import { Server } from "./structures/Server.js";
import log4js from "log4js";
import { Web } from "./structures/Web.js";

log4js.configure({
  appenders: {
    out: {
      type: "console"
    },
    file: {
      type: "file",
      filename: "data/log/proxy.log"
    }
  },
  categories: {
    default: {
      appenders: ["out", "file"],
      level: "all"
    }
  }
});

const proxy = new Proxy("127.0.0.1", 0);
const server = new Server("127.0.0.1", 17094);

proxy.setServer(server);
server.setProxy(proxy);

proxy.start();
server.start();
Web(server, proxy);
