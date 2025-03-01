<script setup lang="ts">
import Menubar from "primevue/menubar";
import SidebarMenu from "@/components/SidebarMenu.vue";
import { ref } from "vue";
import Button from "primevue/button";

const sideVisible = ref(false);
</script>

<template>
  <SidebarMenu v-model:visible="sideVisible" />
  <Menubar class="!border-r-0 !border-l-0 !border-t-0">
    <template #start>
      <header class="flex items-center gap-x-2">
        <Button icon="pi pi-bars" text plain @click="sideVisible = !sideVisible"></Button>
        <div>GrowProxy</div>
      </header>
    </template>
  </Menubar>
</template>
