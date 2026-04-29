# Website Redesign — SGS Consulting

Prototype for a redesigned SGS Consulting website. Lives here as a spec — open `index.html` in any browser to view.

> **Status:** v1 prototype. English-first (mirrors the current site's primary language). Spanish version not built yet — same structure can be translated when ready.

---

## Theses behind the redesign

### 1. Information architecture: 9 flat services → 4 packaged buckets
The current site at sgsconsulting.net lists nine services in a flat grid. That's cognitively expensive for a prospect arriving cold. The new IA groups them into four packages (mirrors `_reference/services_catalog.md`):

| Bucket | Services |
|--------|----------|
| **Financial Services** | Managed Accounting · Tax & Compliance · Risk & Insurance |
| **Legal & Structuring** | Business Formation · Delaware Infrastructure · Legal Support |
| **Strategy Consulting** | Business Advisory & Executive Counseling |
| **Brand & Digital** | Branding & Business Identity |

The prospect sees four pillars first, then drills into specific services. Internal SOPs stay unchanged — this is purely packaging.

### 2. Visual elevation: corporate-modern → editorial-prestige
Reference points: McKinsey, Goldman Sachs, JP Morgan. What that translates to concretely:

- **Typography drives the design**, not photography. The current site leans on stock business photos (Unsplash). The redesign uses no stock imagery — large editorial serif type and generous whitespace carry the visual weight.
- **Serif display + grotesk body.** Cormorant Garamond (display) paired with Inter (body) — closer to the editorial finance aesthetic than uniform sans-serif.
- **Roman numerals over emojis.** Service buckets are marked I, II, III, IV — not emoji icons. More McKinsey, less SaaS landing page.
- **Sharp, not rounded.** No rounded corners on primary elements. No drop shadows. Hairline rules instead of heavy boxes.
- **Restrained palette.** Deep navy, warm cream, muted antique gold accent. No bright colors.

### 3. What's preserved from the current site
The existing site has strong copy and proof points that we keep verbatim:

- The four "We…" value propositions ("We manage infrastructure, not just paperwork" etc.) — they're already on-brand for a consultancy and we surface them as principles.
- Social proof metrics (470+ companies formed, 700+ clients served, 12+ years, 98% retention).
- The two office addresses (Delaware HQ + Texas).
- The boutique-firm + long-term-partner positioning.
- The bilingual structure (this prototype is English; Spanish port mirrors layout).

---

## Design system tokens

Defined as CSS custom properties at the top of `styles.css`. Quick reference:

### Color
| Token | Hex | Use |
|-------|-----|-----|
| `--color-cream` | `#f5f0e6` | Page background |
| `--color-ivory` | `#fbf8f2` | Card / panel surface |
| `--color-navy` | `#0e1c2e` | Hero, footer, primary serif on light |
| `--color-navy-soft` | `#1e3149` | Secondary navy (rules, borders on dark) |
| `--color-text` | `#1a2230` | Body copy on light |
| `--color-text-muted` | `#5a6471` | Secondary copy |
| `--color-accent` | `#8a6d3b` | Antique gold — kickers, hairlines, hover |
| `--color-rule` | `#ddd5c2` | Cream-warm divider on light surfaces |

### Typography
- **Display:** Cormorant Garamond, weights 400 / 500 / 600
- **Body:** Inter, weights 400 / 500 / 600
- Body size baseline: 16px / 1.65 line height
- Display sizes use clamp() for responsive scaling

### Spacing
- Base unit: 8px
- Section vertical padding: clamp(96px, 12vw, 160px)
- Container max-width: 1240px with 24px (mobile) → 48px (desktop) gutter

---

## Page sections

```
HEADER          sticky · wordmark + nav (Philosophy · Services · Approach · Contact)
HERO            tagline kicker · large editorial headline · subhead · primary CTA
PHILOSOPHY      "Boutique by design. Integrated by principle." + 4 principle cards
SERVICES        4 bucket cards with sub-service lists (Roman numeral markers)
APPROACH        4 numbered editorial steps (Discover · Structure · Execute · Partner)
PROOF           4 large numbers (companies formed, clients served, years, retention)
OFFICES         Delaware HQ + Texas, large addresses
CONTACT         CTA block: phone · email · short prompt
FOOTER          Mini wordmark · service nav · contact · legal links
```

---

## How to view

```sh
open _specs/website/index.html
```

Or drag `index.html` into any browser tab. No build step.

---

## What's NOT in v1 (intentional)

- **Spanish version** — same structure can be ported when ready.
- **Working contact form** — placeholder only. Real form needs backend (e.g., HighLevel form embed).
- **Subpages (/about, /services, /contact)** — single landing page covers everything for now. Multi-page structure can split later if needed.
- **Real photography** — none used. If we add later, would be editorial portrait style (real team photos, not stock).
- **Animations / scroll effects** — minimal. A McKinsey-feel site doesn't need motion to convey prestige.

---

## Open questions before this goes live

1. Logo / wordmark — is there an existing logotype to use, or do we treat the SGS wordmark as the logo? (Currently the prototype uses a simple SGS Consulting wordmark in the display serif.)
2. Final copy — value props are pulled verbatim from the current site. Do we want to refine the hero headline or keep "We structure, manage, protect, and scale businesses in the United States."?
3. Industry list — current site mentions government, education, nonprofits, hospitality, construction. Worth a section, or is the boutique positioning better served without naming verticals?
4. CTA destination — phone? Calendly? Custom intake form? (Currently links to phone + email.)
