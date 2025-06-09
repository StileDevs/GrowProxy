<script setup lang="ts">
import { useWebsocket } from "~/composable/useWebsocket";

const { isConnected, transport, socket } = useWebsocket();

onMounted(() => {
  console.log("socket", socket);
});
</script>

<template>
  <div>
    <UCard>
      <template #header> Traffic </template>

      <div>
        <p>Status: {{ isConnected ? "connected" : "disconnected" }}</p>
        <p>Transport: {{ transport }}</p>
      </div>

      <div v-for="i in 30" :key="i" class="">
        <TrafficData :incoming="true" />
      </div>
    </UCard>
  </div>
</template>
