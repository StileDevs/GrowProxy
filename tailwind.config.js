/** @type {import('tailwindcss').Config} */
export default {
  content: ["./website/index.html", "./website/world.html", "./website/**/*"],
  theme: {
    extend: {}
  },
  plugins: [require("daisyui")]
};
