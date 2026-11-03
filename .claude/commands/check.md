---
description: Typecheck, lint, unit-test and build workspace packages
argument-hint: "[backend|frontend|@chess/contract|@chess/ui|affected|all]"
---

Target: $ARGUMENTS (empty means affected).

Use the `verifier` agent on the target. Summarize as a short PASS/FAIL table per package and task, then list failures with file:line. Do not fix anything unless asked.
