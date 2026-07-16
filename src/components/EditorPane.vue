<script setup>
import { useDocument } from '../composables/useDocument.js';
import SourceEditor from './SourceEditor.vue';
import WysiwygEditor from './WysiwygEditor.vue';

const { state, openFile, newFile } = useDocument();
</script>

<template>
  <div class="editor-pane">
    <div v-if="!state.documentOpen" class="empty-state">
      <div class="empty-actions">
        <button @click="openFile">Open…</button>
        <button @click="newFile">New</button>
      </div>
    </div>
    <SourceEditor
      v-else-if="state.mode === 'source'"
      :key="state.docId"
      v-model="state.content"
    />
    <WysiwygEditor v-else :key="state.docId" v-model="state.content" />
  </div>
</template>

<style scoped>
.editor-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-actions {
  display: flex;
  gap: 0.6rem;
}

.empty-actions button {
  background: none;
  border: 1px solid #404550;
  color: #d0d4dc;
  border-radius: 4px;
  padding: 0.5rem 1.2rem;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.empty-actions button:hover {
  background: #2a2e38;
}
</style>
