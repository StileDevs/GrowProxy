<script setup lang="ts">
import Drawer from "primevue/drawer";

const props = defineProps<{
  visible: boolean;
}>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
}>();
</script>
<template>
  <Drawer :visible="props.visible" @update:visible="(value) => emit('update:visible', value)">
    <template #header>
      <header class="flex items-center">
        <h1>GrowProxy</h1>
      </header>
    </template>
  </Drawer>
</template>
