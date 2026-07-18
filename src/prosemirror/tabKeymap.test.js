import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { defaultMarkdownParser, schema } from 'prosemirror-markdown';
import { listTabKeymap } from './tabKeymap.js';

function press(key, state, shiftKey = false) {
  const handleKeyDown = listTabKeymap(schema).props.handleKeyDown;
  let dispatched = null;
  const view = { state, dispatch: (tr) => (dispatched = tr) };
  const handled = handleKeyDown(view, { key, shiftKey, preventDefault() {} });
  return { handled, dispatched };
}

function stateFor(markdown) {
  const doc = defaultMarkdownParser.parse(markdown);
  return EditorState.create({ schema, doc, selection: TextSelection.atEnd(doc) });
}

function countNodes(doc, name) {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === name) n += 1;
  });
  return n;
}

describe('Tab / Shift-Tab in the WYSIWYG editor', () => {
  it('Tab nests a list item under the previous one', () => {
    const state = stateFor('- a\n- b');
    expect(countNodes(state.doc, 'bullet_list')).toBe(1);

    const { handled, dispatched } = press('Tab', state);

    expect(handled).toBe(true);
    expect(dispatched).not.toBeNull();
    const newDoc = state.apply(dispatched).doc;
    expect(countNodes(newDoc, 'bullet_list')).toBe(2);
    expect(countNodes(newDoc, 'list_item')).toBe(2);
  });

  it('Shift-Tab lifts a nested list item back out', () => {
    const state = stateFor('- a\n- b');
    const nested = state.apply(press('Tab', state).dispatched);

    const { handled, dispatched } = press('Tab', nested, true);

    expect(handled).toBe(true);
    const newDoc = nested.apply(dispatched).doc;
    expect(countNodes(newDoc, 'bullet_list')).toBe(1);
    expect(countNodes(newDoc, 'list_item')).toBe(2);
  });

  it.each([['Tab', false], ['Tab', true]])(
    'swallows %s outside lists so focus stays in the editor',
    (key, shiftKey) => {
      const state = stateFor('just a paragraph');

      const { handled, dispatched } = press(key, state, shiftKey);

      expect(handled).toBe(true);
      expect(dispatched).toBeNull();
    }
  );
});
