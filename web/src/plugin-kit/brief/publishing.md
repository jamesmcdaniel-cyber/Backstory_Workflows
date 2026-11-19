# Building and publishing

The page is never designed per run. It's `assets/brief-template.html` filled with validated data, so every run looks the same and leaders keep one link.

## Build

Work in one run folder in the working or scratch directory. Write `data.json` (references/data-schema.md), then:

```
python3 <skill>/scripts/build_brief.py data.json brief.html
```

The script:
- checks the template is the one the plugin shipped. If it says the template changed, restore the shipped file; never edit it during a run;
- validates `data.json` and exits 1 with a list of problems. Fix the data and build again;
- prints warnings when text runs long. The page still builds, but tighten the flagged text and build again;
- ranks and counts the items and stamps the plugin version. Take every number you report from its output, never from memory.

To check the data without building: `python3 <skill>/scripts/build_brief.py --check data.json`.

Never hand-edit `brief.html` or the template.

**No-script path** (only if the environment can't run Python, and only after asking for code execution to be turned on): read the template, replace the single placeholder `/*__DATA__*/null` with the JSON (escape every `</` as `<\/`), check the data against "Rules the build script enforces" in data-schema.md yourself, rank by level, then value, then date, and tell the user the brief was built without the script's checks.

## Last run's brief

When there is a target (below), read the current brief first and save it in the run folder as `previous.html`. Its data is embedded in the page. Use it to compare in your report back: items new to the top levels, items that dropped off, and level changes.

## Publish to the same place

The target comes from the request first, then `settings.json → output`:

1. **The request gives the brief's link:** update that artifact in place.
2. **`output.artifactUrl` is set** and the environment can update an artifact by its link: publish `brief.html` there.
3. **`output.filePath` is set** (for example a file in a synced OneDrive or SharePoint folder): overwrite that file. Its shared link stays the same.
4. **Neither** (first run): publish `brief.html` as a new artifact, or save it where the user asks. Give the user the link and tell them to include it next time ("refresh the brief at <link>"). A scheduled task carries the link in its own prompt. Don't ask anyone to edit `settings.json`: it sits inside the installed plugin, and an update replaces it.

**Scheduled runs never create a new artifact.** With no target, they stop and say the schedule needs the brief's link. If the run can't finish, they publish nothing, so the last brief stays in place.

The page is self-contained: data, styles and scripts are inline, and it makes no data calls when viewed. Its only external request is for web fonts, with system fonts as the fallback.

## After publishing, tell the user

- The link or file, and the run date.
- How many items were reviewed and shown, the count at each level and the value at stake (from the script's output).
- Anything that limited the run: missing fields and the fallback used, record-search filters that were changed, tool errors, items that couldn't be assessed.

Run notes go only in your chat message. The page never shows banners, warnings or notes about how the run went.
