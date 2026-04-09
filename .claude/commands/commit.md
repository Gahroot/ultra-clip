---
name: commit
description: Run checks, commit with AI message, and push
---

1. Run quality checks (fix ALL errors before continuing):
   ```bash
   npx electron-vite build
   npm test
   npm run test:main
   ```

2. Review changes: `git status` and `git diff --staged` and `git diff`

3. Generate commit message:
   - Start with verb (Add/Update/Fix/Remove/Refactor)
   - Be specific and concise
   - One line preferred

4. Stage relevant files, commit, and push:
   ```bash
   git add <relevant files>
   git commit -m "your generated message"
   git push
   ```
