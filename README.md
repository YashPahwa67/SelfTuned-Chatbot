# Chatbot-selftuned

A self-hosted, fine-tuned LLM chatbot — from training to a production-style product site.

This repo has two parts:

1. **`Chatbot.ipynb`** — a notebook that LoRA fine-tunes an instruct model
   (Qwen / Llama) on a small domain dataset, then serves, chats with, and
   evaluates it. Runs on Apple Silicon (MPS), CUDA, or CPU.
2. **`nimbus-assistant/`** — a cinematic 3D landing page (React + Three.js) with
   a fully working chat UI, wired to a FastAPI backend that loads the LoRA
   adapter produced by the notebook.

```
Chatbot-selftuned/
├── Chatbot.ipynb          # train + evaluate the LoRA adapter
├── qwen-lora-adapter/     # (created by the notebook) saved adapter
├── nimbus-assistant/
│   ├── backend/           # FastAPI: loads base + adapter, streams /chat
│   ├── frontend/          # React + R3F 3D site with the chat UI
│   └── README.md          # full setup for the web app
└── README.md              # you are here
```

---

## Part 1 — Train the model (`Chatbot.ipynb`)

The notebook fine-tunes an **instruct** model with a small **LoRA** adapter so
it answers in a consistent product voice (the demo domain is "NimbusCloud", a
fictional cloud SaaS). It's deliberately memory-lean for 16 GB Apple Silicon:
fp16 weights, gradient checkpointing, rank-4 LoRA on `q_proj`/`v_proj`.

What it does, cell by cell:

- Builds a small `dataset.json` of prompt/response pairs (80/20 train/test).
- `finetune()` — tokenizes with **prompt masking** (loss only on the response),
  trains, and saves the adapter to e.g. `qwen-lora-adapter/`.
- Fine-tunes **Qwen2.5-1.5B-Instruct** (open) and optionally **Llama-3.2-3B**
  (gated — needs a Hugging Face token + access grant).
- `load_chatbot()` / `chat()` / `chat_stream()` — reattach the adapter and chat,
  with multi-turn history and live token streaming.
- Evaluation — base-vs-fine-tuned **ROUGE / BLEU / perplexity** plus loss and
  response-length plots.

> Note: with only ~10 demo examples the fine-tune barely shifts the metrics —
> that's expected. Teaching a style/format needs a few hundred consistent
> examples. The pipeline is the point; scale the dataset for real results.

### Run the notebook

```bash
cd Chatbot-selftuned
pip install -U transformers datasets peft accelerate evaluate rouge_score sacrebleu \
               matplotlib seaborn pandas
jupyter lab Chatbot.ipynb   # or open in VS Code / Jupyter
```

Run the cells top to bottom. The Qwen path needs no login; for Llama, run the
`huggingface_hub.login()` cell first. When training finishes you'll have a
`qwen-lora-adapter/` directory — that's what the web app serves.

---

## Part 2 — Run the web app (`nimbus-assistant/`)

A scroll-driven 3D site (react-three-fiber + drei, framer-motion, Tailwind)
with a glassmorphic, streaming chat behind a lightweight login, served by a
FastAPI backend that loads the base model + your LoRA adapter.

Quick start (full details in [`nimbus-assistant/README.md`](nimbus-assistant/README.md)):

```bash
# Backend (loads the model — first run downloads base weights)
cd nimbus-assistant/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # ADAPTER_PATH defaults to ../../qwen-lora-adapter
uvicorn main:app --reload --port 8000     # check: curl localhost:8000/health

# Frontend (new terminal)
cd nimbus-assistant/frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
```

If the adapter directory isn't present yet, the backend falls back to the plain
base model, so the site is demoable before you've trained anything.

---

## How the pieces connect

```
Chatbot.ipynb  ──trains──▶  qwen-lora-adapter/  ──loaded by──▶  FastAPI backend
                                                                      │ SSE token stream
                                                                      ▼
                                                        React 3D site (chat UI)
```

The notebook produces the adapter; the FastAPI backend (`main.py`) loads
`base model + adapter` via `PeftModel` and streams tokens; the React frontend
sends the full conversation history and renders tokens live.

## Requirements

- **Python** 3.10+ (training + backend)
- **Node** 18+ (frontend)
- Apple Silicon (MPS), an NVIDIA GPU (CUDA), or CPU — device is auto-detected
- No API keys: everything runs locally / self-hosted
