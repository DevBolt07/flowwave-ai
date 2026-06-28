# Contributing Guidelines

Thank you for choosing to contribute to FlowWave AI! To maintain a clean, production-ready codebase, please follow the guidelines documented below.

---

## 🌿 Branch Naming Conventions

All branches should be prefixed based on the scope of changes:

*   `feat/` : New features or functional modules (e.g., `feat/authority-override`)
*   `fix/` : Bug fixes and resolving runtime issues (e.g., `fix/map-pointer-jump`)
*   `chore/` : Cleanup tasks, builds, config changes, and audits (e.g., `chore/project-audit`)
*   `docs/` : Formatting or content updates in Markdown documentation files (e.g., `docs/setup-guide`)
*   `refactor/` : Code optimization and restructuring without adding features (e.g., `refactor/signal-reducer`)

---

## 💻 Coding Standards

### TypeScript & Linting
*   **Type Safety**: Avoid using `any`. Use exact interfaces, type aliases, or database schemas exported from `src/integrations/supabase/types.ts`.
*   **ESLint Validation**: Run the linter before pushing changes:
    ```bash
    npm run lint
    ```
    Ensure your changes introduce no new linting errors.
*   **Code Style**: Maintain consistent spacing, double quotes, and clean JSDoc comments for complex helper functions.

### React Practices
*   **Hook Dependencies**: Always list correct dependencies for hooks (`useEffect`, `useCallback`, `useMemo`). Do not leave empty arrays if dependencies are called inside.
*   **Component Structure**: Place general components under `src/components`, portal-specific views under `src/components/`, and shadcn components under `src/components/ui/`.

---

## 🚀 Pull Request Workflow

1.  **Sync Main**: Ensure your local branch is updated with the remote `main` branch before creating a PR:
    ```bash
    git checkout main
    git pull origin main
    git checkout your-feature-branch
    git merge main
    ```
2.  **Run Build Check**: Verify that the project compiles cleanly without compilation warnings:
    ```bash
    npm run build
    ```
3.  **Submit PR**:
    *   Set the target branch to `main`.
    *   Write a clear, descriptive title using conventional commit style (e.g., `feat: integrate map view on citizen dashboard`).
    *   Include a description listing the features added, issues solved, and manual testing steps.
