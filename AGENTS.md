# AGENTS.md

## Project Context

This folder is the only editable product surface for Meera v2. The parent folder contains the original v1 site, which is considered complete and frozen.

Default target: a polished, mobile-first web app that can reuse selected v1 ideas after the user gives explicit instructions.

## V1 Boundary

- Do not edit files outside this `v2/` folder for product work.
- Do not modify the original root site, its assets, its deployment configuration, or its documentation.
- Read v1 files only as reference material, and copy content into v2 only when the user explicitly asks for that next step.
- Preserve this folder as an independent Git repository with its own commits, remote, and deployment history.

## Setup State

- This repo starts as a setup-only shell. No v2 product implementation has begun.
- Wait for the user's next instructions before choosing a framework, copying v1 code, changing design direction, or deploying.
- Document meaningful decisions as they happen in this repo's README and commit messages.

## Development Rules

- Design mobile first, then scale up cleanly for tablet and desktop.
- Prefer complete working product surfaces over placeholder-heavy scaffolding.
- Use conservative implementation choices aligned with the selected stack.
- Keep source files ASCII unless the project has a clear reason for Unicode.
- Run available verification before reporting completion, and state exactly what was or was not verified.
