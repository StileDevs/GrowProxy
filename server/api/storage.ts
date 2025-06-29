import { storage } from "~/server/services/storage";

interface GetStorageQuery {
  type?: string;
  limit?: string | number;
  offset?: string | number;
}

interface DeleteStorageQuery {
  key?: string;
  type?: string;
  all?: string;
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const query = getQuery(event);

  switch (method) {
    case "GET":
      return await handleGetStorageData(query as GetStorageQuery);
    case "DELETE":
      return await handleDeleteStorageData(query as DeleteStorageQuery);
    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed"
      });
  }
});

async function handleGetStorageData(query: GetStorageQuery) {
  const { type, limit = 100, offset = 0 } = query;

  try {
    // Get all keys from storage
    const keys = await storage.getKeys();

    // Filter keys based on type if provided
    let filteredKeys = keys;
    if (type) {
      filteredKeys = keys.filter((key) => key.startsWith(`${type}_`));
    }

    // Sort keys by timestamp (newest first)
    filteredKeys.sort((a, b) => {
      const timestampA = parseInt(a.split(":")[1] || "0");
      const timestampB = parseInt(b.split(":")[1] || "0");
      return timestampB - timestampA;
    });

    // Apply pagination
    const paginatedKeys = filteredKeys.slice(Number(offset), Number(offset) + Number(limit));

    // Get the actual data for these keys
    const data = await Promise.all(
      paginatedKeys.map(async (key) => {
        const value = await storage.getItem(key);
        return {
          key,
          ...(value && typeof value === "object" ? value : { data: value })
        };
      })
    );

    return {
      success: true,
      data,
      total: filteredKeys.length,
      offset: Number(offset),
      limit: Number(limit)
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to retrieve storage data",
      data: error
    });
  }
}

async function handleDeleteStorageData(query: DeleteStorageQuery) {
  const { key, type, all } = query;

  try {
    if (all === "true") {
      // Delete all storage data
      const keys = await storage.getKeys();
      await Promise.all(keys.map((k) => storage.removeItem(k)));
      return {
        success: true,
        message: "All storage data cleared",
        deletedCount: keys.length
      };
    } else if (type) {
      // Delete all data of a specific type
      const keys = await storage.getKeys();
      const filteredKeys = keys.filter((k) => k.startsWith(`${type}_`));
      await Promise.all(filteredKeys.map((k) => storage.removeItem(k)));
      return {
        success: true,
        message: `All ${type} data cleared`,
        deletedCount: filteredKeys.length
      };
    } else if (key) {
      // Delete specific key
      await storage.removeItem(key);
      return {
        success: true,
        message: `Key ${key} deleted`
      };
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required parameter: key, type, or all"
      });
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete storage data",
      data: error
    });
  }
}
