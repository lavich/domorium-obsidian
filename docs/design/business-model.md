# Business model research

Researched 2026-10-12. Sources are linked; figures without a source are
inferences and say so. Nothing here is decided yet — see the recommendation at
the end and the open item in [`next-steps.md`](next-steps.md).

## The niche in Obsidian

Download counts from
[community-plugin-stats.json](https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json)
on 2026-10-12.

| Plugin | Downloads | What it is | Model |
| --- | --- | --- | --- |
| [Charted Roots](https://chartedroots.com/) (formerly Canvas Roots) | 75 571 | People as Markdown + YAML; GEDCOM 5.5.1 import/export, Canvas trees, maps, 17+ reports, PDF, GPS-style sources, merge wizard | MIT, donations |
| Relations | 17 301 | Relationship graph, genealogy among other uses | free |
| People Tree | 1 357 | Trees and timelines from YAML | free |
| **Gedcom (domorium)** | 1 328 | Raw `.ged` editor | MIT |
| Grafily, Arbor Family Tree | ~1 100 each | Family graphs from notes | free |

No paid genealogy plugin exists. The leader lives on donations. Charted Roots
converts the tree into notes — the second database this plugin refuses to
build. **The differentiator is the file**: GEDCOM 7 and 5.5.1 kept as the source
of truth, validated, edited without loss.

## Obsidian's rules (May 2026)

- [The future of plugins](https://obsidian.md/blog/future-of-plugins/): the
  directory is not a store; license keys, API keys and accounts are allowed;
  every plugin is labelled **Free / Optional payments / Paid**; **new
  closed-source plugins are not accepted**; every release is scanned.
- [Developer policies](https://docs.obsidian.md/Developer+policies): payment or
  account must be disclosed in the README; no obfuscation, no self-updating, no
  client-side telemetry; network use disclosed.

A paid add-on in the directory must therefore ship readable source. Its key
check is an honour lock.

## Licensing today

Both repositories and every `@domorium/*` package are MIT, and the author is
the only contributor, so new code can be released under any licence. What has
shipped under MIT stays MIT. The upstream roadmap puts `packages/mutations` and
a Forms Editor in the open core, so **paid editing would be legally forkable**.
`CONTRIBUTING.md` has no CLA; add one before the first outside PR if relicensing
may ever be needed.

## What genealogists pay for

| Product | Free | Paid |
| --- | --- | --- |
| [RootsMagic 11](https://rootsmagic.co.uk/try-rootsmagic-essentials) | Essentials: unlimited people, Evidence Explained citations, basic charts | $39.95 once: research logs, DNA, maps, narrative reports, timelines, wall charts, PDF/Word, Ancestry sync |
| [Legacy 10](https://www.legacyfamilytree.com) | Free (owned by MyHeritage) | — |
| [Family Historian 7](https://store.family-historian.co.uk/product/family-historian-7/) | 30-day trial | $64.95 once |
| [Family Tree Maker 2024](https://www.mackiev.com/store_us.html) | — | ~$80 once, upgrade $39.95 |
| [MacFamilyTree 11](https://www.syniumsoftware.com/macfamilytree) | — | $69.99 once |
| [Grampshub](https://www.grampshub.com/pricing) (Gramps Web hosting) | self-host free | €4–10 a month, hosting only |
| Ancestry, MyHeritage | limited | subscriptions for records and DNA |

Free tiers include entering and viewing data. Money is paid for **output**
(reports, books, wall charts), **research tooling** (logs, tasks, conflicts,
clean-up, DNA) and **sync**. Desktop software sells once per major version;
subscriptions belong to services with running costs. Privacy is a live concern
([23andMe bankruptcy](https://www.fortune.com/2025/03/28/23andme-bankruptcy-chapter-11-genetic-data-medical-ancestry-dna-silicon-valley-delete),
[Ancestry's perpetual licence](https://whodoyouthinkyouaremagazine.com/news/ancestry-claims-perpetual-non-revocable-license-to-user-content)).

## Paid Obsidian plugins in practice

- **Copilot**: $19.5k MRR, 1 459 subscriptions, on 2.5M downloads and a real
  cloud cost ([TrustMRR via Stripe](https://www.sofarbot.com/stories/brevilabs-logan-yang-19463-mrr-verified)).
- **Smart Connections**: paid Pro plugins; the 2026 switch from GPL to
  proprietary drew complaints, and the author says only a very small share pays
  ([discussion #1294](https://github.com/brianpetro/obsidian-smart-connections/discussions/1294)).
- Templater (5.9M downloads), Excalidraw, Notebook Navigator: donations, or
  income beside the plugin (courses, a book).

## Mechanics, if anything is sold

- Merchant of record with built-in license keys:
  [Polar](https://docs.polar.sh/benefits/license-keys) (~4–5% + fee),
  Lemon Squeezy (~5% + 50¢), Paddle (5% + 50¢), Gumroad (~10% + 50¢).
- Offline check: a signed key verified locally keeps "no network" true after a
  one-time activation. Ed25519 in WebCrypto may be missing on old Obsidian
  installers; fall back to ECDSA P-256 or a pure-JS verifier.
- One licence across clients is possible only with an own key server (the
  [Wallaby.js](https://wallabyjs.com/purchase) pattern). JetBrains Marketplace
  sells natively at 15% but ties the licence to a JetBrains account; it also
  allows externally paid plugins.

## Recommendation

1. **Reading and editing stay free**, forms included. Free-tier norms in the
   category, a free source editor already in the plugin, and a free competitor
   at 57× the downloads all point the same way. This also lets `mutations` stay
   in the open upstream without conflict.
2. **Grow first.** At ~1.3k downloads there is nothing to monetise yet. The
   research desk, built on GEDCOM fidelity, is the product.
3. **Validate demand before building anything paid**: GitHub Sponsors and
   `fundingUrl` now, a waitlist or pre-sale page for a Pro add-on later.
4. **If Pro happens**, it is a separate plugin labelled *Optional payments*,
   source-available, sold once per major version at $30–50 through a merchant
   of record with an offline-signed key: research log and tasks, conflict and
   evidence analysis, narrative reports and book PDF, data clean-up, duplicates
   and merge. One key could later cover VS Code and the web editor.
5. **Subscription only for a real service**, such as sharing a tree with
   relatives, priced like Grampshub.
6. **Add a CLA** to `CONTRIBUTING.md` before the first outside contribution.
