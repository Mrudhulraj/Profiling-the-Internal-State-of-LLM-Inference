# 🎨 Frontend Integration - Visual Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│            http://localhost:3000/pruning                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Next.js Frontend App
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼────────┐    ┌──────▼───────┐    ┌───────▼────┐
    │ Model      │    │ Dataset      │    │ Pruning    │
    │ Selector   │    │ Selector     │    │ Config     │
    └───┬────────┘    └──────┬───────┘    └───────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────▼─────────────────────┐
        │                                          │
        │      API Client (pruningApi.ts)          │
        │                                          │
        └────────────────────┬─────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼───┐    ┌─────▼───┐    ┌────▼─────┐
        │  Models │    │ Datasets │    │ Pruning  │
        │  API    │    │   API    │    │   API    │
        └────┬────┘    └────┬────┘    └─────┬────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
        FastAPI Backend: http://127.0.0.1:8000
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼──────┐    ┌──────▼────┐    ┌────────▼──┐
    │  Models  │    │  Datasets │    │  Pruning  │
    │  Loading │    │  Upload   │    │  Engine   │
    └──────────┘    └───────────┘    └───────────┘
        │                │                  │
        └────────────────┼──────────────────┘
                         │
                  ┌──────▼──────┐
                  │   Results   │
                  │  Comparison │
                  └─────────────┘
```

---

## User Interface Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     LLM Model Pruning System                     │
│                                                                  │
│  [1] [2] [3] [4]  ← Step Indicator                               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: Select Model                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ☐ meta-llama/Llama-2-7b-hf                             │   │
│  │ ☐ mistralai/Mistral-7B-v0.3                            │   │
│  │ ☐ microsoft/Phi-3-medium-128k-instruct                 │   │
│  │ ☐ Qwen/Qwen2.5-7B                                      │   │
│  │                                     Next →              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 2: Choose Dataset                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Built-in: ☐ wikitext2                                   │   │
│  │                                                          │   │
│  │ Upload: [📁 Choose File (JSON/CSV)]                     │   │
│  │                                                          │   │
│  │ Recent:  ☐ my_data.json (512 KB)                        │   │
│  │                   ← Back       Next →                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 3: Configure Pruning                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Method:  [✓ 2SSP] [ShortGPT]                            │   │
│  │ Sparsity: ████████░░ 50%                                │   │
│  │ Samples: [32]                                           │   │
│  │ Seed: [0]                                               │   │
│  │                   ← Back    🚀 Start Pruning             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 4: Results                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✓ Pruning Completed! 🎉                                 │   │
│  │                                                          │   │
│  │ Parameter Reduction: ↓ 50.23%                           │   │
│  │ Model Size: ↓ 45.10%                                    │   │
│  │ Speedup: 1.28x                                          │   │
│  │                                                          │   │
│  │ [📥 Download] [📊 Export] [🔄 Another Model]            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PruningPage.tsx                           │
│            (Main orchestration component)                    │
└─────────────────────────────────────────────────────────────┘
              │                  │                  │
              │                  │                  │
      ┌───────▼────────┐ ┌──────▼────────┐ ┌──────▼──────────┐
      │ Step 1         │ │ Step 2        │ │ Step 3          │
      │ ModelSelector  │ │ DatasetSelect │ │ ConfigPanel     │
      └───────┬────────┘ └──────┬────────┘ └──────┬──────────┘
              │                  │                │
              │ onModelSelect    │ onDataset     │ onConfigChange
              │                  │ Select        │
              └──────────┬───────┴────────┬──────┘
                         │               │
                         ▼               ▼
        ┌────────────────────────────────────────┐
        │     Component State (React Hooks)      │
        ├────────────────────────────────────────┤
        │ - selectedModel: string                │
        │ - selectedDataset: string              │
        │ - pruningConfig: PruningConfig         │
        │ - jobStatus: JobStatus                 │
        │ - currentStep: Step                    │
        └────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    Start Pruning   Polling Job    Display Results
    (POST API)      (GET API)       (ModelComparison)
```

