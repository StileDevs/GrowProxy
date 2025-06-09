<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const items = ref<NavigationMenuItem[]>([
  {
    label: "Main",
    icon: "i-lucide-box",
    to: "/",
    active: true
  },
  {
    label: "World Visualizer",
    icon: "i-lucide-image",
    to: "/",
    active: false
  },
  {
    label: "GitHub",
    icon: "i-simple-icons-github",
    to: "https://github.com/nuxt/ui",
    target: "_blank"
  }
]);
</script>

<template>
  <UNavigationMenu :items="items" class="w-full justify-center sticky top-0 z-50" />
</template>
