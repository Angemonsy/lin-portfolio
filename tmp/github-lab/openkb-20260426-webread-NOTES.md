# OpenKB Webread Notes - 2026-04-26

## Local trial summary

- `git clone` into workspace failed on `.git/config` write permissions.
- `git clone --separate-git-dir=...` got past local config writes, then failed on GitHub HTTPS `schannel` credentials.
- `pip install --dry-run openkb` failed locally because the shell environment exposes `no-index=1`.

## What the project is

- CLI-first knowledge compiler for turning raw documents into a Markdown wiki.
- Best fit: long-form reading, idea extraction, cross-document concept building.
- Strong match for a `research -> notes -> concepts -> content` pipeline.

## Key file observations

- `pyproject.toml`
  - Python `>=3.10`
  - main deps: `pageindex`, `markitdown[all]`, `litellm`, `openai-agents`, `watchdog`
- `openkb/cli.py`
  - commands: `init`, `add`, `query`, `chat`, `watch`, `lint`, `list`, `status`, `use`
- `openkb/converter.py`
  - hash check before ingest
  - short-doc convert path writes Markdown into `wiki/sources/`
  - long PDF path defers to `PageIndex`
- `openkb/indexer.py`
  - local PageIndex path by default
  - optional cloud path when `PAGEINDEX_API_KEY` exists
- `openkb/agent/compiler.py`
  - summary first, then concept planning, then concept page create/update

## Website/service integration angle

- Do not embed the CLI directly into the public site.
- Better pattern:
  - ingest reading materials offline
  - publish distilled outputs online
- Best website-facing outputs:
  - topic cards
  - reading digests
  - concept maps
  - article seeds
