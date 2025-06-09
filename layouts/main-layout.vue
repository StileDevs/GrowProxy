<script lang="ts" setup></script>

<template>
  <div>
    <MainNavbar />
    <UContainer class="pt-10 mb-10 h-full">
      <slot />
    </UContainer>
    <MainFooter />
  </div>
</template>
