from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from toilet_agents.state import ToiletState
from toilet_agents.agents.content import content_agent
from toilet_agents.video_graph.graph import video_subgraph
from langgraph.types import RetryPolicy
from langchain_core.exceptions import OutputParserException


def build_graph():
    builder = StateGraph(ToiletState)

    builder.add_node(
        "content",
        content_agent,
        retry=RetryPolicy(
            max_attempts=3,
            retry_on=OutputParserException,   # only retry on this specific error
        )
    )
    builder.add_node("video_subgraph",  video_subgraph)

    builder.set_entry_point("content")
    builder.add_edge("content",        "video_subgraph")
    builder.add_edge("video_subgraph", END)

    memory = MemorySaver()
    return builder.compile(checkpointer=memory)


graph = build_graph()