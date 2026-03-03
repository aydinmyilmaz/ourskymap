# Image Studio Text Effects Research (Deferred)

**Date:** 2026-02-20  
**Status:** Deferred (revisit later)

## Context

Goal: Support premium text looks in Image Studio for digital products (example style: varsity/college with gradient, metallic/chrome, outline/stroke, shadow).

Requested direction:
- Familiar toolbar UX (Word-like controls)
- Ready-to-use visual presets for customers
- Feasible in current web editor (without Photoshop workflow)

## Key Finding

The target look is **not only a font choice**. It is:
1. Font skeleton (e.g., varsity/college style)
2. Visual effect stack (gradient/chrome/gold, stroke, shadow, optional texture)

So, implementation should be **font + effect preset system**, not “font only”.

## Feasibility

Feasible in current editor.

Recommended approach:
1. Add 2-4 licensed varsity-style fonts (`@font-face` + self-host)
2. Add text effect presets in editor (single-click apply)
3. Each preset controls style tokens:
   - `fontFamily`
   - `fontWeight`
   - `color` / gradient
   - `stroke`/outline simulation
   - `textShadow` stack
   - optional letter spacing and transform

Initial estimate:
- Basic high-quality preset pack: ~0.5 to 1 day
- Expanded “pro” preset set + QA: ~1 to 2 days

## Preset Examples (Planned)

- `Varsity Blue Chrome`
- `Silver Outline`
- `Gold Foil`
- `White Stroke Classic`
- `Dark Steel`

## Libraries / Sources Strategy

There is no single “drop-in metallic varsity text” library that solves this perfectly across product needs.  
Practical route: self-hosted fonts + internal preset layer.

Potential font sources:
- Google Fonts / Fontsource (open fonts, self-host flow)
- Commercial marketplaces (with correct license scope)

## Licensing Risk (Important)

Because this is an end-user customizer (customer edits text in product UI), license scope must explicitly allow:
- app/web embedding
- end-user customization (on-demand rendering)
- POD/digital product usage if applicable

Do **not** assume marketplace/subscription fonts are automatically valid for this use case.

## Revisit Checklist

When revisiting this task:
1. Finalize required license scope (legal/commercial check)
2. Select final font set (2-4 initial)
3. Implement preset schema in code
4. Add preset selector in toolbar
5. Validate output quality on both `Canvas` and `T-Shirt` modes
6. Add QA snapshots for top 5 presets

## Candidate References (to validate at implementation time)

- https://developers.google.com/fonts/faq
- https://github.com/fontsource/fontsource
- https://helpx.adobe.com/fonts/using/add-font-licenses.html
- https://elements.envato.com/license-terms
- https://support.fontspring.com/hc/en-us/articles/30453824509211-Using-Desktop-and-Design-Applications
- https://developer.chrome.com/blog/colrv1-fonts

Note: Links above are captured as research pointers and should be re-verified during implementation.
