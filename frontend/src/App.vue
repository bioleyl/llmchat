<script setup lang="ts">
// Empty - handled by router
</script>

<template>
  <div class="app-root">
    <router-view />
  </div>
</template>

<style>
:root,
html,
body,
#app {
  margin: 0;
  width: 100%;
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
  color: #0f172a;
}

.app-root {
  min-height: 100vh;
}
</style>
