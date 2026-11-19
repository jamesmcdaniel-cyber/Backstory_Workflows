#!/usr/bin/env python3
"""Build the brief page from a data file and the bundled template.

Usage: build_brief.py <data.json> <out.html>
       build_brief.py --check <data.json>      (validate only, build nothing)

The template (assets/brief-template.html) is the fixed design: runs only change the data.
This script:
  - checks the template is the one shipped with the plugin (its SHA-256 below);
  - validates data.json against references/data-schema.md and exits 1 with a list of problems;
  - prints warnings, without failing, when text runs long, so the brief stays skimmable;
  - ranks the items (level, then value, then date) and counts them per level, so no run counts by hand;
  - stamps the plugin version and build time, and embeds the data in the template.

Exit codes: 0 built (or valid), 1 data problems, 2 template missing or changed, 3 usage or unreadable file.
Standard library only; runs on Python 3.8+.
"""
import datetime
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
TEMPLATE = os.path.join(SKILL, "assets", "brief-template.html")
PLUGIN_JSON = os.path.join(SKILL, "..", "..", ".claude-plugin", "plugin.json")
PLACEHOLDER = "/*__DATA__*/null"
TEMPLATE_SHA256 = "19d695658a200decc1056e86bf5d4b3d5f20bdb77184cc244cec6a49591e1660"

