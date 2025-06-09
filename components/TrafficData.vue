<script setup lang="ts">
const props = defineProps<{
  incoming: boolean;
}>();
</script>

<template>
  <div class="w-full p-1 px-3 flex items-center gap-x-3 transition-all ease-out duration-300 cursor-pointer hover:bg-accented rounded-lg">
    <UIcon
      :name="props.incoming ? 'i-lucide-arrow-left' : 'i-lucide-arrow-right'"
      class="size-12"
      :class="`${props.incoming ? 'text-green-500' : 'text-red-500'}`"
    />

    <div>
      <UBadge color="neutral" variant="outline">01</UBadge>
    </div>

    <div>
      <UBadge color="neutral" variant="subtle">OnConsoleMessage</UBadge>
    </div>

    <div>
      <UBadge color="neutral" variant="soft">00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00</UBadge>
    </div>
  </div>
</template>
