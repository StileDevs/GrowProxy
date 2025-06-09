<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <USeparator
    :avatar="{
      src: 'https://avatars.githubusercontent.com/u/182404935?s=200&v=4'
    }"
    orientation="horizontal"
  />
  <footer class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-4 lg:flex lg:items-center lg:justify-between lg:gap-x-3">
    <div>GrowProxy | Licensed MIT 2025 - {{ currentYear }}</div>
    <div>© JadlionHD {{ currentYear }}</div>
  </footer>
</template>
