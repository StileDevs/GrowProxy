import { storage } from "~/server/services/storage";

interface StatsResponse {
  success: boolean;
  stats: {
    totalEvents: number;
    clientEvents: number;
    clientRawEvents: number;
    serverEvents: number;
    serverRawEvents: number;
    oldestEvent?: string;
    newestEvent?: string;
  };
}

export default defineEventHandler(async (_event): Promise<StatsResponse> => {
  try {
    const keys = await storage.getKeys();

    const clientEventKeys = keys.filter((key) => key.startsWith("client_events:"));
    const clientRawKeys = keys.filter((key) => key.startsWith("client_raw:"));
    const serverEventKeys = keys.filter((key) => key.startsWith("server_events:"));
    const serverRawKeys = keys.filter((key) => key.startsWith("server_raw:"));

    // Get timestamps for oldest and newest events
    const timestamps = keys
      .map((key) => {
        const timestamp = key.split(":")[1];
        return timestamp ? parseInt(timestamp) : 0;
      })
      .filter((t) => t > 0);

    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : undefined;

    return {
      success: true,
      stats: {
        totalEvents: keys.length,
        clientEvents: clientEventKeys.length,
        clientRawEvents: clientRawKeys.length,
        serverEvents: serverEventKeys.length,
        serverRawEvents: serverRawKeys.length,
        oldestEvent: oldestTimestamp ? new Date(oldestTimestamp).toISOString() : undefined,
        newestEvent: newestTimestamp ? new Date(newestTimestamp).toISOString() : undefined
      }
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get storage statistics",
      data: error
    });
  }
});