LEVELS = ["critical", "high", "medium", "low"]
LEVEL_RANK = {level: i for i, level in enumerate(LEVELS)}
EVIDENCE_KINDS = {"email", "meeting", "call", "news", "crm", "note", "score", "other"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?<![\w-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{3,4}(?!\w)")
SOFT = {"headline": 140, "assessment": 450, "finding": 200, "evidence": 300, "why": 300, "step": 200, "summary": 200}
MAX_FINDINGS, MAX_EVIDENCE, MAX_ACTIONS, MAX_SUMMARY, MAX_METRICS = 6, 4, 3, 4, 4


def is_date(value):
    if not isinstance(value, str) or not DATE.match(value):
        return False
    try:
        datetime.date.fromisoformat(value)
        return True
    except ValueError:
        return False


def is_text(value):
    return isinstance(value, str) and value.strip() != ""


def strings(value, path="data"):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from strings(item, f"{path}.{key}")
    elif isinstance(value, list):
        for i, item in enumerate(value):
            yield from strings(item, f"{path}[{i}]")


def validate(data):
    problems, warnings = [], []

    def soft(where, key, text):
        if isinstance(text, str) and len(text) > SOFT[key]:
            warnings.append(f"{where}: {key} runs {len(text)} characters (aim for {SOFT[key]} or fewer).")

    if not isinstance(data, dict):
        return ["The data must be a JSON object with meta and items."], warnings
    meta = data.get("meta")
    if not isinstance(meta, dict):
        return ["meta is missing."], warnings
    for key in ("title", "question"):
        if not is_text(meta.get(key)):
            problems.append(f"meta.{key} is required.")
    as_of = meta.get("asOf")
    if not is_date(as_of):
        problems.append("meta.asOf must be today's date as YYYY-MM-DD.")
        as_of = None
    shown = meta.get("shownLevels", LEVELS)
    if not isinstance(shown, list) or not shown or any(level not in LEVELS for level in shown):
        problems.append(f"meta.shownLevels must list some of: {', '.join(LEVELS)}.")
        shown = LEVELS
    currency = meta.get("currency")
    if currency is not None and not (isinstance(currency, str) and re.match(r"^[A-Z]{3}$", currency)):
        problems.append("meta.currency must be a three-letter code such as USD.")
    for i, entry in enumerate(meta.get("scope") or []):
        if not (isinstance(entry, dict) and is_text(entry.get("label")) and is_text(entry.get("value"))):
            problems.append(f"meta.scope[{i}] needs a label and a value.")

    summary = data.get("summary") or []
    if not isinstance(summary, list) or len(summary) > MAX_SUMMARY or not all(is_text(s) for s in summary):
        problems.append(f"summary must be up to {MAX_SUMMARY} short lines of text.")
    else:
        for i, line in enumerate(summary):
            soft(f"summary[{i}]", "summary", line)
    metrics = data.get("metrics") or []
    if not isinstance(metrics, list) or len(metrics) > MAX_METRICS:
        problems.append(f"metrics must be a list of up to {MAX_METRICS}.")
    else:
        for i, metric in enumerate(metrics):
            if not (isinstance(metric, dict) and is_text(metric.get("label")) and isinstance(metric.get("value"), (str, int, float))):
                problems.append(f"metrics[{i}] needs a label and a value.")

    items = data.get("items")
    if not isinstance(items, list):
        problems.append("items must be a list (it can be empty).")
        items = []
    seen = set()
    for i, item in enumerate(items):
        where = f"items[{i}]"
        if not isinstance(item, dict):
            problems.append(f"{where} must be an object.")
            continue
        where = f"items[{i}] ({item.get('name') or item.get('id') or 'no name'})"
        if not is_text(item.get("id")):
            problems.append(f"{where}: id is required.")
        elif item["id"] in seen:
            problems.append(f"{where}: id {item['id']} is used twice.")
        seen.add(item.get("id"))
        if not is_text(item.get("name")):
            problems.append(f"{where}: name is required.")
        level = item.get("level")
        if level not in LEVELS:
            problems.append(f"{where}: level must be one of {', '.join(LEVELS)}.")
        value = item.get("value")
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))):
            problems.append(f"{where}: value must be a number or null.")
        if item.get("date") is not None and not is_date(item.get("date")):
            problems.append(f"{where}: date must be YYYY-MM-DD or null.")
        if level in shown:
            for key in ("headline", "assessment"):
                if not is_text(item.get(key)):
                    problems.append(f"{where}: {key} is required for a {level} item, because it is shown.")
            soft(where, "headline", item.get("headline"))
            soft(where, "assessment", item.get("assessment"))
        for j, fact in enumerate(item.get("facts") or []):
            if not (isinstance(fact, dict) and is_text(fact.get("label")) and isinstance(fact.get("value"), (str, int, float))):
                problems.append(f"{where}: facts[{j}] needs a label and a value.")
        findings = item.get("findings") or []
        if len(findings) > MAX_FINDINGS:
            problems.append(f"{where}: at most {MAX_FINDINGS} findings.")
        for j, finding in enumerate(findings):
            fw = f"{where} finding {j + 1}"
            if not isinstance(finding, dict):
                problems.append(f"{fw} must be an object.")
                continue
            if not is_text(finding.get("area")) or not is_text(finding.get("finding")):
                problems.append(f"{fw}: area and finding are required.")
            soft(fw, "finding", finding.get("finding"))
            status = finding.get("status")
            if status not in LEVELS:
                problems.append(f"{fw}: status must be one of {', '.join(LEVELS)}.")
            evidence = finding.get("evidence") or []
            if status in ("critical", "high", "medium") and not evidence:
                problems.append(f"{fw}: a {status} finding needs dated evidence. Evidence or nothing.")
            if status == "low" and not evidence and not is_text(finding.get("explanation")):
                problems.append(f"{fw}: a low finding needs evidence, or an explanation of what was checked and over what window.")
            if len(evidence) > MAX_EVIDENCE:
                warnings.append(f"{fw}: {len(evidence)} pieces of evidence; keep the {MAX_EVIDENCE} that matter most.")
            for k, ev in enumerate(evidence):
                ew = f"{fw} evidence {k + 1}"
                if not isinstance(ev, dict) or not is_text(ev.get("text")):
                    problems.append(f"{ew}: text is required.")
                    continue
                if not is_date(ev.get("date")):
                    problems.append(f"{ew}: date must be YYYY-MM-DD. Undated evidence doesn't count.")
                elif as_of and ev["date"] > as_of:
                    problems.append(f"{ew}: dated {ev['date']}, after meta.asOf {as_of}.")
                if ev.get("kind") not in EVIDENCE_KINDS:
                    problems.append(f"{ew}: kind must be one of {', '.join(sorted(EVIDENCE_KINDS))}.")
                soft(ew, "evidence", ev.get("text"))
        actions = item.get("actions") or []
        if len(actions) > MAX_ACTIONS:
            warnings.append(f"{where}: {len(actions)} actions; keep one primary and at most two supporting.")
        for j, action in enumerate(actions):
            aw = f"{where} action {j + 1}"
            if not isinstance(action, dict) or not is_text(action.get("title")) or not is_text(action.get("who")):
                problems.append(f"{aw}: title and who are required.")
                continue
            if not is_date(action.get("by")):
                problems.append(f"{aw}: by must be a date (YYYY-MM-DD).")
            elif as_of and action["by"] < as_of:
                warnings.append(f"{aw}: due {action['by']}, before meta.asOf; move it to this week.")
            soft(aw, "why", action.get("why"))
            for step in action.get("steps") or []:
                soft(aw, "step", step)

    for path, text in strings(data):
        if EMAIL.search(text):
            problems.append(f"{path}: contains an email address. Names and titles only.")
        elif PHONE.search(text):
            problems.append(f"{path}: contains what looks like a phone number. Names and titles only.")
    return problems, warnings


