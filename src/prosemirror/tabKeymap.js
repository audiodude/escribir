import { keymap } from 'prosemirror-keymap';
import { sinkListItem, liftListItem } from 'prosemirror-schema-list';

export function listTabKeymap(schema) {
  const item = schema.nodes.list_item;
  return keymap({
    Tab: (state, dispatch) => sinkListItem(item)(state, dispatch) || true,
    'Shift-Tab': (state, dispatch) => liftListItem(item)(state, dispatch) || true,
  });
}
