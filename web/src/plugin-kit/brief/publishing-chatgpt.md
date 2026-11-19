# Building and sharing the brief

The page is never designed per run. It's `assets/brief-template.html` filled with validated data, so every run looks the same.

## Build

Work in one run folder in the code environment. Write `data.json` (references/data-schema.md), then:

```
python3 <skill>/scripts/build_brief.py data.json brief.html
```

`<skill>` is the folder this skill's SKILL.md is in.

The script:
- checks the template is the one the skill shipped. If it says the template changed, restore the shipped file; never edit it during a run;
- validates `data.json` and exits 1 with a list of problems. Fix the data and build again;
- prints warnings when text runs long. The page still builds, but tighten the flagged text and build again;
- ranks and counts the items and stamps the version. Take every number you report from its output, never from memory.

To check the data without building: `python3 <skill>/scripts/build_brief.py --check data.json`.

Never hand-edit `brief.html` or the template.

**No-script path** (only if code can't run here, and only after telling the user the brief needs code execution): read the template, replace the single placeholder `/*__DATA__*/null` with the JSON (escape every `</` as `<\/`), check the data against "Rules the build script enforces" in data-schema.md yourself, rank by level, then value, then date, and tell the user the brief was built without the script's checks.

## Last run's brief

ChatGPT keeps nothing between runs, so the previous brief is whatever the user attaches. When they attach an earlier `brief.html` (or one is in this conversation already), save it in the run folder as `previous.html`. Its data is embedded in the page. Use it to compare in your report back: items new to the top levels, items that dropped off, and level changes. With no previous brief, say this is a first run and compare nothing.

## Share it

1. Save the page as the file named in `settings.json → output.fileName` (or `brief.html` when that's null), and give it to the user as a download from the code environment. Where the user's ChatGPT shows HTML files in a preview, mention they can open it there.
2. Tell the user to keep the file and attach it to the next run, so it can show what changed. A scheduled task can't attach files, so a scheduled run compares nothing and says so.
3. Never paste the page's HTML into the chat, and never rebuild it by hand outside the script.

If the run can't finish, give no file: an incomplete brief is worse than last week's.

The page is self-contained: data, styles and scripts are inline, and it makes no data calls when viewed. Its only external request is for web fonts, with system fonts as the fallback.

## After building, tell the user

- The file, and the run date.
- How many items were reviewed and shown, the count at each level and the value at stake (from the script's output).
- Anything that limited the run: missing fields and the fallback used, record-search filters that were changed, tool errors, items that couldn't be assessed.

Run notes go only in your chat message. The page never shows banners, warnings or notes about how the run went.
