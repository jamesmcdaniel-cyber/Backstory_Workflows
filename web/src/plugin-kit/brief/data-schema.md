# Data schema

The shape of `data.json`, the only thing a run changes on the page. `scripts/build_brief.py` checks it and stops with a list of problems when something is wrong. Fix the data and build again; never edit the page or the template by hand.

Dates are `YYYY-MM-DD`. Text is plain (no Markdown or HTML). `null` means unknown: never guess a value to fill a field.

## Top level

```json
{
  "meta": { ... },
  "summary": ["Up to 4 short lines a leader reads first"],
  "metrics": [{ "label": "Pipeline reviewed", "value": "$4.2M", "note": "42 opportunities" }],
  "items": [ ... ]
}
```

- `summary` (optional, up to 4): the few lines that answer the brief's question. Each line rests on the items below it.
- `metrics` (optional, up to 4): extra figures for the top of the page. The level counts and values are added by the script; don't repeat them here.

## meta

| Key | Required | What it is |
|---|---|---|
| `title` | yes | The brief's name, from `settings.json` |
| `question` | yes | The one question the brief answers |
| `asOf` | yes | Today's date: every day count is measured from it, and no evidence may be dated after it |
| `org` | no | The organisation's name, shown before the title |
| `shownLevels` | no | Which levels are listed on the page (default all four). Every item is still counted |
| `listTitle` | no | The heading over the list (default "Where to act") |
| `groupLabel` | no | What `group` means, such as "Region" or "Team". With it, the page adds a filter |
| `valueLabel`, `dateLabel` | no | Column names for `value` and `date`, such as "Renewal value" and "Renews" |
| `currency` | no | Three-letter code for `value` (default USD) |
| `scope` | no | `[{ "label": "Window", "value": "Nov 19, 2026 to Feb 28, 2027" }]`, shown under "Scope of this brief" |
| `sources` | no | `["Backstory"]`, plus any other connector the run used |

## items

One item per record reviewed (account, opportunity, person), shown or not.

| Key | Required | What it is |
|---|---|---|
| `id` | yes | Unique: the Backstory ID when there is one |
| `name` | yes | As Backstory has it |
| `level` | yes | `critical`, `high`, `medium` or `low`, from the framework in this skill's references |
| `headline` | shown items | One line on why it's here (140 characters or fewer) |
| `assessment` | shown items | Two or three plain sentences explaining the level |
| `subtitle` | no | Owner, segment, or other short context |
| `group` | no | The value for the filter (`meta.groupLabel`) |
| `value` | no | A number in `meta.currency`, or `null` |
| `date` | no | The date that matters most, such as the close or renewal date |
| `facts` | no | `[{ "label": "Owner", "value": "Dana Lee" }]`, shown at the top of the side panel |
| `findings` | no | Up to 6, below |
| `actions` | no | Up to 3, below |

The script sets `rank` (by level, then value, highest first, then date, soonest first) and the totals. Never rank or count by hand.

### findings

```json
{
  "area": "Engagement",
  "status": "high",
  "finding": "No two-way contact in 48 days; two follow-ups unanswered.",
  "evidence": [
    { "date": "2026-10-02", "kind": "meeting", "text": "Last meeting held: quarterly review with the VP Finance.", "source": "Backstory activity" }
  ],
  "explanation": "Only for a low finding with nothing to point at: what was checked, and over what window."
}
```

- `status` uses the same four levels.
- **Evidence or nothing:** a `critical`, `high` or `medium` finding needs at least one dated piece of evidence. A `low` finding needs evidence or an `explanation`.
- `kind` is one of `email`, `meeting`, `call`, `news`, `crm`, `note`, `score`, `other`.
- `text` says what happened and what it shows. Paraphrase and attribute what people said ("Backstory's summary of the Oct 27 call: ..."). Use quotation marks only for words that came back verbatim.

### actions

```json
{ "title": "Book a call with the new CFO", "who": "Account owner", "by": "2026-11-25", "why": "The budget holder changed in October and hasn't met us.", "steps": ["Ask the champion for an introduction"] }
```

- `title` is an imperative. `who` is a person named in Backstory or a role. `by` is a date on or after `meta.asOf`.

## Rules the build script enforces

- `meta.title`, `meta.question` and `meta.asOf` are present; ids are unique; levels and kinds are from the lists above.
- Shown items have a headline and an assessment.
- Critical, high and medium findings have dated evidence; no evidence is dated after `meta.asOf`.
- Actions have a title, a who and a date.
- **No email addresses or phone numbers anywhere.** Names and titles only.
- Long text builds with a warning: tighten it and build again.
