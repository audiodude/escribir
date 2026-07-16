<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import { EditorView } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { basicSetup } from 'codemirror';

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, color: '#e0d090', fontWeight: 'bold' },
  { tag: tags.strong, color: '#e8e8e8', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#e8e8e8', fontStyle: 'italic' },
  { tag: tags.link, color: '#7cc4e8' },
  { tag: [tags.url, tags.literal, tags.string], color: '#7cc4e8', textDecoration: 'underline' },
  { tag: tags.monospace, color: '#d8a060' },
  { tag: tags.quote, color: '#a0a8b8', fontStyle: 'italic' },
  { tag: tags.list, color: '#d0d4dc' },
  { tag: tags.meta, color: '#808890' },
  { tag: tags.processingInstruction, color: '#808890' },
  { tag: tags.contentSeparator, color: '#808890' },
]);

const props = defineProps({
  modelValue: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
const editorEl = ref(null);
const view = shallowRef(null);

onMounted(() => {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      emit('update:modelValue', update.state.doc.toString());
    }
  });

  view.value = new EditorView({
    parent: editorEl.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        markdown(),
        Prec.highest(syntaxHighlighting(markdownHighlight)),
        updateListener,
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { fontSize: '1.05rem', height: '100%' },
          '.cm-content': {
            fontFamily: "'SF Mono', Menlo, monospace",
            padding: '2rem',
            maxWidth: '720px',
            margin: '0 auto',
            color: '#d0d4dc',
          },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-editor': { height: '100%', backgroundColor: '#1e2028' },
          '.cm-gutters': { display: 'none' },
          '.cm-activeLine': { backgroundColor: 'transparent' },
          '.cm-cursor': { borderLeftColor: '#d0d4dc' },
          '&.cm-focused': { outline: 'none' },
          '.cm-selectionBackground': { backgroundColor: '#3a4560 !important' },
          '&.cm-focused .cm-selectionBackground': { backgroundColor: '#3a4560 !important' },
        }),
      ],
    }),
  });
});

onBeforeUnmount(() => {
  view.value?.destroy();
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (view.value && view.value.state.doc.toString() !== newVal) {
      view.value.dispatch({
        changes: { from: 0, to: view.value.state.doc.length, insert: newVal },
      });
    }
  }
);
</script>

<template>
  <div ref="editorEl" class="source-editor"></div>
</template>

<style scoped>
.source-editor {
  height: 100%;
}
</style>
