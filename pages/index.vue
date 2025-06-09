<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: "main-layout"
});

const items = ref<TabsItem[]>([
  {
    label: "Traffic",
    slot: "traffic" as const
  },
  {
    label: "User",
    slot: "user" as const
  }
]);
</script>

<template>
  <main>
    <div class="flex justify-between gap-8 w-full min-h-screen">
      <!-- Tools -->
      <section class="w-full">
        <UTabs :items="items" class="w-full gap-4" :ui="{ trigger: 'grow' }">
          <template #traffic="">
            <MainTrafficTab />
          </template>
          <template #user="">
            <MainUserTab />
          </template>
        </UTabs>
      </section>

      <USeparator orientation="vertical" class="h-screen" />

      <!-- Viewer -->
      <section class="w-full">
        <div class="sticky top-72">
          <UCard>
            <template #header> Header </template>

            ini adalah isinya

            <template #footer> footer </template>
          </UCard>
        </div>
      </section>
    </div>
  </main>
</template>
