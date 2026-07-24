# Orla — Design System

Design system for **Orla** (orla.tech), a São Paulo–based digital-product
consultancy. *"Potencializamos a inovação por meio de produtos digitais."*
Orla partners with managers and founders to create and evolve digital products
through Discovery, new-product development and product evolution.

The brand name **orla** is Portuguese for *shoreline / waterfront*, and the
identity is built around a single proprietary motif: a continuous **wave
("ondulado")** — the same curve that forms the logo symbol, tiled into the
brand's signature background field.

## Sources
- **Figma:** *"Contexto orla ds.fig"* — brand board: LOGO, BACKGROUNDS, CONES
  (icons), Mascote Orlando, Documentação, and product analyses of the **Site
  Orla** and **Farol** surfaces. (Provided as a mounted file; no public link.)
- **Website:** https://orla.tech
- Token values, the wave geometry and the logo were extracted from the Figma
  file; brand voice and product structure from the in-file documentation and
  the live site.

## Products represented
1. **Site Orla** — institutional marketing site. Editorial, premium, heavy
   black & white, wave motif, blue as a punctual accent. → `ui_kits/site/`
2. **Farol** — internal SaaS product (vacation / absence / IT self-service).
   Dark-mode dashboard, sidebar, metric & status language. → `ui_kits/farol/`

