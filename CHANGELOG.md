# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-06-28

### Added
- Created `.env.example` with standard environment configurations.
- Added `LICENSE` containing the MIT License terms.
- Added `CONTRIBUTING.md` defining branch names, styling, and PR structure.
- Created `CHANGELOG.md` to track release history.

### Changed
- **Security & Git**:
  - Removed `.env` from Git tracking (`git rm --cached`).
  - Added `.env` and `.env.local` to `.gitignore` to prevent secret leaks.
  - Removed accidentally committed `node_modules` from Git tracking.
- **Config & Build**:
  - Renamed package in `package.json` to `flowwave-ai` and added metadata.
  - Enabled `@typescript-eslint/no-unused-vars` as a `warn` in `eslint.config.js`.
  - Replaced `require("tailwindcss-animate")` with an ES module import in `tailwind.config.ts`.
- **Code Quality & Typing**:
  - Replaced hardcoded credentials with environment variables (`import.meta.env`) in Supabase client initialization, API utilities, and OSRM routing utilities.
  - Fixed empty interface linter errors in command and textarea shadcn component scripts.
  - Replaced multiple occurrences of `any` types with strict database-level typings (e.g. `Ambulance` and `Database` models).
  - Fixed useEffect missing dependency warnings in all dashboard React portals by utilizing `useCallback` wrapper hooks.
- **Refactoring**:
  - Removed duplicate empty nested `flowwave-ai` folder from workspace root.
  - Cleaned up, formatted, and optimized `README.md` and `TESTING_GUIDE.md`.