def plugin_version():
    try:
        with open(PLUGIN_JSON, encoding="utf-8") as fh:
            return json.load(fh).get("version")
    except (OSError, ValueError):
        return None


def computed(data):
    meta = data["meta"]
    items = data["items"]
    order = sorted(items, key=lambda it: (
        LEVEL_RANK[it["level"]],
        -(it.get("value") or 0) if isinstance(it.get("value"), (int, float)) else 1,
        it.get("date") or "9999-12-31",
        it["name"].lower(),
    ))
    shown = meta.get("shownLevels", LEVELS)
    rank = 0
    for it in order:
        if it["level"] in shown:
            rank += 1
            it["rank"] = rank
        else:
            it.pop("rank", None)
    levels = {level: {"count": 0, "value": 0} for level in LEVELS}
    for it in items:
        levels[it["level"]]["count"] += 1
        if isinstance(it.get("value"), (int, float)):
            levels[it["level"]]["value"] += it["value"]
    data["items"] = order
    data["computed"] = {
        "reviewed": len(items),
        "shown": rank,
        "levels": levels,
        "totalValue": sum(level["value"] for level in levels.values()),
        "version": plugin_version(),
        "builtAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    return data


def load(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError) as error:
        print(f"Can't read {path}: {error}", file=sys.stderr)
        sys.exit(3)


def main(argv):
    if len(argv) == 2 and argv[0] == "--check":
        data, out = load(argv[1]), None
    elif len(argv) == 2:
        data, out = load(argv[0]), argv[1]
    else:
        print(__doc__, file=sys.stderr)
        return 3

    problems, warnings = validate(data)
    for warning in warnings:
        print(f"warning: {warning}")
    if problems:
        print(f"{len(problems)} problem(s) in the data. Fix them and run again:", file=sys.stderr)
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 1
    if out is None:
        print(f"Valid: {len(data['items'])} items.")
        return 0

    try:
        with open(TEMPLATE, "rb") as fh:
            template = fh.read()
    except OSError:
        print(f"The template is missing: {TEMPLATE}. Restore it from the plugin.", file=sys.stderr)
        return 2
    if hashlib.sha256(template).hexdigest() != TEMPLATE_SHA256:
        print("The template has changed since the plugin shipped. Restore assets/brief-template.html from the plugin; never edit it during a run.", file=sys.stderr)
        return 2
    html = template.decode("utf-8")
    if html.count(PLACEHOLDER) != 1:
        print("The template's data placeholder is missing.", file=sys.stderr)
        return 2

    payload = json.dumps(computed(data), ensure_ascii=False).replace("</", "<\\/")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html.replace(PLACEHOLDER, payload))
    c = data["computed"]
    counts = ", ".join(f"{level} {c['levels'][level]['count']}" for level in LEVELS)
    print(f"Built {out}: {c['reviewed']} reviewed, {c['shown']} shown ({counts}).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