There are also two sub-brands in the logo system: **orla academy** and
**orla conecta** (supported via `Logo`'s `sub` prop).

---

## CONTENT FUNDAMENTALS — how Orla writes

- **Language:** Brazilian Portuguese. Headlines are short, confident
  statements ("Potencializamos a inovação por meio de produtos digitais.",
  "O que fazemos", "Como fazemos", "Comunidade. Colaboração. Comprometimento.").
- **Person:** speaks as *"nós"* (we) to the client as *"você"* — close and
  partnering ("Na Orla, te acompanhamos de perto.").
- **Tone (from the brand's own voice guide for the mascot Orlando):**
  *tecnológico, claro, próximo, inteligente, levemente descontraído, prestativo,
  confiante — **sem parecer infantil***. Helpful and warm, never silly.
  - ✅ "O Orlando te ajuda a organizar tudo antes de começar."
  - ✅ "Tudo certo por aqui. O Orlando já deixou essa etapa pronta para você."
  - ❌ "Uhuuul, o Orlandinho resolveu tudo pra você!" (infantilises the brand)
- **Casing:** sentence case for headlines and UI. Small uppercase **eyebrows**
  with wide tracking label sections (e.g. nav groups "MENU", "SUPORTE TI").
- **Product copy (Farol):** objective and task-oriented — "Solicitar Férias",
  "Saldo de Férias", "Últimas Solicitações", status words like *Aprovada,
  Usufruída, Vencido, Em aquisição*.
- **Emoji:** not used. Personality comes from the mascot and the wave, not emoji.

---

## VISUAL FOUNDATIONS

**Colour.** The system is fundamentally **black & white**. `#000000` and
`#FFFFFF` carry the brand; a warm paper white `#FBFCF6` softens large light
areas. **Blue `#0057FF`** is the *one* functional accent — actions, progress,
links, the timeline spine. A coral/persimmon (`#FF5E40` / `#FC9D80`) is a
secondary brand accent used sparingly. Status colours (green/red/purple/blue)
appear only inside the product (Farol). The neutral ramp is cool grey.

**Typography.** Display & headings: **Inter Tight** — tight tracking
(−0.03em on big display), light-to-medium weights, large editorial steps.
Body & UI: **Archivo**. Code/specimens: **JetBrains Mono**. The *logo wordmark*
is a custom rounded-geometric face (Eastman Alternate Trial in the source);
it is **not** bundled — use the `Logo`/`WaveMark` components or the official SVG.
Comfortaa is loaded only as the wordmark's fallback approximation.

**The wave ("ondulado").** The brand's proprietary device. One wave glyph (the
logo symbol) tiles into a field used full-bleed on heroes, footers and brand
surfaces — black-on-white, white-on-black, or faint tonal. It can fade out with
a gradient (`WavePattern fade="…"`) as on the homepage hero and footer.

**Layout.** Spacious and editorial — generous whitespace, wide gutters, large
section rhythm on an 8px grid. The site favours big type and lots of air; the
product is denser and modular.

**Cards.** Rounded (`--radius-lg`, 16px), hairline border (`--neutral-300`),
low/no shadow by default. Light editorial cards on the site (`--neutral-50`);
dark cards in Farol (`--neutral-900` + translucent white border).

**Corner radii.** Soft and friendly — 8 / 12 / 16 / 24px, pills for tags &
progress tracks. Large feature panels use 24–32px.

**Shadows.** Cool, soft, low-spread — used only to lift interactive cards;
never coloured or heavy. Most structure is done with hairline borders.

**Imagery.** Black & white photography ("para reforçar o tom institucional").
Cool/neutral, editorial. No stock-colour photography.

**Motion.** Calm and confident — short eased transitions (120–360ms),
`cubic-bezier(0.16,1,0.3,1)` for entrances. No bounce, no infinite loops.
Progress rings/bars animate their fill.

**States.** Hover: subtle surface tint + a 1–2px lift on buttons/cards; links
underline. Focus: 3px blue ring (`--blue-50` halo on inputs). Disabled: 45%
opacity. Press: settle back to no-lift.

**Transparency / blur.** Used sparingly — the modal scrim is `rgba(0,0,0,.5)`
with a light backdrop blur; dark-surface borders are translucent white.

---

## ICONOGRAPHY

Orla uses a **thin-line outline** icon style (single ~1.75px stroke, round
caps/joins), often presented inside **circular badges** — black circle with a
white icon, or the inverse — sometimes with the "orla" wordmark beneath (see
the Figma CONES board: scales, beach umbrella, money bag, org chart, medal,
flag-laptop, palm tree, user / user-add, etc., themed around HR/benefits).

The source file's icons come from the **Vuesax / Linear** set. Those exact
glyphs are not bundled here; instead `components/core/Icon.jsx` ships a curated
**inline thin-line set** (≈33 icons) in the same open-stroke style as a faithful
substitute. **Substitution flagged** — if you need the exact Vuesax-Linear
artwork, source it from Figma and add to the `ICONS` map (24×24 stroke paths).

No emoji. No unicode-glyph icons. SVG only, `currentColor`-driven so icons
inherit text colour. The wave mark itself is also `currentColor` SVG.

---

## INDEX — what's in this system

**Root**
- `styles.css` — global entry (imports only). Consumers link this one file.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
  `effects.css`, `base.css`.
- `assets/` — `logo/` (wave mark SVG, black & white), `patterns/` (wave field
  & rising-tide SVGs), `mascot/` (Orlando reference).

**Components** (`window.OrlaDesignSystem_5529f2`)
- `brand/` — **Logo**, **WaveMark**, **WavePattern**
- `core/` — **Button**, **IconButton**, **Badge**, **Card**, **MetricCard**,
  **Avatar**, **Input**, **ProgressBar**, **CircularProgress**, **Icon** (+`ICONS`)
- `navigation/` — **NavItem**

**UI kits**
- `ui_kits/site/` — Site Orla institutional homepage (interactive)
- `ui_kits/farol/` — Farol dashboard (interactive: nav + request modal + toast)

**Other**
- `guidelines/` — foundation specimen cards (colours, type, spacing, radii)
- `SKILL.md` — Agent-Skill manifest for use in Claude Code.

## Notes / caveats
- The **logo wordmark font** is custom and not bundled (Comfortaa fallback).
- **Icons** substitute Vuesax-Linear with a matching inline set.
- Site **photography** is placeholder (grayscale blocks); drop in real B&W photos.
- The **mascot Orlando** is documented (voice + reference) but not yet built as a
  component — flag if you want it productised.
