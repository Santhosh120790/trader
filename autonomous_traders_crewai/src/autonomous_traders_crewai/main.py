#!/usr/bin/env python
import sys
import warnings
from datetime import datetime

from autonomous_traders_crewai.crew import TradingCrew, NOTE
from autonomous_traders_crewai.domain.accounts import Account
from autonomous_traders_crewai.tools.mcp_tools import mcp_tools

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

TRADER_NAMES = ["Warren", "George", "Ray", "Cathie", "Santhosh"]


def _inputs_for(name: str) -> dict:
    account = Account.get(name)
    return {
        "name": name,
        "note": NOTE,
        "strategy": account.get_strategy(),
        "account": account.report(),
        "current_datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def run_trader(name: str, do_trade: bool = True):
    """Run one researcher+trader crew round for a single account."""
    with mcp_tools(name) as (trader_tools, researcher_tools):
        crew = TradingCrew(trader_tools, researcher_tools, do_trade=do_trade)
        return crew.crew().kickoff(inputs=_inputs_for(name))


def run():
    """
    Run one trading round for every trader.
    """
    try:
        for name in TRADER_NAMES:
            run_trader(name)
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}")


def train():
    """
    Train the trader crew for a given number of iterations.
    """
    name = TRADER_NAMES[0]
    try:
        with mcp_tools(name) as (trader_tools, researcher_tools):
            crew = TradingCrew(trader_tools, researcher_tools, do_trade=True)
            crew.crew().train(n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=_inputs_for(name))
    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")


def replay():
    """
    Replay the crew execution from a specific task.
    """
    name = TRADER_NAMES[0]
    try:
        with mcp_tools(name) as (trader_tools, researcher_tools):
            crew = TradingCrew(trader_tools, researcher_tools, do_trade=True)
            crew.crew().replay(task_id=sys.argv[1])
    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")


def test():
    """
    Test the crew execution and returns the results.
    """
    name = TRADER_NAMES[0]
    try:
        with mcp_tools(name) as (trader_tools, researcher_tools):
            crew = TradingCrew(trader_tools, researcher_tools, do_trade=True)
            crew.crew().test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=_inputs_for(name))
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")


def run_with_trigger():
    """
    Run one trading round for the first trader, triggered externally with a JSON payload.
    """
    import json

    if len(sys.argv) < 2:
        raise Exception("No trigger payload provided. Please provide JSON payload as argument.")

    try:
        json.loads(sys.argv[1])
    except json.JSONDecodeError:
        raise Exception("Invalid JSON payload provided as argument")

    try:
        return run_trader(TRADER_NAMES[0])
    except Exception as e:
        raise Exception(f"An error occurred while running the crew with trigger: {e}")
