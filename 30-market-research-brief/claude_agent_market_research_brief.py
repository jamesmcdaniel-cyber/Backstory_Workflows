"""Market Research Brief — Claude Agent SDK entrypoint."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from workflow_platform_starters import run_claude_agent_workflow
from workflow_specs import WORKFLOW_SPECS


if __name__ == "__main__":
    asyncio.run(run_claude_agent_workflow(WORKFLOW_SPECS["30-market-research-brief"]))
