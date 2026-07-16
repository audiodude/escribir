<script setup>
import { computed } from 'vue';
import { useDocument } from '../composables/useDocument.js';

const { state, openFile, newFile, selectSibling } = useDocument();

function basename(path) {
  return path.split('/').pop();
}

const filename = computed(() => (state.currentFile ? basename(state.currentFile) : 'Untitled'));

function onFilenameChange(e) {
  selectSibling(e.target.value);
}

const statusText = computed(() => {
  if (state.saveStatus === 'saving') return 'saving…';
  if (state.saveStatus === 'saved') return '(saved)';
  if (state.saveStatus === 'error') return `error: ${state.errorMessage}`;
  return '';
});

function toggleMode() {
  state.mode = state.mode === 'source' ? 'wysiwyg' : 'source';
}
</script>

<template>
  <header class="toolbar" :class="{ hidden: state.chromeHidden }">
    <select
      v-if="state.currentFile"
      class="filename-select"
      :value="state.currentFile"
      @change="onFilenameChange"
    >
      <option v-for="path in state.siblingFiles" :key="path" :value="path">
        {{ basename(path) }}
      </option>
    </select>
    <span v-else class="filename-select untitled">{{ filename }}</span>
    <button class="action-btn" @click="openFile">Open other…</button>
    <button class="action-btn" @click="newFile">New</button>
    <span class="status" :class="state.saveStatus">{{ statusText }}</span>
    <div class="spacer"></div>
    <button class="mode-toggle" @click="toggleMode">
      {{ state.mode === 'source' ? 'Preview' : 'Source' }}
    </button>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #16181e;
  border-bottom: 1px solid #2a2e38;
  color: #d0d4dc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.85rem;
  opacity: 1;
  transition: opacity 0.15s ease;
}

.toolbar.hidden {
  opacity: 0;
  pointer-events: none;
}

.filename-select {
  font-weight: 600;
  background: none;
  color: #d0d4dc;
  border: 1px solid #404550;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
}

.filename-select:hover {
  background: #2a2e38;
}

.filename-select.untitled {
  cursor: default;
  color: #808890;
}

.status {
  color: #606878;
  font-size: 0.8rem;
}

.status.error {
  color: #e08080;
}

.status.saved {
  color: #90c890;
}

.spacer {
  flex: 1;
}

button {
  background: none;
  border: 1px solid #404550;
  color: #d0d4dc;
  border-radius: 4px;
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}

button:hover {
  background: #2a2e38;
}
</style>
