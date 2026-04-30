# Agent Instructions

- Respect `.gitignore`.
- Do not read, inspect, search, edit, or rely on files or directories ignored by `.gitignore` unless the user explicitly grants permission.
- Prefer `git ls-files` and git-aware search or file discovery so ignored files are excluded by default.
- If inspecting an ignored file seems necessary, ask first and explain why.
- The user ran a pnpm v11 upgrade codemod in this workspace; keep that migration in mind and avoid undoing its generated package manager changes.
- If a command or tool action requires interactive input, stop and ask the user to run it manually instead of trying to drive the interactive prompt.
