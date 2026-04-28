# COG-second-brain local notes - 2026-04-25

## Status

- Intended repo: `https://github.com/huytieu/COG-second-brain`
- Intended local target: `tmp/github-lab/cog-20260425-*`
- Actual outcome: no real clone performed
- Reason: automation environment blocked `git clone` before execution

## What was verified locally

- Present runtimes:
  - `git 2.53.0.windows.2`
  - `node v24.14.0`
  - `python 3.13.3`
  - `pnpm`
  - `npm`
- Missing helpers:
  - `uv`
  - `docker`
  - `gh`

## What was verified from repo docs

- Repo is positioned as an agentic second brain built on Markdown, Git and Obsidian-style vault structure
- README exposes a clear content tree:
  - `00-inbox`
  - `01-daily`
  - `02-personal`
  - `03-professional`
  - `04-projects`
  - `05-knowledge`
  - `06-templates`
- Setup path is lightweight:
  - clone repo
  - open an AI agent
  - run onboarding
- Recommended integrations are optional; the core value is in Markdown workflow design

## Integration read

- Best use for lin-portfolio:
  - show the workflow, not the whole product
  - extract outputs like research notes, daily briefs, project logs and knowledge cards
- Good framing names:
  - `Student Growth OS`
  - `Creator Second Brain`
  - `AI Research-to-Content Workflow`

## Next attempt

- If outbound fetch is allowed later, retry a shallow clone first
- If clone remains blocked, continue reading:
  - `AGENTS.md`
  - `docs/AGENT-SUPPORT.md`
