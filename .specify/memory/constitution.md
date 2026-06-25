<!--
SYNC IMPACT REPORT
==================
Version change: (template / unversioned) → 1.0.0
Rationale: Initial ratification — first concrete constitution replacing the
unfilled template. MAJOR baseline established.

Modified principles: none (initial adoption)
Added principles:
  - I. Code Quality
  - II. Testing Standards (NON-NEGOTIABLE)
  - III. User Experience Consistency
  - IV. Performance Requirements
Added sections:
  - Quality Gates & Constraints
  - Development Workflow
  - Governance

Templates requiring updates:
  - .specify/templates/plan-template.md ............. ✅ no change needed
    (Constitution Check is a dynamic gate referencing this file)
  - .specify/templates/spec-template.md ............. ✅ no change needed
    (no hardcoded principles; Success Criteria already supports UX/perf metrics)
  - .specify/templates/tasks-template.md ............ ✅ no change needed
    (test/perf/polish task categories already align with principles)
  - .github/prompts/*.prompt.md ..................... ✅ no outdated references

Follow-up TODOs: none
-->

# My Project Constitution

## Core Principles

### I. Code Quality

Code MUST be readable, consistent, and maintainable before it is considered complete.

- All code MUST pass the project's configured linter and formatter with zero errors
  before merge; formatting is automated, not debated in review.
- Every public function, type, and module MUST have a clear, single responsibility;
  functions that exceed reasonable cognitive complexity MUST be decomposed.
- New code MUST match the naming, structure, and idioms of the surrounding code.
- No commented-out code, dead code, or unexplained `TODO`s MAY be merged; a `TODO`
  MUST reference a tracked issue.
- Every change MUST pass review by at least one other contributor; the reviewer is
  accountable for verifying compliance with this constitution.

**Rationale**: Code is read far more often than it is written. Enforcing consistency
and low complexity at merge time keeps the cost of every future change predictable.

### II. Testing Standards (NON-NEGOTIABLE)

Tests MUST prove behavior, not merely exercise it, and MUST exist before a feature is
considered done.

- Test-first is mandatory for new behavior: a failing test MUST be written and
  reviewed before the implementation that makes it pass (Red → Green → Refactor).
- Every user-facing requirement MUST have at least one automated test that would fail
  if the requirement regressed.
- Contract and integration tests MUST cover all module boundaries, external
  interfaces, and shared schemas; unit tests cover internal logic.
- The full test suite MUST pass on the default branch at all times; a failing suite
  blocks all merges until green.
- Test coverage MUST NOT decrease as a result of a change; new branches and error
  paths MUST be tested, not just happy paths.

**Rationale**: Tests are the executable specification. Writing them first forces clear
requirements and guarantees every shipped behavior is independently verifiable.

### III. User Experience Consistency

The product MUST behave predictably and uniformly across every surface a user touches.

- Interaction patterns, terminology, error messages, and visual or output conventions
  MUST be consistent across all features and entry points.
- Every user-facing error MUST be actionable: it MUST state what went wrong and what
  the user can do next, in plain language.
- Breaking changes to any user-facing interface (UI, CLI, or API) MUST be versioned
  and accompanied by a migration path; silent breaking changes are prohibited.
- Accessibility and clear feedback for every user action (success, failure, progress)
  MUST be treated as requirements, not enhancements.

**Rationale**: Consistency is what lets users transfer knowledge from one part of the
product to another. Predictability reduces support burden and builds trust.

### IV. Performance Requirements

Performance MUST be specified, measured, and enforced — never assumed.

- Every feature with user-facing latency or throughput characteristics MUST declare
  explicit, measurable performance targets (e.g., p95 latency, throughput, memory)
  in its specification.
- Performance-critical paths MUST have automated benchmarks or assertions; regressions
  beyond the agreed budget MUST fail the build.
- Default budgets, unless a feature overrides them with justification: interactive
  responses MUST complete within 200ms p95; no operation MAY block the user without
  visible progress feedback.
- Optimization MUST be driven by measurement; speculative optimization that adds
  complexity without a profiled justification is prohibited (see Code Quality).

**Rationale**: Performance that is not measured silently degrades. Explicit budgets
turn speed into a verifiable contract rather than a hope.

## Quality Gates & Constraints

The following gates MUST all pass before any change is merged:

- Linting and formatting: zero errors.
- Test suite: green, with coverage not decreased.
- Performance checks: declared budgets met for affected paths.
- Review: at least one approving review confirming constitutional compliance.

Complexity that violates a principle MUST be recorded in the implementation plan's
Complexity Tracking table with an explicit justification and the rejected simpler
alternative. Unjustified violations block merge.

## Development Workflow

- Work flows through the Spec Kit lifecycle: specify → plan → tasks → implement, with
  the Constitution Check gate in the plan enforced before and after design.
- Specifications MUST declare testable acceptance criteria and, where relevant,
  performance targets and UX expectations, so principles II–IV are checkable.
- Pull requests MUST be small enough to review meaningfully and MUST describe how the
  change satisfies the affected principles.
- CI MUST enforce the Quality Gates above; gates MUST NOT be bypassed manually except
  by a documented, time-boxed exception approved per the Governance process.

## Governance

This constitution supersedes all other development practices. Where another document
conflicts with it, this constitution wins.

- **Amendments**: Any change to this constitution MUST be proposed via pull request,
  include the rationale and impact, and be approved by the project maintainers. On
  approval, the version and amendment date MUST be updated and dependent templates
  re-synced.
- **Versioning policy** (semantic):
  - MAJOR — backward-incompatible removal or redefinition of a principle or gate.
  - MINOR — a new principle or section, or materially expanded guidance.
  - PATCH — clarifications, wording, or non-semantic refinements.
- **Compliance**: Every plan and pull request MUST verify compliance with these
  principles. Reviewers MUST reject changes that violate a principle without a
  recorded, approved justification.
- **Exceptions**: Temporary exceptions MUST be documented, time-boxed, linked to a
  tracking issue, and approved by a maintainer before merge.

**Version**: 1.0.0 | **Ratified**: 2026-06-23 | **Last Amended**: 2026-06-23
