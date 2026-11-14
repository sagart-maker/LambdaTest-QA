# LambdaTest QA Agent — Figma design files

Editable SVG frames of the web app (`web-app/public`). Figma imports SVG as vector layers with live text.

## Import into Figma
1. Create a new Figma design file named "LambdaTest QA Agent".
2. Select all `.svg` files in this folder and drag them onto the canvas
   (or File → Import / Ctrl+Shift+K). Each file becomes one frame.
3. Install the **Inter** font if Figma flags missing fonts (the code font is Consolas).

| File | Frame |
|---|---|
| 01-design-tokens.svg | Colour tokens (light + dark), type scale, radius, spacing |
| 02-components.svg | Buttons, status/result badges, pills, inputs, checkboxes, device tiers, steps, tabs, run row, log, file list |
| 03-new-test-run-desktop.svg | Home: intake form + Runs list (1440) |
| 04-run-awaiting-approval-desktop.svg | Run detail, plan ready for approval (1440) |
| 05-run-report-ready-desktop.svg | Run detail, report ready (1440) |
| 06-new-test-run-mobile.svg | Home on mobile (375) |
| 07-run-awaiting-approval-mobile.svg | Run detail on mobile (375) |

Layers are grouped and named (e.g. `Card / Runs`, `Button / primary / Create test plan`, `Badge / wait / Awaiting approval`).
Run data in the screens (URLs, counts, defects) is sample content for the mockups.

## Regenerate
`node generate.js .` (run from this folder) after changing tokens or layout in `generate.js`.
