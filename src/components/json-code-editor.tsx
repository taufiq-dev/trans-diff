import { useEffect, useRef } from 'react';
import { json } from '@codemirror/lang-json';
import { basicSetup, EditorView } from 'codemirror';
import { cn } from '@/lib/utils';

type JsonCodeEditorProps = {
  ariaLabel: string;
  className?: string;
  id?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  value: string;
};

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
  '.cm-selectionBackground': {
    backgroundColor: 'var(--accent) !important',
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
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const editor = new EditorView({
      doc: initialValueRef.current,
      extensions: [
        basicSetup,
        json(),
        jsonEditorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
      parent: containerRef.current,
    });

    editorRef.current = editor;

    return () => {
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
