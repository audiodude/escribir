<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useDocument } from './composables/useDocument.js';
import Toolbar from './components/Toolbar.vue';
import EditorPane from './components/EditorPane.vue';

const { state, saveNow, openFile, newFile, showChrome, restoreLastFile, flushSave } =
  useDocument();

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);

  restoreLastFile();

  const win = getCurrentWindow();
  await win.onCloseRequested(async (event) => {
    if (!(await flushSave())) {
      event.preventDefault();
    }
  });

  await listen('flush-before-exit', async () => {
    if (await flushSave()) {
      await invoke('finish_exit');
    }
  });
});

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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="app">
    <Toolbar v-if="state.documentOpen" />
    <EditorPane />
    <div v-if="state.chromeHidden && state.saveStatus === 'saved'" class="saved-flash">
      (saved)
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.saved-flash {
  position: fixed;
  top: 0.6rem;
  right: 1rem;
  padding: 0.2rem 0.6rem;
  background: #16181e;
  border: 1px solid #2a2e38;
  border-radius: 4px;
  color: #90c890;
  font-size: 0.8rem;
  pointer-events: none;
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
