# Choosing Between OpenSCAD Assistive Forge and OpenSCAD Playground

This page helps you decide whether to use **OpenSCAD Assistive Forge** (this project) or the official **OpenSCAD Playground**.

If you’re deciding what to link users to, what to embed, or which tool to build on, start here.

## Quick Summary

- **Choose OpenSCAD Playground** if you want an **official, editor-first** place to write OpenSCAD and run it in the browser.
- **Choose OpenSCAD Assistive Forge** if you want a **Customizer-first** experience: upload a Customizer-enabled `.scad`, get an auto-generated UI, share parameter links/presets, and download outputs.

## What Each Tool Is Optimized For

### OpenSCAD Playground (openscad/openscad-playground)

Best fit when you want:

- **Editor-centric workflow**: write/iterate on OpenSCAD code directly in the browser.
- **Official reference experience**: a widely recognized “canonical” OpenSCAD web app.
- **Upstream alignment**: patterns and runtime decisions closer to how OpenSCAD is typically showcased.

Tradeoffs:

- **Not Customizer-first**: if your goal is “parameter UI → download”, you may need extra work to build a guided non-coder UX.
- **Less generator/toolchain focus**: it’s primarily an app, not a CLI-driven system for scaffolding many dedicated customizers.

### OpenSCAD Assistive Forge (this project)

Best fit when you want:

- **Customizer-first workflow**: upload a Customizer-enabled `.scad` and get a **ready-to-use parameter UI**.
- **A toolchain**: CLI workflows to **extract parameters**, **scaffold** apps (multiple templates), and keep projects consistent.
- **Product features out of the box** (relative to an editor-centric playground):
  - Shareable URL parameters
  - Parameter presets
  - ZIP multi-file projects
  - Library bundles / library manager UI
  - Accessible UI patterns and keyboard-first interaction
  - Theme/high-contrast options and PWA/offline behavior (where applicable)

Tradeoffs:

- **More surface area**: more features means more maintenance and more edge cases to handle.
- **Less “official”**: it’s not the canonical OpenSCAD web app, so you own more responsibility for long-term support and version drift.

## Decision Guide

Use this as a quick checklist:

- **I want people to write OpenSCAD code in a browser editor** → OpenSCAD Playground
- **I want non-coders to customize a model via controls** → OpenSCAD Assistive Forge
- **I need many dedicated, deployable customizers generated from models/schemas** → OpenSCAD Assistive Forge
- **I want the most “official” upstream-aligned web app** → OpenSCAD Playground

## Links

- **OpenSCAD Playground**: `https://github.com/openscad/openscad-playground`
- **OpenSCAD Assistive Forge**: see the repository `README.md`

