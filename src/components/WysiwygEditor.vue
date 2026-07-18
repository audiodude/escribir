<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { exampleSetup } from 'prosemirror-example-setup';
import { defaultMarkdownParser, defaultMarkdownSerializer, schema } from 'prosemirror-markdown';
import { listTabKeymap } from '../prosemirror/tabKeymap.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
const editorEl = ref(null);
const view = shallowRef(null);
let lastKnownMarkdown = '';

function createState(markdownText) {
  return EditorState.create({
    doc: defaultMarkdownParser.parse(markdownText || ''),
    plugins: [listTabKeymap(schema), ...exampleSetup({ schema, menuBar: false })],
  });
}

onMounted(() => {
  lastKnownMarkdown = props.modelValue;

  view.value = new EditorView(editorEl.value, {
    state: createState(props.modelValue),
    dispatchTransaction(tr) {
      const newState = view.value.state.apply(tr);
      view.value.updateState(newState);
      if (tr.docChanged) {
        lastKnownMarkdown = defaultMarkdownSerializer.serialize(newState.doc);
        emit('update:modelValue', lastKnownMarkdown);
      }
    },
  });
});

onBeforeUnmount(() => {
  view.value?.destroy();
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (view.value && newVal !== lastKnownMarkdown) {
      lastKnownMarkdown = newVal;
      view.value.updateState(createState(newVal));
    }
  }
);
</script>

<template>
  <div ref="editorEl" class="wysiwyg-editor"></div>
</template>

<style>
.wysiwyg-editor {
  height: 100%;
  overflow: auto;
}

.wysiwyg-editor .ProseMirror {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100%;
  outline: none;
  font-size: 1.05rem;
  line-height: 1.6;
  color: #d0d4dc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.wysiwyg-editor .ProseMirror h1,
.wysiwyg-editor .ProseMirror h2,
.wysiwyg-editor .ProseMirror h3,
.wysiwyg-editor .ProseMirror h4 {
  color: #e0d090;
  font-weight: bold;
  margin: 1.2em 0 0.4em;
}

.wysiwyg-editor .ProseMirror strong {
  color: #e8e8e8;
}

.wysiwyg-editor .ProseMirror em {
  color: #e8e8e8;
}

.wysiwyg-editor .ProseMirror a {
  color: #7cc4e8;
}

.wysiwyg-editor .ProseMirror code {
  color: #d8a060;
  background: #282c34;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: 'SF Mono', Menlo, monospace;
}

.wysiwyg-editor .ProseMirror pre {
  background: #282c34;
  border: 1px solid #404550;
  border-radius: 4px;
  padding: 0.8em;
}

.wysiwyg-editor .ProseMirror pre code {
  background: none;
  padding: 0;
}

.wysiwyg-editor .ProseMirror blockquote {
  border-left: 3px solid #505868;
  color: #a0a8b8;
  font-style: italic;
  margin: 0.8em 0;
  padding-left: 1em;
}

.wysiwyg-editor .ProseMirror ul,
.wysiwyg-editor .ProseMirror ol {
  padding-left: 1.4em;
}

.wysiwyg-editor .ProseMirror hr {
  border: none;
  border-top: 1px solid #404550;
  margin: 1.5em 0;
}
</style>
