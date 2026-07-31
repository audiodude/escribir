<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useDocument } from '../composables/useDocument.js';

const { state, resolveUnsavedPrompt } = useDocument();

const saveButton = ref(null);

const title = computed(() =>
  state.unsavedPrompt === 'open'
    ? 'Save your work before opening another document?'
    : 'Save your work before starting a new document?'
);

function choose(choice) {
  resolveUnsavedPrompt(choice);
}

// Escape must mean Cancel, never Discard — a stray keypress should not lose work.
function onKeydown(e) {
  if (!state.unsavedPrompt) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    choose('cancel');
  }
}

watch(
  () => state.unsavedPrompt,
  async (open) => {
    if (!open) return;
    await nextTick();
    saveButton.value?.focus();
  }
);

onMounted(() => window.addEventListener('keydown', onKeydown, true));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true));
</script>

<template>
  <div v-if="state.unsavedPrompt" class="backdrop">
    <div class="dialog" role="alertdialog" aria-labelledby="unsaved-title">
      <p id="unsaved-title" class="title">{{ title }}</p>
      <p class="detail">
        {{
          state.currentFile
            ? 'Your unsaved changes will be lost otherwise.'
            : 'This untitled draft has no file yet, so it will be lost otherwise.'
        }}
      </p>
      <div class="actions">
        <button ref="saveButton" class="save" @click="choose('save')">Save…</button>
        <button class="discard" @click="choose('discard')">Don't Save</button>
        <button class="cancel" @click="choose('cancel')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 11, 15, 0.6);
  z-index: 100;
}

.dialog {
  min-width: 22rem;
  max-width: 28rem;
  padding: 1.25rem;
  background: #16181e;
  border: 1px solid #2a2e38;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  color: #d0d4dc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.title {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.detail {
  margin: 0 0 1.1rem;
  font-size: 0.82rem;
  color: #808890;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.actions button {
  background: none;
  border: 1px solid #404550;
  color: #d0d4dc;
  border-radius: 4px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
}

.actions button:hover {
  background: #2a2e38;
}

.actions .save {
  border-color: #5a7fa8;
  background: #2b3d52;
}

.actions .save:hover {
  background: #354a63;
}

.actions .discard:hover {
  border-color: #a05858;
  color: #e08080;
}

/* Save is focused on open, so make the ring obvious against the dark chrome. */
.actions button:focus-visible {
  outline: 2px solid #7aa2cc;
  outline-offset: 1px;
}
</style>
