---
name: commit
description: Run checks, commit with AI message, and push
---

1. Run quality checks — fix ALL errors before continuing:
   ```
   npx electron-vite build
   npm test
   ```

2. Review changes: run `git status`, `git diff --staged`, and `git diff`

3. Stage relevant files with `git add` (specific files, not `-A`)

4. Generate a commit message: start with a verb (Add/Update/Fix/Remove/Refactor), be specific and concise, one line

5. Commit and push:
   ```
   git commit -m "your generated message"
   git push
   ```
