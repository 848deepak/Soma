# GitHub Branching Strategy

## Goals
- Reduce PR chaos with predictable branch types.
- Keep main releasable.
- Group related changes and avoid duplicate/conflicting PRs.

## Branch Types
- main: always production-ready, protected.
- feature/<scope>-<short-topic>: product code changes.
- fix/<scope>-<short-topic>: bug fixes not needing emergency release.
- hotfix/<scope>-<short-topic>: urgent production fix.
- chore/<scope>-<short-topic>: tooling, docs, infra, refactors.
- release/YYYY-MM-DD or release/vX.Y.Z: optional stabilization branch for launch windows.

## Naming Rules
- Use lowercase.
- Use hyphens, not spaces or underscores.
- Keep branch names under 50 characters where possible.
- Include scope first (auth, security, profile, notifications, ci, docs).

Examples
- feature/auth-passkey-login
- fix/profile-avatar-upload
- chore/ci-cache-optimization
- hotfix/security-token-rotation

## PR Rules
- One branch = one focused purpose.
- Target main by default.
- If a branch is large, create a parent tracking issue and split into sub-PRs.
- Prefer small PRs under ~500 lines changed when possible.
- Require at least 1 reviewer and passing CI.
- Use squash merge to keep history clean.

## Mandatory Quality Gate Policy
- No pull request may merge unless all required checks are green.
- Local push is blocked by git hook if quality checks fail.
- Team members must use safe commands for pull and branch creation:
   - Pull: npm run safe:pull -- main
   - Create branch: npm run safe:branch -- feature/<scope>-<topic>
- Required checks for every PR:
   - lint
   - typecheck
   - unit/integration tests
   - secret scan

Enforcement implemented in repository
- Local gate script: scripts/quality-gate.sh
- Safe pull wrapper: scripts/safe-pull.sh
- Safe branch wrapper: scripts/safe-branch.sh
- Pre-push git hook: .githooks/pre-push
- PR CI workflow: .github/workflows/pr-quality-gates.yml

One-time developer setup
- bash scripts/setup-git-hooks.sh

## Required Labels
- type: feature, fix, hotfix, chore
- area: auth, security, profile, setup, infra, docs
- risk: low, medium, high
- status: ready, blocked, needs-rebase

## Current Repo Cleanup Plan
1. Keep these active (not merged into main):
   - origin/feature/security-hardening
   - origin/feature/settings-edit-profile-preferences
   - origin/full-worktree-changes-20260401
   - origin/hardening/high-priority-security-sync-20260401
   - origin/test/three-theme-20260401-223630
2. Delete this branch after confirming PR is merged:
   - origin/chore/production-hardening-wave1
3. Rename non-standard active branches before further work:
   - origin/full-worktree-changes-20260401 -> chore/repo-full-worktree-sync
   - origin/hardening/high-priority-security-sync-20260401 -> hotfix/security-sync-hardening
   - origin/test/three-theme-20260401-223630 -> feature/theme-three-variant
4. Rebase or merge main into each active branch before review.
5. Close duplicate PRs and keep only one canonical PR per goal.

## Daily Team Workflow
1. Pull latest main.
2. Create a branch from main using the naming rules.
3. Push early and open a draft PR.
4. Rebase from main daily if branch lives over 1 day.
5. Mark ready only after CI passes.
6. Squash merge.
7. Delete remote branch immediately after merge.

## Handy Commands
Sync local repo
- git checkout main
- git pull --ff-only origin main
- git fetch --prune

Rename local branch
- git branch -m old-name new-name
- git push origin -u new-name
- git push origin --delete old-name

Delete merged remote branches (safe preview first)
- git branch -r --merged origin/main
- git push origin --delete <branch-name>

Prune stale local branches
- git branch --merged main
- git branch -d <branch-name>

## Branch Protection (Required)
- Protect main and require pull request before merge.
- Require status checks to pass before merge.
- Select the required check name: quality-gates.
- Require branch up to date before merge.
- Require at least 1 approving review.
- Restrict force-pushes and direct pushes to main.

## Optional Protections
- Require branch name pattern checks in CI.
- Require PR title format: type(scope): summary
