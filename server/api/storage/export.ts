import { storage } from "~/server/services/storage";

interface ExportQuery {
  type?: string;
  format?: "json" | "csv";
  startDate?: string;
  endDate?: string;
}

interface StorageItem {
  key: string;
  type?: string;
  timestamp?: string;
  netID?: number;
  channelID?: number;
  message?: string;
  data?: string;
  [key: string]: unknown;
}

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method Not Allowed"
    });
  }

  const query = getQuery(event) as ExportQuery;
  const { type, format = "json", startDate, endDate } = query;

  try {
    // Get all keys from storage
    let keys = await storage.getKeys();

    // Filter by type if provided
    if (type) {
      keys = keys.filter((key) => key.startsWith(`${type}_`));
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      keys = keys.filter((key) => {
        const timestamp = parseInt(key.split(":")[1] || "0");
        const eventDate = new Date(timestamp);

        if (startDate && eventDate < new Date(startDate)) return false;
        if (endDate && eventDate > new Date(endDate)) return false;

        return true;
      });
    }

    // Get all data
    const data: StorageItem[] = await Promise.all(
      keys.map(async (key) => {
        const value = await storage.getItem(key);
        return {
          key,
          ...(value && typeof value === "object" ? (value as Record<string, unknown>) : { data: value })
        } as StorageItem;
      })
    );

    // Sort by timestamp
    data.sort((a, b) => {
      const timestampA = parseInt(a.key.split(":")[1] || "0");
      const timestampB = parseInt(b.key.split(":")[1] || "0");
      return timestampB - timestampA;
    });

    if (format === "csv") {
      // Convert to CSV format
      const csvHeaders = ["key", "type", "timestamp", "netID", "channelID", "message", "data"];
      const csvRows = data.map((item) => [
        item.key,
        item.type || "",
        item.timestamp || "",
        item.netID || "",
        item.channelID || "",
        item.message || "",
        item.data || ""
      ]);

      const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );

      setHeader(event, "Content-Type", "text/csv");
      setHeader(event, "Content-Disposition", `attachment; filename="storage-export-${Date.now()}.csv"`);

      return csvContent;
    }

    // Return JSON format
    setHeader(event, "Content-Type", "application/json");
    setHeader(event, "Content-Disposition", `attachment; filename="storage-export-${Date.now()}.json"`);

    return {
      success: true,
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      filters: { type, startDate, endDate },
      data
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to export storage data",
      data: error
    });
  }
});
