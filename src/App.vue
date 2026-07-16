<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { useDocument } from './composables/useDocument.js';
import Toolbar from './components/Toolbar.vue';
import EditorPane from './components/EditorPane.vue';

const { state, saveNow, openFile, newFile, showChrome } = useDocument();

function handleKeydown(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveNow();
  } else if (mod && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    openFile();
  } else if (mod && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    newFile();
  } else if (e.key === 'Escape') {
    showChrome();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="app">
    <Toolbar v-if="state.documentOpen" />
    <EditorPane />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}
</style>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
}

body {
  background: #1e2028;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
