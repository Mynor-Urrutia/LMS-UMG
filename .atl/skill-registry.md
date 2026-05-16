# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:/Users/myjou/.claude/skills/branch-pr/SKILL.md |
| When a PR would exceed 400 changed lines, when planning chained PRs, stacked PRs, or reviewable slices | chained-pr | C:/Users/myjou/.claude/skills/chained-pr/SKILL.md |
| When writing guides, READMEs, RFCs, onboarding docs, architecture docs, or review-facing documentation | cognitive-doc-design | C:/Users/myjou/.claude/skills/cognitive-doc-design/SKILL.md |
| When drafting or posting feedback, review comments, maintainer replies, Slack messages, or GitHub comments | comment-writer | C:/Users/myjou/.claude/skills/comment-writer/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:/Users/myjou/.claude/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:/Users/myjou/.claude/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:/Users/myjou/.claude/skills/judgment-day/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:/Users/myjou/.claude/skills/skill-creator/SKILL.md |
| When implementing a change, preparing commits, splitting PRs, or planning chained or stacked PRs | work-unit-commits | C:/Users/myjou/.claude/skills/work-unit-commits/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue with `Closes/Fixes/Resolves #N`
- Every PR MUST have exactly one `type:*` label
- Branch naming: `type/description` regex `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- PR body requires: linked issue, PR type checkbox, summary, changes table, test plan, contributor checklist
- Conventional commits: `type(scope): description` — never add Co-Authored-By trailers
- Run `shellcheck scripts/*.sh` before pushing
- All automated checks must pass: issue reference, status:approved on linked issue, one type label, shellcheck

### chained-pr
- MUST split when PR exceeds 400 changed lines (additions + deletions) unless maintainer-approved `size:exception`
- Ask user to choose strategy BEFORE proceeding: Stacked PRs to main OR Feature Branch Chain OR size:exception
- Each chained PR must be autonomous: CI green, one deliverable scope, clear rollback, verification included
- Every chained PR MUST include a dependency diagram marking current PR with 📍
- For chains >2 PRs: create a draft tracker PR (map only, not review surface, no-merge until chain complete)
- Feature Branch Chain: child PRs target immediate parent branch — NOT main or tracker branch after PR #1
- Cache the strategy choice for the session — do not ask again

### cognitive-doc-design
- Lead with the answer first (decision, action, or outcome); context comes after
- Progressive disclosure: happy path first, then details, edge cases, and references
- Use tables, checklists, and examples instead of prose that must be remembered
- Keep each section focused on one decision or unit of work
- For PR docs: state what to review first, what is out of scope, and link previous/next PR when chained

### comment-writer
- Start with the actionable point — do not recap the whole PR before giving feedback
- Sound like a thoughtful teammate, not a corporate bot; prefer 1-3 short paragraphs or a tight bullet list
- Always explain the technical WHY when requesting a change
- Comment on the highest-value issue only — avoid pile-ons on every tiny preference
- Match the thread language; if Spanish, use Rioplatense voseo: `podés`, `tenés`, `fijate`, `dale`
- No em dashes — use commas, periods, or parentheses instead

### go-testing
- Use table-driven tests for multiple test cases: struct with `name`, `input`, `expected`, `wantErr` fields
- Test Model state transitions directly via `m.Update(tea.KeyMsg{...})` — no wiring needed
- Use `teatest.NewTestModel(t, m)` for full TUI integration flows
- Use golden file testing for visual output: compare against `testdata/*.golden`, update with `-update` flag
- Keep test files beside implementation: `model_test.go`, `update_test.go`, `view_test.go`
- Mock with interfaces, not concrete types; use `t.TempDir()` for file operations
- Use `-short` flag to skip integration tests in CI

### issue-creation
- Always search for duplicates before creating an issue
- Use ONLY `bug_report.yml` or `feature_request.yml` templates — blank issues are disabled
- Issues get `status:needs-review` automatically; a maintainer MUST add `status:approved` before any PR can open
- Questions go to Discussions — NOT issues
- Complete all pre-flight checkboxes (no duplicate + understands approval workflow)

### judgment-day
- Launch TWO judge sub-agents in parallel (async delegate) — never sequential, never review code yourself
- Each judge is blind to the other; both receive identical prompts with identical review criteria
- Synthesize: Confirmed (both found) = fix; Suspect (one only) = triage; Contradiction = flag for user
- WARNING classification: (real) = normal user can trigger it; (theoretical) = contrived scenario → report as INFO, do NOT fix
- Round 1: present verdict table, ASK user before applying any fixes; Round 2+: re-judge only for confirmed CRITICALs
- APPROVED = 0 confirmed CRITICALs + 0 confirmed real WARNINGs (theoretical warnings may remain)
- After 2 fix iterations, ASK user whether to continue — never auto-escalate
- Fix agent is a SEPARATE delegation — never reuse a judge as the fixer
- Resolve skill registry BEFORE launching judges; inject Project Standards into both judge prompts and fix agent prompt

### skill-creator
- Create a skill only when a pattern is reusable and AI needs explicit guidance on project-specific conventions
- Required frontmatter: `name`, `description` (MUST include "Trigger: {when}"), `license: Apache-2.0`, `metadata.author`, `metadata.version`
- Directory structure: `skills/{skill-name}/SKILL.md`; optional `assets/` for templates/schemas, `references/` for local doc links
- `references/` MUST point to local file paths — no web URLs
- After creating, register in `AGENTS.md`

### work-unit-commits
- A commit represents a deliverable behavior, fix, migration, or docs unit — NOT a file type batch
- Tests belong in the same commit as the code they verify
- Docs belong in the same commit as the user-facing change they explain
- Each commit must leave the repo in a sensible, buildable state on its own
- Commit message explains the outcome, not the file list; use Conventional Commits format
- If SDD tasks forecast >400 lines, group commits into chained PR slices BEFORE starting implementation

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| — | — | No project-level convention files found (new project) |

*Project is newly initialized. Add CLAUDE.md, AGENTS.md, or .cursorrules to register project conventions here.*
