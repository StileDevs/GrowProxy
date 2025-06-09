import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxt/icon", "@nuxt/image", "@nuxt/scripts", "@nuxt/test-utils", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()]
  },

  nitro: {
    experimental: {
      websocket: true
    }
  }
});
