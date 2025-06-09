import { useGrowClient, useGrowServer } from "../lib/grow-proxy";

export default defineEventHandler((_event) => {
  const client = useGrowClient();
  const server = useGrowServer();

  console.log("client", client);
  console.log("server", server);
  return { hello: "world" };
});
