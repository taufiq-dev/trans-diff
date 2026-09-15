import { useEffect, useRef } from 'react';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { basicSetup, EditorView } from 'codemirror';
import { debugPasteDialog } from '@/lib/debug';
import { cn } from '@/lib/utils';

type JsonCodeEditorProps = {
  ariaLabel: string;
  className?: string;
  id?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  value: string;
};

// CodeMirror's default highlight style is tuned for light backgrounds, so
// pick mid-lightness hues that stay readable on both themes.
const jsonHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--foreground)' },
  { tag: tags.string, color: 'oklch(0.68 0.17 25)' },
  { tag: tags.number, color: 'oklch(0.72 0.16 200)' },
  { tag: [tags.bool, tags.null], color: 'oklch(0.7 0.16 300)' },
  { tag: [tags.punctuation, tags.separator], color: 'var(--muted-foreground)' },
]);

const jsonEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
    height: '100%',
    width: '100%',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    caretColor: 'var(--foreground)',
    minHeight: '100%',
    minWidth: 'max-content',
    padding: '0.5rem 0',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--muted)',
    borderRight: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
  },
  '.cm-line': {
    padding: '0 0.625rem',
  },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, SFMono, Menlo, Consolas, "Liberation Mono", monospace',
    overflow: 'auto',
  },
  // A real selection blue; the theme's --accent is too close to the editor
  // background in dark mode to read as a selection.
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection':
    {
      backgroundColor: 'oklch(0.62 0.19 255 / 0.35) !important',
    },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in oklab, var(--foreground) 6%, transparent)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in oklab, var(--foreground) 8%, transparent)',
    color: 'var(--foreground)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'oklch(0.62 0.19 255 / 0.18)',
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in oklab, var(--foreground) 15%, transparent)',
    outline: 'none',
  },
});

function JsonCodeEditor({
  ariaLabel,
  className,
  id,
  invalid = false,
  onChange,
  value,
}: JsonCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const initialIdRef = useRef(id);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const editorId = initialIdRef.current;

    debugPasteDialog('codemirror-mount', {
      chars: initialValueRef.current.length,
      id: editorId,
    });

    const editor = new EditorView({
      doc: initialValueRef.current,
      extensions: [
        basicSetup,
        json(),
        jsonEditorTheme,
        syntaxHighlighting(jsonHighlightStyle),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextValue = update.state.doc.toString();
            debugPasteDialog('codemirror-doc-changed', {
              chars: nextValue.length,
              id: editorId,
            });
            onChangeRef.current(nextValue);
          }
        }),
      ],
      parent: containerRef.current,
    });

    editorRef.current = editor;

    return () => {
      debugPasteDialog('codemirror-unmount', { id: editorId });
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const currentValue = editor.state.doc.toString();

    if (currentValue === value) {
      return;
    }

    editor.dispatch({
      changes: {
        from: 0,
        insert: value,
        to: currentValue.length,
      },
    });
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (id) {
      editor.contentDOM.id = id;
    }

    editor.contentDOM.setAttribute('aria-label', ariaLabel);
    editor.contentDOM.setAttribute('aria-invalid', String(invalid));
  }, [ariaLabel, id, invalid]);

  return (
    <div
      className={cn(
        'min-h-0 overflow-hidden rounded-lg border border-input bg-background text-base transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20 md:text-sm dark:bg-input/30 dark:data-[invalid=true]:border-destructive/50 dark:data-[invalid=true]:ring-destructive/40',
        className,
      )}
      data-invalid={invalid ? 'true' : undefined}
      onClick={() => editorRef.current?.focus()}
      ref={containerRef}
    />
  );
}

export { JsonCodeEditor };