---

## Data Flow During Pruning

```
User clicks "Start Pruning"
              │
              ▼
    ┌─────────────────────┐
    │  POST /pruning/start│
    │  with config:       │
    │  - model_id         │
    │  - pruning_method   │
    │  - sparsity_rate    │
    │  - dataset_id       │
    └────────┬────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Backend Processing │
    │ - Load model       │
    │ - Compute baseline │
    │ - Load dataset     │
    │ - Apply pruning    │
    │ - Evaluate pruned  │
    │ - Save results     │
    └────────┬───────────┘
             │
             ▼ (Every 2 seconds)
    ┌────────────────────┐      ┌──────────────────┐
    │ GET /pruning/job/* │─────→│ Job Status:      │
    │                    │      │ - pending        │
    │                    │      │ - running        │
    │                    │      │ - completed      │
    │                    │      │ - failed         │
    └────────┬───────────┘      └──────────────────┘
             │
        Status Complete?
             │
        Yes  ▼
    ┌────────────────────┐
    │ Display Results:   │
    │ - Baseline stats   │
    │ - Pruned stats     │
    │ - Comparison       │
    │ - Download button  │
    └────────────────────┘
```

---

## API Call Sequence

```
Timeline        Component              API Call              Response
────────────────────────────────────────────────────────────────────
t=0             ModelSelector         GET /models/          Models list
                                      available
                
                DatasetSelector       GET /datasets/        Datasets list
                                      available
                
                User Action           POST /datasets/       Dataset ID
                                      upload
                
t=start         PruningPage           POST /pruning/        Job ID
                                      start
                
t=0.1s          Polling starts        GET /pruning/job/{id} Status: pending
t=2s            Polling check         GET /pruning/job/{id} Status: running
t=4s            Polling check         GET /pruning/job/{id} Status: running
...
t=300s          Polling check         GET /pruning/job/{id} Status: completed
                                      + baseline_stats
                                      + pruned_stats
                                      + comparison
                
t=301s          ModelComparison       Display results       ✓ Complete
                
                User Action           GET /results/         Model file
                                      download/{job_id}
                
                User Action           GET /results/         JSON results
                                      export/{job_id}
```

---

## File Organization

```
Frontend Structure:
─────────────────────

llm-ui/
│
├── 📄 pages/
│   └── pruning.tsx ........................ Main 4-step page
│
├── 📄 components/
│   ├── ModelSelector.tsx .................. Models display
│   ├── DatasetSelector.tsx ............... Datasets & upload
│   ├── PruningConfigPanel.tsx ............ Configuration
│   └── ModelComparison.tsx ............... Results display
│
├── 📄 utils/
│   └── pruningApi.ts ..................... API client
│
├── 📄 styles/
│   ├── Pruning.module.css ................ Main styles
│   ├── ModelSelector.module.css .......... Model styles
│   ├── DatasetSelector.module.css ........ Dataset styles
│   ├── PruningConfigPanel.module.css ..... Config styles
│   └── ModelComparison.module.css ........ Results styles
│
├── 📄 QUICK_START.md ..................... Setup guide
└── 📄 INTEGRATION_GUIDE.md ............... Full docs
```

---

## Component State Management

```
PruningPage (Parent)
│
├─ selectedModel: string
│  └─ Used by: ModelSelector (input)
│            PruningPage (display)
│
├─ selectedDataset: string
│  └─ Used by: DatasetSelector (input)
│            PruningPage (display)
│
├─ pruningConfig: PruningConfig
│  ├─ pruningMethod: '2ssp' | 'shortgpt'
│  ├─ sparsityRate: 0.0-1.0
│  ├─ numCalibrationSamples: 1-256
│  └─ seed: number
│  └─ Used by: PruningConfigPanel (input)
│            PruningPage (display)
│
├─ jobStatus: JobStatus
│  ├─ jobId: string
│  ├─ status: 'pending' | 'running' | 'completed' | 'failed'
│  ├─ data: PruningJobResponse
│  └─ error: string
│  └─ Used by: PruningPage (polling)
│            ModelComparison (display)
│
└─ currentStep: Step
   ├─ 'model-selection'
   ├─ 'dataset-selection'
   ├─ 'configuration'
   └─ 'running' | 'results'
   └─ Used by: PruningPage (UI visibility)
```

