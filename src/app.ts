import { Proxy } from "./structures/Proxy";
import { Server } from "./structures/Server";

const proxy = new Proxy("0.0.0.0", 17093);
const server = new Server("127.0.0.1", 17094);

proxy.setServer(server);
server.setProxy(proxy);

proxy.start();
server.start();
