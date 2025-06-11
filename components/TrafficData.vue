<script setup lang="ts">
const props = defineProps<{
  incoming: boolean;
  type: string;
  message?: string;
  "net-i-d"?: string;
  data?: string;
  timestamp: string;
}>();

const formattedTime = computed(() => {
  return new Date(props.timestamp).toLocaleTimeString();
});

const getTypeClass = computed(() => {
  switch (props.type.toLowerCase()) {
    case "connect":
      return "text-green-600";
    case "disconnect":
      return "text-red-600";
    case "raw":
      return "text-blue-600";
    default:
      return "text-gray-600";
  }
});

const displayType = computed(() => {
  return props.type === "raw" ? "RAW" : props.type.toUpperCase();
});
</script>

<template>
  <div class="w-full p-1 px-3 flex items-center gap-x-3 transition-all ease-out duration-300 cursor-pointer hover:bg-accented rounded-lg">
    <UIcon
      :name="props.incoming ? 'i-lucide-arrow-left' : 'i-lucide-arrow-right'"
      class="size-12"
      :class="`${props.incoming ? 'text-green-500' : 'text-red-500'}`"
    />
    <div v-if="props['net-i-d']">
      <UBadge color="neutral" variant="outline">{{ props["net-i-d"] }}</UBadge>
    </div>

    <div>
      <UBadge color="neutral" variant="subtle" :class="getTypeClass">{{ displayType }}</UBadge>
    </div>

    <div v-if="props.message">
      <UBadge color="neutral" variant="soft">{{ props.message }}</UBadge>
    </div>

    <div v-if="props.data" class="flex-1 overflow-hidden">
      <UTooltip :text="props.data">
        <UBadge color="neutral" variant="soft" class="text-xs truncate max-w-96">{{ props.data }}</UBadge>
      </UTooltip>
    </div>

    <div class="text-xs text-gray-500 ml-auto">
      {{ formattedTime }}
    </div>
  </div>
</template>
