# NimbusCloud Assistant

A scroll-driven, cinematic 3D landing page that is also a **fully working chat
UI** for a self-hosted, fine-tuned LLM (the `qwen-lora-adapter` from the
training notebook in this repo).

- **Frontend:** React + Vite + TypeScript, react-three-fiber + drei, framer-motion, Tailwind
- **Backend:** FastAPI + transformers + peft, streaming tokens over SSE
- **No API keys.** The model runs locally (Apple Silicon / CUDA / CPU).

```
nimbus-assistant/
├── backend/
│   ├── main.py            # FastAPI app: loads base+LoRA, streams /chat, /health
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # shell: header, low-power toggle, lazy <Scene>
│   │   ├── lib/api.ts              # SSE fetch-stream client (streamChat generator)
│   │   ├── hooks/
│   │   │   ├── useChat.ts          # multi-turn history + token streaming state
│   │   │   └── usePerformanceTier.ts  # mobile/low-power degradation knob
│   │   ├── three/
│   │   │   ├── Scene.tsx           # the Canvas: ScrollControls + layers
│   │   │   ├── ScrollScenes.tsx    # scroll-driven camera + 3D accents
│   │   │   ├── HeroObject.tsx      # mouse-reactive distorted glowing core
│   │   │   ├── ParticleField.tsx   # ambient parallax particles
│   │   │   ├── Lighting.tsx        # self-contained env lighting + soft shadows
│   │   │   └── Effects.tsx         # bloom + vignette post-processing
│   │   └── components/
│   │       ├── Overlay.tsx         # 4 scroll sections (HTML over the 3D)
│   │       ├── ChatPanel.tsx       # glassmorphic chat (the core feature)
│   │       └── Message.tsx         # animated chat bubble + typing indicator
│   ├── package.json / vite / tailwind / tsconfig …
│   └── .env.example
└── README.md
```

## How the frontend talks to the backend

```
ChatPanel ──useChat.send()──▶ lib/api.streamChat()
        POST /chat  { messages:[{role,content}...], system_prompt }
backend  main.py  → apply_chat_template → model.generate() on a thread
        ◀── SSE frames:  data:{"token":"..."}  …  data:{"done":true}
useChat appends each token to the last assistant bubble (live streaming)
```

The full conversation history is sent every turn, so the model has multi-turn
memory. `streamChat` is an async generator; `useChat` just `for await`s the
tokens and updates React state.

---

## 1. Backend setup

> Requires Python 3.10+. The first run downloads the base model from Hugging
> Face (~3 GB for Qwen2.5-1.5B). For a **gated** base model (e.g. Llama) run
> `huggingface-cli login` first.

```bash
cd nimbus-assistant/backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set ADAPTER_PATH to your trained adapter dir.
# Default ../qwen-lora-adapter points at the adapter the notebook saves.

uvicorn main:app --reload --port 8000
# or:  python main.py
```

Verify it's up:

```bash
curl http://localhost:8000/health
# {"status":"ok","device":"mps","adapter_loaded":true, ...}
```

**No adapter yet?** The server still starts and serves the plain base model
(`adapter_loaded:false`), so the site is demoable immediately. Train the
adapter (run `Chatbot.ipynb`) and restart to get the fine-tuned voice.

## 2. Frontend setup

> Requires Node 18+.

```bash
cd nimbus-assistant/frontend
npm install

cp .env.example .env          # VITE_API_URL=http://localhost:8000

npm run dev                   # http://localhost:5173
```

Open http://localhost:5173, scroll through the scenes, and chat in the **Live
Demo** section.

## 3. Production build (frontend)

```bash
npm run build && npm run preview
```

---

## Configuration reference

| Backend (.env)      | Default                        | Purpose                                  |
| ------------------- | ------------------------------ | ---------------------------------------- |
| `BASE_MODEL_ID`     | `Qwen/Qwen2.5-1.5B-Instruct`   | Base model the LoRA was trained on       |
| `ADAPTER_PATH`      | `../qwen-lora-adapter`         | LoRA adapter dir (falls back to base)    |
| `SYSTEM_PROMPT`     | `You are a helpful assistant…` | Default system prompt                    |
| `MAX_NEW_TOKENS_CAP`| `512`                          | Server-side generation cap               |
| `CORS_ORIGINS`      | `http://localhost:5173,…`      | Allowed frontend origins                 |
| `HOST` / `PORT`     | `0.0.0.0` / `8000`             | Bind address                             |

| Frontend (.env) | Default                 | Purpose          |
| --------------- | ----------------------- | ---------------- |
| `VITE_API_URL`  | `http://localhost:8000` | Backend base URL |

## Performance & degradation

- The WebGL bundle is **lazy-loaded**; HTML paints first.
- `usePerformanceTier` auto-detects mobile / small screens / `prefers-reduced-motion`
  and cuts particle count, disables bloom, and lowers DPR.
- A **⚡ Low power** toggle in the header forces the light tier manually.
- `AdaptiveDpr` + `AdaptiveEvents` drop resolution/raycast cost under load.

## Troubleshooting

- **Chat says "Backend not reachable"** → start uvicorn; check `VITE_API_URL`
  and `CORS_ORIGINS` match.
- **`/chat` returns 503** → model failed to load; see `/health` `error` field
  and the uvicorn logs (often an OOM — try a smaller base model).
- **Slow first response** → the model is warming up / downloading weights;
  subsequent turns are fast (`use_cache=True`).
```
