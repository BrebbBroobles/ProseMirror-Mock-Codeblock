import { EditorState, Transaction, type Command } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import {
  baseKeymap,
  createParagraphNear,
  liftEmptyBlock,
  newlineInCode,
  splitBlock,
} from "prosemirror-commands";

// Basic schema - Just to demonstrate this can be done
const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: {
      content: "text*",
      group: "block",
      toDOM() {
        return ["p", 0];
      },
    },
    text: { inline: true },
  },
});

/**
 * The series of `Command`s that `baseKeymap` runs when the `Enter`
 * key is pressed
 */
const enterCommands: Command[] = [
          newlineInCode,
          createParagraphNear,
          liftEmptyBlock,
          splitBlock,
]

/**
 * The settings the user can change through the UI.
 */
interface IndentSettings {
  useTab: boolean;
  spaceCount: number;
}

/**
 * Defaults for the @see IndentSettings
 */
const settings: IndentSettings = {
  spaceCount: 4,
  useTab: false,
};

/**
 * Returns the text to be inserted when the user presses `Tab` on their
 * keyboard.
 * @param useTab Makes the program return `\t` if `true`; returns spaces otherwise.
 * @param spaceCount The number of spaces to indent by (if spaces chosen)
 */
function getIndentText(useTab: boolean, spaceCount: number): string {
  if (useTab) return "\t";
  return " ".repeat(spaceCount);
}

/**
 * The logic to be executed when the user presses the `Tab` key on their
 * keyboard.
 * @param state The editor's state
 * @param dispatch The editor's dispatch
 * @returns `true` if successful; `false` if failed (this doesn't fail, lol)
 */
const tabCommand: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const text = getIndentText(settings.useTab, settings.spaceCount);

  if (dispatch) {
    dispatch(state.tr.insertText(text, from, to));
  }

  return true;
};

/**
 * The logic to be executed when the user presses the `Enter` key on their
 * keyboard.
 * @param state The editor's `state`
 * @param dispatch The editor's `dispatch`
 * @param view The editor's `view`
 * @returns `true` if successful; `false` if failed.
 */
const enterCommand: Command = (state, dispatch, view) => {
  let resultTr: Transaction | null = null;
  const customDispatch = (tr: Transaction) => {
    resultTr = tr;
  };

  for (let i = 0; i < enterCommands.length; i++) {
    if (enterCommands[i](state, customDispatch, view)) break;
  }

  if (resultTr) {
    if (dispatch) {
      const finalTr = (resultTr as Transaction)
      const { $from } = state.selection;
      const { from, to } = finalTr.selection;
      const line: string = $from.parent.textContent;
      
      console.log(from, to)
      dispatch(finalTr.insertText(getExistingIndent(line), to));
    }
  }
  return true;
};

/**
 * Returns the whitespace at the start of the given `line` if present.
 * @param line The line to get the whitespace of
 */
function getExistingIndent(line: string): string {
  return line.slice(0, line.search(/\S/));
}

const baseKeymapMinusEnter = {...baseKeymap};
baseKeymapMinusEnter["Enter"] = enterCommand;

const spaceInput = document.getElementById("space-count");
const tabCheckbox = document.getElementById("use-tab");
const editorTarget = document.getElementById("editor");

if (spaceInput instanceof HTMLInputElement) {
  spaceInput.addEventListener("input", () => {
    settings.spaceCount = spaceInput.valueAsNumber || 0;
  });
}

if (tabCheckbox instanceof HTMLInputElement) {
  tabCheckbox.addEventListener("input", () => {
    settings.useTab = tabCheckbox.checked;
  });
}

if (editorTarget) {
  const state = EditorState.create({
    schema,
    doc: schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("Hi?")]),
    ]),
    plugins: [
      history(),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        Tab: tabCommand,
      }),
      keymap(baseKeymapMinusEnter),
    ],
  });

  //@ts-ignore
  const view = new EditorView(editorTarget, { state });
}
