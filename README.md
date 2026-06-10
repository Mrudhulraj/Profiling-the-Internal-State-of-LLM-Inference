# Purpose of the Project
The goal of this project is to improve the efficiency of large language models (LLMs) by reducing computational cost, memory usage, and inference latency while maintaining acceptable performance.

This is achieved through a three-stage model optimization pipeline consisting of:

**FLAP Pruning**: Performs structured pruning to reduce the number of active model parameters based on a configurable pruning ratio. Higher pruning ratios lead to smaller models with lower computational and memory requirements, and faster inference.
**SliceGPT Transformation**: Applies structural model compression to further reduce model width and improve runtime efficiency while preserving essential representational capacity.
**LoRA Fine-Tuning**: Performs parameter-efficient fine-tuning using Low-Rank Adaptation (LoRA) to recover performance after compression and adapt the model to the provided dataset.

The pipeline takes the following key inputs:

1. A dataset used as the knowledge base for pruning-aware and fine-tuning stages
2. A pruning ratio that determines the level of compression applied
3. The number of fine-tuning steps controlling adaptation strength on the target dataset

The final output is a compressed and optimized LLM with reduced computational requirements and competitive task performance.

# Getting Started with LLM Inference Benchmarking Tool

This project has two runtime paths:

- **Pruning UI path:** React/Next.js frontend + FastAPI pruning backend.
- **vLLM simulator path:** Kind/Kubernetes simulator used for local inference-serving experiments.

For the demo UI, use the **Pruning UI path**.

## Frontend Setup

Install frontend dependencies:

```bash
cd llm-ui
npm install
```

Run the frontend development server:

```bash
npm run dev
```

Open the UI at:

```text
http://localhost:3000/pruning
```

The frontend expects the FastAPI backend at:

```text
http://127.0.0.1:8000
```

## Running the FastAPI Backend on the UCI Server

Use this setup when the backend runs on `plrg-1.ics.uci.edu` and the frontend runs on your local machine.

### Terminal 1: Start the Backend on the Server

SSH into the server:

```bash
ssh mcsgroup@plrg-1.ics.uci.edu
```

Go to the backend directory:

```bash
cd ~/poc_compressor/backend
```

If this repository is cloned with the local layout instead, the backend directory may be:

```bash
cd ~/poc_compressor/api
```

Install backend dependencies the first time:

```bash
python -m pip install -r requirements_backend.txt
```

Start the FastAPI backend:

```bash
uvicorn backend:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal open. The backend is intentionally bound to `127.0.0.1` on the server, so it is not publicly exposed.

### Terminal 2: Open the SSH Tunnel from Your Local Machine

Run this from your **local terminal**, not from inside the SSH session:

```bash
ssh -N -L 8000:127.0.0.1:8000 mcsgroup@plrg-1.ics.uci.edu
```

This command forwards your local `127.0.0.1:8000` to the server's `127.0.0.1:8000`.

Notes:

- The terminal will look like it is hanging. That is normal; the tunnel is active.
- Keep this terminal open while using the UI.
- Use `Ctrl+C` to close the tunnel.

### Terminal 3: Run the Frontend Locally

```bash
cd llm-ui
npm run dev
```

Then open:

```text
http://localhost:3000/pruning
```

### Check the Backend Connection

With the backend and SSH tunnel running, test from your local machine:

```bash
curl http://127.0.0.1:8000/health
```

You should receive a JSON health response from the FastAPI backend.

### If Port 8000 Is Already Busy Locally

Use a different local port for the tunnel:

```bash
ssh -N -L 8001:127.0.0.1:8000 mcsgroup@plrg-1.ics.uci.edu
```

Then update the frontend backend URL in `llm-ui/config.js` and `llm-ui/utils/pruningApi.ts` from `127.0.0.1:8000` to `127.0.0.1:8001`.

## Optional: Testing the vLLM Simulator on Kind

This is separate from the FastAPI pruning backend used by the UI.

To run the vLLM simulator in a Kind cluster:

```bash
make dev-env-kind
```

Check [Makefile](Makefile) for environment variables to tune the process. For example:

```bash
KIND_CLUSTER_NAME=mytest UDS_TOKENIZER_TAG=v0.6.0 SIM_TAG=dev make dev-env-kind
```

Verify the deployment:

```bash
kubectl get deployment vllm-sim
kubectl get service vllm-sim
```

Test the simulator API:

```bash
curl -X POST http://localhost:30080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```


# Known Limitations

1. Performance degradation under high compression: Aggressive pruning and slicing can lead to noticeable reductions in model accuracy, particularly on complex reasoning tasks.
2. Incomplete performance recovery: LoRA fine-tuning mitigates but does not fully restore the performance lost during compression stages.
3. Sensitivity to hyperparameters: The final model quality is highly dependent on pruning ratio, SliceGPT configuration, LoRA rank, learning rate, and training steps.
4. No direct energy measurement: Energy efficiency improvements are inferred from proxy metrics such as parameter count, FLOPs reduction, and inference latency rather than directly measured hardware energy consumption.
