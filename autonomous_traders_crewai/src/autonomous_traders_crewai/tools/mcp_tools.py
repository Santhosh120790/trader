"""MCP-backed tools for the trading crew.

Each MCP server is wrapped in a crewai_tools.MCPServerAdapter, which spawns a
subprocess and connects to it as soon as it's constructed. `mcp_tools` opens
every adapter (trader + researcher) through a single ExitStack for the
duration of one crew run and tears them all down afterwards -- mirroring the
per-run AsyncExitStack used in the original agents-SDK traders.py, rather than
holding the subprocesses open for the whole process lifetime.
"""

import os
from contextlib import ExitStack, contextmanager
from pathlib import Path

from dotenv import load_dotenv
from mcp import StdioServerParameters
from crewai_tools import MCPServerAdapter

load_dotenv(override=True)

# .../src/autonomous_traders_crewai/tools/mcp_tools.py -> project root (pyproject.toml)
PROJECT_DIR = str(Path(__file__).resolve().parents[3])
CONNECT_TIMEOUT = 120

massive_api_key = os.getenv("MASSIVE_API_KEY")
tavily_env = {"TAVILY_API_KEY": os.getenv("TAVILY_API_KEY")}

# With a key, hand the agent Massive's own market data server, run locally over stdio.
# Without one, use our market server, which serves simulated prices.
if massive_api_key:
    market_params = StdioServerParameters(
        command="uvx",
        args=["--from", "git+https://github.com/massive-com/mcp_massive@v0.10.0", "mcp_massive"],
        env={"MASSIVE_API_KEY": massive_api_key},
    )
else:
    market_params = StdioServerParameters(
        command="uv",
        args=["run", "-m", "autonomous_traders_crewai.tools.market_server"],
        cwd=PROJECT_DIR,
    )


def _memory_dir() -> str:
    """Absolute memory/ dir for the libsql server, creating it if needed."""
    memory_dir = Path(PROJECT_DIR) / "memory"
    memory_dir.mkdir(exist_ok=True)
    return memory_dir.as_posix()


def _trader_server_params() -> list[StdioServerParameters]:
    return [
        StdioServerParameters(
            command="uv",
            args=["run", "-m", "autonomous_traders_crewai.tools.accounts_server"],
            cwd=PROJECT_DIR,
        ),
        StdioServerParameters(
            command="uv",
            args=["run", "-m", "autonomous_traders_crewai.tools.push_server"],
            cwd=PROJECT_DIR,
        ),
        market_params,
    ]


def _researcher_server_params(name: str) -> list[tuple[StdioServerParameters, tuple[str, ...]]]:
    """Fetch, Tavily web search and per-trader Memory servers.

    Tavily's server offers several tools; we restrict it to web search so the
    researcher reaches for plain search rather than its heavier crawl or
    deep-research tools.
    """
    return [
        (StdioServerParameters(command="uvx", args=["mcp-server-fetch"]), ()),
        (
            StdioServerParameters(command="npx", args=["-y", "tavily-mcp@latest"], env=tavily_env),
            ("tavily_search",),
        ),
        (
            StdioServerParameters(
                command="npx",
                args=["-y", "mcp-memory-libsql"],
                env={"LIBSQL_URL": f"file:{_memory_dir()}/{name}.db"},
            ),
            (),
        ),
    ]


@contextmanager
def mcp_tools(name: str):
    """Start every MCP server for one trader's crew run and yield their tools.

    Usage:
        with mcp_tools(trader.name) as (trader_tools, researcher_tools):
            ...build agents with these tools, then crew().kickoff()...

    Yields:
        (trader_tools, researcher_tools): two lists of crewai_tools BaseTool.
    """
    with ExitStack() as stack:
        trader_tools = []
        for params in _trader_server_params():
            trader_tools.extend(stack.enter_context(MCPServerAdapter(params, connect_timeout=CONNECT_TIMEOUT)))

        researcher_tools = []
        for params, tool_names in _researcher_server_params(name):
            researcher_tools.extend(
                stack.enter_context(MCPServerAdapter(params, *tool_names, connect_timeout=CONNECT_TIMEOUT))
            )

        yield trader_tools, researcher_tools
