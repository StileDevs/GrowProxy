import { useGrowProxy } from "../lib/grow-proxy";

export default defineEventHandler((_event) => {
  const proxy = useGrowProxy();

  return { hello: "world" };
});