---

## API Endpoints Visualization

```
Frontend Requests              Backend Endpoints

Models
├─ GET /models/available      ←─ List 4 predefined models
└─ POST /models/load          ←─ Load specific model

Datasets
├─ GET /datasets/available    ←─ List built-in (wikitext2)
├─ POST /datasets/upload      ←─ Upload file (JSON/CSV)
└─ GET /datasets/list         ←─ List user uploads

Pruning
├─ POST /pruning/start        ←─ Submit job
├─ GET /pruning/job/{id}      ←─ Poll status (every 2s)
└─ GET /pruning/jobs          ←─ List all jobs

Results
├─ GET /results/download/{id} ←─ Download model
└─ GET /results/export/{id}   ←─ Export JSON

Health
└─ GET /health                ←─ Check backend status
```

---

## Response Format Examples

```json
Models API:
{
  "available_models": [
    "meta-llama/Llama-2-7b-hf",
    "mistralai/Mistral-7B-v0.3",
    "microsoft/Phi-3-medium-128k-instruct",
    "Qwen/Qwen2.5-7B"
  ]
}

Pruning Job (Running):
{
  "job": {
    "job_id": "abc-123-xyz",
    "status": "running",
    "model_id": "meta-llama/Llama-2-7b-hf",
    "baseline_stats": null,
    "pruned_stats": null
  }
}

Pruning Job (Completed):
{
  "job": {
    "job_id": "abc-123-xyz",
    "status": "completed",
    "baseline_stats": {
      "total_parameters": 6738415616,
      "metrics": { "perplexity": 10.25 }
    },
    "pruned_stats": {
      "total_parameters": 3369207808,
      "metrics": { "perplexity": 10.51 }
    },
    "comparison": {
      "parameter_reduction_percent": 50.0,
      "perplexity_increase_percent": 2.53,
      "speedup": 1.28
    }
  }
}
```

---

## Styling Hierarchy

```
Global Styles
│
├── Material-UI Components
│   ├── CircularProgress (loading)
│   ├── Icons (navigation, status)
│   └── TextField (inputs)
│
└── CSS Modules (Scoped)
    ├── Pruning.module.css (global layout)
    ├── ModelSelector.module.css (grid, cards)
    ├── DatasetSelector.module.css (upload, list)
    ├── PruningConfigPanel.module.css (controls, sliders)
    └── ModelComparison.module.css (table, metrics)

Color Scheme:
├── Primary: #667eea (blue)
├── Secondary: #764ba2 (purple)
├── Success: #4caf50 (green)
├── Error: #f44336 (red)
├── Warning: #ff9800 (orange)
└── Info: #2196f3 (light blue)
```

---

## Deployment Architecture

```
Development:
┌─────────────────────────┐  ┌──────────────────────┐
│  Frontend (localhost)   │  │  Backend (localhost) │
│  port: 3000             │  │  port: 8000          │
│  Next.js dev server     │  │  Uvicorn server      │
└─────────────────────────┘  └──────────────────────┘

Production:
┌─────────────────────────────────────────────────────┐
│         CDN (Vercel/Netlify/etc)                    │
│  - Static frontend files                            │
│  - Optimized builds                                 │
│  - Global distribution                              │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────▼──────────┐
         │ Backend Server   │
         │ (Cloud provider) │
         │ - API endpoints  │
         │ - GPU support    │
         │ - Database       │
         └──────────────────┘
```

---

**All diagrams are production-ready visualizations of your system!** 🎨
