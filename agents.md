# Agent Documentation Protocol

When completing coding tasks, you must document your changes to help future agents understand the codebase. This is required after any significant work.

## When to Create Documentation

Create or update `.md` documentation files after:

- Adding new features or modules
- Refactoring existing code
- Fixing complex bugs
- Changing architectural patterns
- Modifying APIs or interfaces
- Updating dependencies that affect behavior
- Any task touching multiple files

## Documentation Requirements

### For New Features or Modules

Create a new `<feature-name>.md` file in the relevant directory (or a `/docs` folder) containing:

1. **Purpose** — What the feature does and why it exists
2. **Key Files** — List of files involved with brief descriptions
3. **How It Works** — High-level explanation of the implementation
4. **Dependencies** — External libraries or internal modules it relies on
5. **Usage** — How other parts of the codebase interact with it
6. **Edge Cases** — Known limitations or special handling

### For Changes to Existing Code

Update any existing `.md` files that reference the modified code. If none exist, create one if the change is substantial. Include:

1. **What Changed** — Brief summary of modifications
2. **Why** — The reasoning or problem being solved
3. **Impact** — What other parts of the system might be affected
4. **Migration Notes** — If applicable, how to adapt dependent code

## File Naming and Location

- Place documentation near the code it describes
- Use lowercase with hyphens: `authentication-flow.md`, `api-handlers.md`
- For project-wide changes, update or create docs in the root or `/docs` directory

## Writing Style

- Write for an agent with no prior context about the task
- Be concise but complete
- Use code snippets when they clarify explanations
- Avoid vague language — be specific about file names, function names, and behavior

## Example Documentation

```markdown
# User Authentication Module

## Purpose

Handles user login, logout, and session management for the web application.

## Key Files

- `src/auth/login.ts` — Login endpoint and credential validation
- `src/auth/session.ts` — Session creation and verification
- `src/auth/middleware.ts` — Route protection middleware
- `src/auth/types.ts` — Shared types for auth objects

## How It Works

1. User submits credentials to `/api/login`
2. `login.ts` validates against the database
3. On success, `session.ts` creates a JWT stored in an HTTP-only cookie
4. Protected routes use `middleware.ts` to verify the token

## Dependencies

- `jsonwebtoken` for token signing/verification
- `bcrypt` for password hashing
- Database connection from `src/db/connection.ts`

## Usage

Apply the auth middleware to protected routes:

\`\`\`typescript
import { requireAuth } from './auth/middleware';

router.get('/dashboard', requireAuth, dashboardHandler);
\`\`\`

## Edge Cases

- Expired tokens return 401 and clear the cookie
- Failed login attempts are rate-limited after 5 tries
```

## Checklist Before Completing a Task

- [ ] Created documentation for new features/modules
- [ ] Updated existing documentation affected by changes
- [ ] Verified file paths and names in documentation are accurate
- [ ] Removed documentation for deleted features