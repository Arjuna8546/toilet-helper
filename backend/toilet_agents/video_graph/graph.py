from langgraph.graph import StateGraph, END
from toilet_agents.video_graph.state import VideoState
from toilet_agents.video_graph.nodes import (
    download_photos_node,
    generate_audio_node,
    build_video_node,
    upload_node,
)

def build_video_subgraph() -> StateGraph:
    builder = StateGraph(VideoState)

    builder.add_node("download_photos", download_photos_node)
    builder.add_node("generate_audio",  generate_audio_node)
    builder.add_node("build_video",     build_video_node)
    builder.add_node("upload",          upload_node)

    builder.set_entry_point("download_photos")
    builder.add_edge("download_photos", "generate_audio")
    builder.add_edge("generate_audio",  "build_video")
    builder.add_edge("build_video",     "upload")
    builder.add_edge("upload",          END)

    return builder.compile()

video_subgraph = build_video_subgraph()