# Contributing Guidelines

Thank you for contributing!  
This project follows a few simple rules to keep the codebase clean, consistent, and easy to work with — for both humans and AI agents.

---

## 📖 Before You Start

- **Read `README.md`** for project overview, setup, and goals.
- **Check open issues / roadmap** to avoid duplicating work.
- **Ask questions early** (open a draft PR or discussion) if you’re unsure.

---

## 🛠 Development Workflow

1. **Fork & clone** the repository.
2. **Create a feature branch** from `main` (e.g. `feature/login-form`, `fix/api-timeout`).
3. **Write code** following our style and architecture guidelines:
   - Keep functions and files focused.
   - Avoid unnecessary dependencies.
   - Write clear comments when intent is non-obvious.
4. **Add tests** for new functionality.
5. **Run all tests & linters** before committing.
6. **Commit changes** with clear messages (see below).
7. **Push & open a Pull Request (PR)**.

---

## 🧹 Code Style

- Follow the language’s established style guide (e.g., TypeScript → ESLint + Prettier).
- Prefer clarity over cleverness.
- Keep formatting consistent (use Prettier/EditorConfig if available).
- No commented-out code in commits.

---

## ✅ Commit Messages

We use **conventional commits** for clarity and changelog generation:

    feat: add user login form
    fix: correct timeout issue in API client
    docs: update README with setup instructions
    chore: bump dependency versions

---

## 🧪 Testing

- All new features should include unit tests.
- Run the full test suite locally before pushing.
- Tests should be deterministic (no external API flakiness).

---

## 🔍 Pull Requests

- Keep PRs focused — small, single-purpose changes are easier to review.
- Describe the problem and solution clearly.
- Reference related issues with `Fixes #123`.
- Expect to address review comments.

---

## 🤖 AI & Automation

This project may be read or modified by AI coding assistants. Please:

- Keep instructions for agents in `AI_INSTRUCTIONS.md`.
- Write self-explanatory code (clear names, docstrings).
- Avoid magical one-liners that obscure logic.

---

## 📜 License & CLA

By contributing, you agree that your contributions will be licensed under the project’s license (see `LICENSE.md`).

Additionally, please review and sign the Contributor License Agreement (CLA) available in `CLA.md`.

---
