# Trans Diff

Trans Diff is a browser-based JSON translation file editor. It helps compare,
edit, and keep multiple locale files structurally aligned from a single combined
tree view.

Try it at [trans-diff.pages.dev](https://trans-diff.pages.dev).

The app is designed for projects that store translations as JSON, where each
locale should share the same keys but may contain different translated values.

## What It Does

- Load multiple JSON translation files by upload, drag and drop, or pasted JSON.
- Compare all loaded files in one nested tree.
- See structural status for every path, including synced keys, missing keys, and
  type mismatches.
- Edit strings, numbers, booleans, nulls, objects, and arrays directly in the
  browser.
- Add, rename, duplicate, move, and remove nested object keys or array items.
- Search by key name or full dotted path, such as `errors.validation.email`.
- Create a translated JSON column from an existing file when the browser
  supports the built-in Translator API.
- Save modified JSON files back to disk.

## Translation Support

Automatic translation uses the experimental browser Translator API. When the API
is not available, the translation action is disabled and the rest of the editor
continues to work normally.

No server-side translation service is required by this app.

## Tech Stack

- React
- React Router
- Vite
- TypeScript
- Tailwind CSS
- Base UI / shadcn-style components
- CodeMirror for pasted JSON editing

## Local Development

This project uses pnpm.

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm build
pnpm lint
pnpm preview
```

## Notes

Trans Diff runs entirely in the browser. Uploaded and pasted JSON content is
kept in local browser state unless you explicitly save a modified file.
