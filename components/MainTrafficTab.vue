<script setup lang="ts">
import { useWebsocket } from "~/composable/useWebsocket";

interface TrafficEvent {
  type: string;
  netID?: number;
  channelID?: number;
  message?: string;
  data?: string;
  timestamp: string;
}

interface ApiResponse {
  success: boolean;
  data: TrafficEvent[];
  total?: number;
  offset?: number;
  limit?: number;
}

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

const { isConnected, transport, emit, on, off, reconnect } = useWebsocket();

const clientTraffic = ref<TrafficEvent[]>([]);
const serverTraffic = ref<TrafficEvent[]>([]);
const activeTab = ref("client"); // 'client' or 'server'
const isLoading = ref(false);
const stats = ref<StatsResponse["stats"] | null>(null);

// Load traffic data from API
const loadTrafficData = async () => {
  try {
    isLoading.value = true;

    // Load client traffic
    const clientResponse = (await $fetch("/api/storage", {
      query: { type: "client", limit: 100 }
    })) as ApiResponse;

    // Load server traffic
    const serverResponse = (await $fetch("/api/storage", {
      query: { type: "server", limit: 100 }
    })) as ApiResponse;

    if (clientResponse.success) {
      clientTraffic.value = clientResponse.data;
    }

    if (serverResponse.success) {
      serverTraffic.value = serverResponse.data;
    }

    // Load stats
    const statsResponse = (await $fetch("/api/storage/stats")) as StatsResponse;
    if (statsResponse.success) {
      stats.value = statsResponse.stats;
    }
  } catch (error) {
    console.error("Failed to load traffic data:", error);
  } finally {
    isLoading.value = false;
  }
};

// Clear traffic data
const clearTrafficData = async (type?: string) => {
  try {
    const query = type ? { type } : { all: "true" };
    await $fetch("/api/storage", {
      method: "DELETE",
      query
    });

    if (type === "client" || !type) {
      clientTraffic.value = [];
    }
    if (type === "server" || !type) {
      serverTraffic.value = [];
    }

    // Reload stats
    await loadTrafficData();
  } catch (error) {
    console.error("Failed to clear traffic data:", error);
  }
};

// Export traffic data
const exportTrafficData = async (format: "json" | "csv" = "json") => {
  try {
    const response = await fetch(`/api/storage/export?format=${format}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic-export-${Date.now()}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export traffic data:", error);
  }
};

onMounted(async () => {
  console.log("WebSocket connected:", isConnected.value);

  // Load existing traffic data from API
  await loadTrafficData();

  // Listen for client traffic
  on("client_traffic", (data: TrafficEvent) => {
    console.log("Client traffic:", data);
    clientTraffic.value.unshift(data); // Add to beginning of array
    if (clientTraffic.value.length > 100) {
      clientTraffic.value.pop(); // Remove oldest entry if more than 100
    }
  });

  // Listen for server traffic
  on("server_traffic", (data: TrafficEvent) => {
    console.log("Server traffic:", data);
    serverTraffic.value.unshift(data); // Add to beginning of array
    if (serverTraffic.value.length > 100) {
      serverTraffic.value.pop(); // Remove oldest entry if more than 100
    }
  });
});

onUnmounted(() => {
  off("client_traffic", () => {});
  off("server_traffic", () => {});
});

const trafficSend = () => {
  emit("traffic", "Hello from MainTrafficTab");
  console.log("Traffic sent");
};
</script>

<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>Traffic Monitor</span>
          <div class="flex space-x-2">
            <UButton size="sm" :color="activeTab === 'client' ? 'primary' : 'neutral'" @click="activeTab = 'client'"> Client Traffic </UButton>
            <UButton size="sm" :color="activeTab === 'server' ? 'primary' : 'neutral'" @click="activeTab = 'server'"> Server Traffic </UButton>
          </div>
        </div>
      </template>

      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div :class="isConnected ? 'bg-green-500' : 'bg-red-500'" class="w-3 h-3 rounded-full" />
            <span>Status: {{ isConnected ? "connected" : "disconnected" }}</span>
          </div>
          <p>Transport: {{ transport }}</p>
        </div>
        <div class="flex space-x-2">
          <UButton :disabled="!isConnected" @click="trafficSend">Send Test Traffic</UButton>
          <UButton variant="outline" :disabled="isConnected" @click="reconnect">Reconnect</UButton>
          <UButton variant="outline" :loading="isLoading" @click="loadTrafficData">Refresh</UButton>
          <UButton variant="outline" color="error" @click="clearTrafficData()">Clear All</UButton>
          <UButton variant="outline" @click="exportTrafficData('json')">Export JSON</UButton>
          <UButton variant="outline" @click="exportTrafficData('csv')">Export CSV</UButton>
        </div>
      </div>
      <div class="mt-4 overflow-y-auto max-h-[500px]">
        <!-- Client Traffic -->
        <div v-if="activeTab === 'client'">
          <div v-if="clientTraffic.length === 0" class="text-center py-4 text-gray-500">No client traffic recorded yet</div>
          <div v-for="(item, index) in clientTraffic" :key="index">
            <TrafficData
              :incoming="false"
              :type="item.type"
              :message="item.message || ''"
              :net-i-d="item.netID?.toString()"
              :data="item.data || ''"
              :timestamp="item.timestamp"
            />
          </div>
        </div>

        <!-- Server Traffic -->
        <div v-if="activeTab === 'server'">
          <div v-if="serverTraffic.length === 0" class="text-center py-4 text-gray-500">No server traffic recorded yet</div>
          <div v-for="(item, index) in serverTraffic" :key="index">
            <TrafficData
              :incoming="true"
              :type="item.type"
              :message="item.message || ''"
              :net-i-d="item.netID?.toString()"
              :data="item.data || ''"
              :timestamp="item.timestamp"
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
