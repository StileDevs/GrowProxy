<script setup lang="ts">
import { useWebsocket } from "~/composable/useWebsocket";

const { isConnected, transport, emit, on, off } = useWebsocket();

const clientTraffic = ref<any[]>([]);
const serverTraffic = ref<any[]>([]);
const activeTab = ref("client"); // 'client' or 'server'

onMounted(() => {
  console.log("WebSocket connected:", isConnected.value);

  // Listen for client traffic
  on("client_traffic", (data: any) => {
    console.log("Client traffic:", data);
    clientTraffic.value.unshift(data); // Add to beginning of array
    if (clientTraffic.value.length > 100) {
      clientTraffic.value.pop(); // Remove oldest entry if more than 100
    }
  });

  // Listen for server traffic
  on("server_traffic", (data: any) => {
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

      <div>
        <p>Status: {{ isConnected ? "connected" : "disconnected" }}</p>
        <p>Transport: {{ transport }}</p>
      </div>
      <UButton @click="trafficSend">Send Test Traffic</UButton>
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
