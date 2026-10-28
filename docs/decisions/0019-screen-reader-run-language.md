# 0019 — Screen-reader runs record their language

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** senakster (Emil's call while planning L09; no review required)
- **Affects modules:** L02, L03, L04, L05, L06, L07, L09
- **Amends:** L02 decision 7, the a11y contract type (`TestRun`)

## Context

Every contract quotes what a screen reader said, in `announcements[].announces`. The runs behind
those quotes were in Danish: NVDA said "knap" (button), "til" (on), "overskrift niveau 2" (heading
level 2). The contract type has nowhere to say so. The language appears only in the prose around
the quote, when it appears at all.

That was harmless while only tests read the contracts. L09 publishes them: on a docs page, in
`components.json` and in `llms.txt`. There, an unmarked Danish quote fails three ways:

- On an English docs page it is spoken with English pronunciation, which fails WCAG 3.1.2 (Language
  of Parts) on the page itself.
- A reader can't tell the reader's localised words from the component's own output.
- An agent copies "knap" into an expected-output test.

L09's plan reviewers (`wcag-auditor`) proposed a typed field. Emil chose it while planning L09
(plan decision 12).

## Decision

- **A required field on screen-reader runs:** `language`, a BCP 47 tag (`'da'`, `'en-GB'`), naming
  the language of the reader's speech in that run.
- **The same field on announcements that quote speech.** A contract can hold runs in more than one
  language (Button has an English and a Danish run), and an announcement doesn't say which run it
  came from. So an announcement whose `announces` quotes speech says the language of its quotes,
  and a check requires that language to be one of the contract's screen-reader runs.
- **Double quotes mark verbatim speech, and nothing else.** A gloss is written unquoted
  (`"til" means on`). The renderer wraps each double-quoted span in an element with `lang`, so the
  English text around a quote stays English.
- **Every existing contract is updated** in the same change, from its run notes.
- **L09 renders it:** in the docs page, `docs/<component>.md` and the manifest, each run shows its
  language, and each quote carries `lang`.
- **Keyboard, automated and other runs are unchanged.** They record no speech.

Rejected:

- **Translating the quotes into English.** It would publish words no reader said; the evidence is
  what was heard.
- **Leaving the language in prose.** Nothing could render `lang` from it, and the manifest couldn't
  carry it.

## Consequences

- One more required field for each screen-reader run. The type rejects a run without it, and every
  future contract states its reader's language.
- A quote and its gloss still share one string, kept apart only by the quoting rule. Separating
  them into typed parts would be a further contract change, not made here.
- Every existing gloss written in double quotes is rewritten in the same change.
- **Revisit when:** a contract needs a quote and its translation as separate published values, or
  a run spans more than one speech language.
