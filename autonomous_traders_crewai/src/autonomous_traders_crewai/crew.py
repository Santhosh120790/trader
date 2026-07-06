from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.tools import BaseTool

from .domain.market import massive_api_key, NSE_TICKERS

UNIVERSE = ", ".join(f"{symbol} ({name})" for symbol, (_, name) in NSE_TICKERS.items())

NOTE = (
    "You have access to live market data tools; use them to look up share prices, trends, technical indicators and fundamentals. "
    if massive_api_key
    else "You have access to a market data tool; use your lookup_share_price tool to get the current share price for any symbol. "
) + f"Your investable universe is limited to these NSE-listed Indian stocks, traded in INR: {UNIVERSE}. When looking up prices or trading, use the ticker symbol (e.g. IEX, NTPCGREEN, OLAELEC, ONGC, SUZLON), not the company name."


@CrewBase
class TradingCrew:
    """Researcher + trader crew for one trading account, built fresh for a single trade or rebalance round."""

    agents: list[BaseAgent]
    tasks: list[Task]

    def __init__(
        self,
        trader_tools: list[BaseTool],
        researcher_tools: list[BaseTool],
        do_trade: bool = True,
        model_name: str = "gpt-4.1-mini",
    ):
        self.trader_tools = trader_tools
        self.researcher_tools = researcher_tools
        self.do_trade = do_trade
        self.model_name = model_name

    @agent
    def researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["researcher"],  # type: ignore[index]
            tools=self.researcher_tools,
            llm=self.model_name,
            allow_delegation=False,
            verbose=True,
        )

    @agent
    def trader(self) -> Agent:
        return Agent(
            config=self.agents_config["trader"],  # type: ignore[index]
            tools=self.trader_tools,
            llm=self.model_name,
            allow_delegation=True,
            verbose=True,
        )

    @task
    def current_task(self) -> Task:
        """The trade or rebalance task for this round, chosen by `do_trade`."""
        config_key = "trade_task" if self.do_trade else "rebalance_task"
        return Task(
            config=self.tasks_config[config_key],  # type: ignore[index]
            agent=self.trader(),
        )

    @crew
    def crew(self) -> Crew:
        """Creates the researcher + trader crew for this round."""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
