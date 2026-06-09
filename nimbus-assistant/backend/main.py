"""
NimbusCloud Assistant — FastAPI backend.

Serves a self-hosted, fine-tuned chat model:
    base model (e.g. Qwen/Qwen2.5-1.5B-Instruct)  +  LoRA adapter (PeftModel)

Design goals:
- Load the model ONCE on startup (lifespan), keep it warm in memory.
- Stream tokens to the browser as they are generated (SSE).
- Degrade gracefully: if the adapter dir is missing we still serve the base
  model so the website is demoable out of the box; if the model fails to load
  entirely, /health reports it and /chat returns 503 instead of crashing.
- No external API keys — this is a local model.
"""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from threading import Thread
from typing import AsyncIterator, Optional

import torch
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

# PeftModel is only needed when an adapter is present; import is cheap.
from peft import PeftModel

load_dotenv()

# --------------------------------------------------------------------------- #
# Configuration (all overridable via .env)                                    #
# --------------------------------------------------------------------------- #
BASE_MODEL_ID = os.getenv("BASE_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
ADAPTER_PATH = os.getenv("ADAPTER_PATH", "../qwen-lora-adapter")
DEFAULT_SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT", "You are a helpful assistant for NimbusCloud."
)
MAX_NEW_TOKENS_CAP = int(os.getenv("MAX_NEW_TOKENS_CAP", "512"))
# Comma-separated list of allowed browser origins.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]


def detect_device() -> str:
    """Apple Silicon -> mps, Nvidia -> cuda, else cpu (mirrors the training notebook)."""
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


# --------------------------------------------------------------------------- #
# In-memory model bundle. Populated by the lifespan handler on startup.        #
# --------------------------------------------------------------------------- #
class ModelBundle:
    tokenizer: Optional[AutoTokenizer] = None
    model: Optional[AutoModelForCausalLM] = None
    device: str = "cpu"
    adapter_loaded: bool = False
    error: Optional[str] = None  # populated if loading failed

    @property
    def ready(self) -> bool:
        return self.model is not None and self.tokenizer is not None


BUNDLE = ModelBundle()


def load_model() -> None:
    """Load base model (+ optional LoRA adapter) into BUNDLE. Never raises —
    failures are recorded on BUNDLE.error so the API can report them cleanly."""
    try:
        device = detect_device()
        BUNDLE.device = device
        print(f"[startup] device = {device}")

        adapter_present = os.path.isdir(ADAPTER_PATH)
        # The fine-tune saved a tokenizer alongside the adapter; prefer it so
        # special/pad tokens match training. Fall back to the base tokenizer.
        tok_source = ADAPTER_PATH if adapter_present else BASE_MODEL_ID
        print(f"[startup] loading tokenizer from {tok_source}")
        tokenizer = AutoTokenizer.from_pretrained(tok_source)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        print(f"[startup] loading base model {BASE_MODEL_ID}")
        model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID, dtype=torch.float16
        ).to(device)

        if adapter_present:
            print(f"[startup] attaching LoRA adapter from {ADAPTER_PATH}")
            model = PeftModel.from_pretrained(model, ADAPTER_PATH).to(device)
            BUNDLE.adapter_loaded = True
        else:
            print(
                f"[startup] WARNING: adapter dir '{ADAPTER_PATH}' not found — "
                f"serving the base model only."
            )

        model.config.use_cache = True  # fast generation
        model.eval()

        BUNDLE.tokenizer = tokenizer
        BUNDLE.model = model
        BUNDLE.error = None
        print("[startup] model ready")
    except Exception as exc:  # noqa: BLE001 — we want any failure recorded, not raised
        BUNDLE.error = f"{type(exc).__name__}: {exc}"
        print(f"[startup] MODEL LOAD FAILED: {BUNDLE.error}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_model()
    yield
    # Free MPS/CUDA memory on shutdown.
    BUNDLE.model = None
    BUNDLE.tokenizer = None
    if BUNDLE.device == "mps" and torch.backends.mps.is_available():
        torch.mps.empty_cache()
    elif BUNDLE.device == "cuda" and torch.cuda.is_available():
        torch.cuda.empty_cache()


app = FastAPI(title="NimbusCloud Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Request / response schemas                                                   #
# --------------------------------------------------------------------------- #
class Message(BaseModel):
    role: str = Field(..., description="'user' | 'assistant' | 'system'")
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    system_prompt: Optional[str] = DEFAULT_SYSTEM_PROMPT
    max_new_tokens: int = 400
    temperature: float = 0.7


# --------------------------------------------------------------------------- #
# Streaming generation                                                         #
# --------------------------------------------------------------------------- #
def build_inputs(req: ChatRequest):
    """Render system + history into model-ready tensors via the chat template."""
    tok = BUNDLE.tokenizer
    messages: list[dict] = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})
    messages.extend({"role": m.role, "content": m.content} for m in req.messages)

    return tok.apply_chat_template(
        messages,
        add_generation_prompt=True,  # cue the model to start the assistant turn
        return_tensors="pt",
        return_dict=True,
    ).to(BUNDLE.model.device)


def sse_event(payload: dict) -> str:
    """Format a dict as a single Server-Sent Event frame."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def token_stream(req: ChatRequest) -> AsyncIterator[str]:
    """Generate on a background thread and yield SSE frames as tokens arrive.

    transformers' TextIteratorStreamer is a blocking iterator fed by
    model.generate(). We run generate() in a thread and drain the streamer
    here, so the event loop stays responsive and tokens flush immediately.
    """
    tok = BUNDLE.tokenizer
    model = BUNDLE.model

    inputs = build_inputs(req)
    streamer = TextIteratorStreamer(
        tok, skip_prompt=True, skip_special_tokens=True
    )

    # temperature == 0 -> deterministic greedy; otherwise sample.
    do_sample = req.temperature and req.temperature > 0
    gen_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=min(req.max_new_tokens, MAX_NEW_TOKENS_CAP),
        do_sample=bool(do_sample),
        temperature=req.temperature if do_sample else None,
        top_p=0.9 if do_sample else None,
        pad_token_id=tok.eos_token_id,
    )

    def _run_generate():
        # generate() shouldn't track gradients during inference.
        with torch.no_grad():
            model.generate(**gen_kwargs)

    thread = Thread(target=_run_generate, daemon=True)
    thread.start()

    try:
        for token in streamer:
            if token:
                yield sse_event({"token": token})
        yield sse_event({"done": True})
    except Exception as exc:  # surface mid-stream failures to the client
        yield sse_event({"error": f"{type(exc).__name__}: {exc}"})
    finally:
        thread.join(timeout=1.0)


# --------------------------------------------------------------------------- #
# Endpoints                                                                    #
# --------------------------------------------------------------------------- #
@app.get("/health")
def health():
    return {
        "status": "ok" if BUNDLE.ready else "unavailable",
        "device": BUNDLE.device,
        "base_model": BASE_MODEL_ID,
        "adapter_loaded": BUNDLE.adapter_loaded,
        "adapter_path": ADAPTER_PATH,
        "error": BUNDLE.error,
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    if not BUNDLE.ready:
        # Model never loaded — tell the client why.
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. {BUNDLE.error or 'See server logs.'}",
        )
    if not req.messages or not any(m.content.strip() for m in req.messages):
        raise HTTPException(status_code=400, detail="messages must be non-empty.")

    return StreamingResponse(
        token_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Disable proxy buffering so tokens flush immediately (e.g. nginx).
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=bool(os.getenv("RELOAD", "")),
    )
