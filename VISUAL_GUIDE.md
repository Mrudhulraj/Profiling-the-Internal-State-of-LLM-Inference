# 🎨 Visual Guide & Diagrams

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│           LLM PRUNING SYSTEM - COMPLETE ARCHITECTURE             │
└─────────────────────────────────────────────────────────────────┘

                          INPUT LAYER
                              ↓
        ┌─────────────────────────────────────────┐
        │                                         │
        │  Models          Datasets         Config│
        │  • HF Hub        • Wikitext2      • Method
        │  • Custom        • C4             • Sparsity
        │  • Local cache   • FineWeb-Edu    • Eval options
        │                  • Custom upload
        │
        └─────────────────────────────────────────┘
                    ↓                ↓
         CLI Tool (main_restructured.py) | API Backend (backend.py)
         ┌────────────────────────────┐  │  ┌──────────────────────┐
         │ Step 1: Model Selection    │  │  │ REST Endpoints       │
         │ Step 2: Dataset Selection  │  │  │ • Load models        │
         │ Step 3: Pruning & Compare  │  │  │ • Upload datasets    │
         │                            │  │  │ • Start pruning jobs │
         │ Direct execution           │  │  │ • Monitor progress   │
         └────────────────────────────┘  │  │ • Download results   │
                                         │  └──────────────────────┘
                    PROCESSING LAYER     │
                         ↓              │ ↓
         ┌─────────────────────────────────────────────┐
         │          PRUNING ENGINE                     │
         │  ┌─────────────────────────────────────┐   │
         │  │ Method Selector                     │   │
         │  │ • 2SSP          • Window-Based      │   │
         │  │ • ShortGPT      • BlockPruner       │   │
         │  │ • EvoPress      • SliceGPT          │   │
         │  └─────────────────────────────────────┘   │
         └─────────────────────────────────────────────┘
                         ↓
         ┌─────────────────────────────────────────────┐
         │      EVALUATION ENGINE                      │
         │  ┌─────────────────────────────────────┐   │
         │  │ • Perplexity                        │   │
         │  │ • Inference Time                    │   │
         │  │ • Downstream Tasks                  │   │
         │  │ • Parameter Count                   │   │
         │  │ • Model Size                        │   │
         │  └─────────────────────────────────────┘   │
         └─────────────────────────────────────────────┘
                         ↓
                    OUTPUT LAYER
                         ↓
         ┌─────────────────────────────────────────────┐
         │                                             │
         │  saved_models/     results/                 │
         │  └─ *.pt files     └─ *.json files         │
         │                                             │
         │  Baseline Stats | Pruned Stats | Comparison │
         │                                             │
         └─────────────────────────────────────────────┘
```

---

## Decision Tree

```
START
  │
  ├─ Need quick test?
  │  ├─ YES → QUICK_REFERENCE.md → Run quick command → Done
  │  └─ NO  → Continue
  │
  ├─ Need to understand methods?
  │  ├─ YES → METHODS_OVERVIEW.md → Choose method → Continue
  │  └─ NO  → Continue
  │
  ├─ Using CLI tool?
  │  ├─ YES → MAIN_RESTRUCTURED_GUIDE.md
  │  │        ├─ Run: python main_restructured.py ...
  │  │        ├─ Check: saved_models/ + results/
  │  │        └─ Done
  │  └─ NO  → Continue
  │
  ├─ Using API backend?
  │  ├─ YES → BACKEND_API_DOCS.md
  │  │        ├─ Start: uvicorn api/backend:app
  │  │        ├─ Upload: POST /api/datasets/upload
  │  │        ├─ Prune: POST /api/pruning/start
  │  │        └─ Download: GET /api/results/download
  │  └─ NO  → Continue
  │
  └─ Need full understanding?
     └─ PROJECT_WORKFLOW_OVERVIEW.md → Architecture & integration
```

---

## Data Flow Diagram

```
BASELINE PHASE
===============
Model (HF Hub)
  ↓ [load & parse]
Model (loaded)
  ↓ [compute parameters]
ModelStats (baseline)
  ↓ [optional evaluation]
├─ Perplexity score
├─ Inference time
└─ Downstream scores
  ↓
RESULTS: baseline_stats.json


PRUNING PHASE
=============
Model (loaded)
  ↓ [apply method]
├─ 2SSP           → Returns modified model
├─ ShortGPT       → Returns masks
├─ Window-Based   → Returns masks
├─ BlockPruner    → Returns masks
├─ EvoPress       → Returns masks
└─ SliceGPT       → Returns modified model
  ↓ [optional: apply masks]
Pruned Model
  ↓ [compute parameters]
ModelStats (pruned)
  ↓ [optional evaluation]
├─ Perplexity score
├─ Inference time
└─ Downstream scores
  ↓ [save model]
saved_models/*.pt
  ↓ [optional: compare]
Comparison metrics:
├─ Parameter reduction %
├─ Size reduction %
├─ Perplexity increase %
└─ Speedup factor
  ↓
RESULTS: pruning_results.json + comparison.json
```

---

## API Architecture

```
CLIENT REQUEST
      ↓
┌─────────────────────────────────────┐
│      FastAPI Application            │
│  ┌─────────────────────────────┐   │
│  │ CORS Middleware             │   │
│  │ (Allow cross-origin)        │   │
│  └─────────────────────────────┘   │
│            ↓                        │
│  ┌─────────────────────────────┐   │
│  │ Route Handler               │   │
│  │ • Health check              │   │
│  │ • Models endpoint           │   │
│  │ • Datasets endpoint         │   │
│  │ • Stats endpoint            │   │
│  │ • Pruning endpoint          │   │
│  │ • Results endpoint          │   │
│  └─────────────────────────────┘   │
│            ↓                        │
│  ┌─────────────────────────────┐   │
│  │ Validation (Pydantic)       │   │
│  │ • Input validation          │   │
│  │ • Type checking             │   │
│  │ • Range validation          │   │
│  └─────────────────────────────┘   │
│            ↓                        │
│  ┌─────────────────────────────┐   │
│  │ Job Tracker                 │   │
│  │ • Create job                │   │
│  │ • Update status             │   │
│  │ • List jobs                 │   │
│  └─────────────────────────────┘   │
│            ↓                        │
│  ┌─────────────────────────────┐   │
│  │ Background Task (async)     │   │
│  │ • Load model                │   │
│  │ • Load dataset              │   │
│  │ • Apply pruning             │   │
│  │ • Evaluate results          │   │
│  │ • Save models               │   │
│  └─────────────────────────────┘   │
│            ↓                        │
│  ┌─────────────────────────────┐   │
│  │ File System I/O             │   │
│  │ • api_models/               │   │
│  │ • api_uploads/              │   │
│  │ • api_results/              │   │
│  │ • api_datasets/             │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
      ↓
RESPONSE (JSON)
```

---

## Method Comparison Matrix

```
┌──────────────────┬──────────┬──────────┬────────────┬─────────────┐
│ Method           │ Speed    │ Accuracy │ Parameters │ Output Type │
├──────────────────┼──────────┼──────────┼────────────┼─────────────┤
│ 2SSP      ⭐⭐  │ Slow     │ ⭐⭐⭐⭐⭐ │ Many       │ Model       │
│ ShortGPT  ⭐⭐  │ Fast     │ ⭐⭐⭐⭐  │ Fewer      │ Masks       │
│ Window    ⭐    │ Fast     │ ⭐⭐⭐   │ Fewer      │ Masks       │
│ BlockPrun ⭐    │ Very Fast│ ⭐⭐⭐   │ Fewer      │ Masks       │
│ EvoPress  ⭐⭐  │ Very Slow│ ⭐⭐⭐⭐  │ Many       │ Masks       │
│ SliceGPT  ⭐⭐  │ Medium   │ ⭐⭐⭐⭐  │ Many       │ Model       │
└──────────────────┴──────────┴──────────┴────────────┴─────────────┘

Legend:
⭐⭐ = Recommended for general use
⭐  = Good for testing/comparison
Speed: Slow (30-45min) > Medium (20-30min) > Fast (10-20min) > Very Fast (<10min)
Output: Model = Direct pruning | Masks = Selective masking
```

---

## File Organization Tree

```
📦 Root
│
├── 📄 QUICK_REFERENCE.md ..................... [Quick lookup]
├── 📄 DOCUMENTATION_INDEX.md ................ [You are here]
├── 📄 IMPLEMENTATION_SUMMARY.md ............ [Overview]
│
├── 📁 2SSP/ ................................. [CLI Tool]
│   ├── 📄 METHODS_OVERVIEW.md
│   ├── 📄 MAIN_RESTRUCTURED_GUIDE.md
│   ├── 📄 PROJECT_WORKFLOW_OVERVIEW.md
│   ├── 🐍 main_restructured.py ........... [New]
│   ├── 🐍 main.py ........................ [Original]
│   ├── 📦 requirements.txt
│   ├── 📁 src/
│   │   ├── 🐍 evaluation.py ............ [Perplexity, tasks]
│   │   ├── 🐍 pruning.py .............. [Pruning methods]
│   │   ├── 🐍 utilities.py ............ [Loading, stats]
│   │   ├── 🐍 datasets.py ............ [Dataset loading]
│   │   ├── 🐍 evopress.py ............ [EvoPress method]
│   │   ├── 🐍 slicegpt.py ............ [SliceGPT method]
│   │   └── 🐍 ablations.py ........... [Ablation studies]
│   ├── 📁 lm_harness/ .................. [LM Eval]
│   ├── 💾 saved_models/ ................ [Auto-created]
│   └── 💾 results/ ..................... [Auto-created]
│
├── 📁 api/ .................................. [API Backend]
│   ├── 📄 BACKEND_API_DOCS.md
│   ├── 📄 requirements_backend.txt
│   ├── 🐍 backend.py .................. [New]
│   ├── 🐍 main.py ..................... [Original]
│   ├── 🐍 router.py ................... [Original]
│   ├── 💾 api_models/ ................ [Auto-created]
│   ├── 💾 api_uploads/ ............... [Auto-created]
│   ├── 💾 api_results/ ............... [Auto-created]
│   └── 💾 api_datasets/ .............. [Auto-created]
│
└── 📄 README.md ............................ [Original]

Legend:
📄 = Documentation
🐍 = Python code
🐍 [New] = Newly created
📁 = Directory
💾 = Output directory (auto-created)
```

---

## Timeline & Prerequisites

```
PREREQUISITES (Setup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GPU with 20GB+ VRAM ................... 20 min setup
2. HuggingFace token ..................... 2 min setup
3. Dependencies installed ............... 10 min setup
   └─ pip install -r requirements.txt
   
SUBTOTAL: ~32 minutes


LEARNING PHASE (Understanding)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Read QUICK_REFERENCE.md .............. 5 min
2. Read METHODS_OVERVIEW.md ............. 15 min
3. Read MAIN_RESTRUCTURED_GUIDE.md ...... 20 min
4. (Optional) Read PROJECT_WORKFLOW ..... 30 min
   
SUBTOTAL: ~40-70 minutes (pick path)


EXECUTION PHASE (Running)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Quick test (15 min):
   python main_restructured.py --model phi-3 \
     --pruning_method 2ssp --sparsity_rate 0.5

2. Full evaluation (90 min):
   python main_restructured.py --model llama-2-7b \
     --pruning_method 2ssp --sparsity_rate 0.5 \
     --evaluate_all --save_models --compare_models

3. Parameter sweep (180 min):
   python main_restructured.py --model llama-2-7b \
     --pruning_method 2ssp --sparsity_rate -2 \
     --evaluate_all --save_models --compare_models
   
SUBTOTAL: 15-180 minutes (pick path)


DEPLOYMENT PHASE (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Read BACKEND_API_DOCS.md ............. 20 min
2. Install backend dependencies ......... 5 min
   └─ pip install -r api/requirements_backend.txt
3. Start FastAPI ........................ 1 min
   └─ uvicorn api/backend:app --reload
4. Test endpoints ....................... 10 min
   
SUBTOTAL: ~36 minutes (optional)


TOTAL TIME ESTIMATES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum (Quick test):         ~50-90 min
Typical (Full eval + learn):  ~150-200 min  
Complete (+ API):            ~200-250 min
```

---

## Success Checkpoints

```
✅ CHECKPOINT 1: Setup Complete (15 min)
   [✓] GPU available
   [✓] Dependencies installed
   [✓] HF token set
   → Ready for basic execution

✅ CHECKPOINT 2: CLI Tool Works (30 min)
   [✓] main_restructured.py runs
   [✓] Models load successfully
   [✓] Results saved to saved_models/
   [✓] Results JSON readable
   → Ready for experiments

✅ CHECKPOINT 3: Methods Tested (120 min)
   [✓] Tried 2 different methods
   [✓] Compared results
   [✓] Understood output format
   [✓] Adjusted parameters
   → Ready for production

✅ CHECKPOINT 4: API Working (180 min)
   [✓] Backend starts without errors
   [✓] Swagger UI accessible
   [✓] Can upload dataset
   [✓] Can start pruning job
   [✓] Can download results
   → Ready for deployment
```

---

## Command Flow Chart

```
START
  │
  ├─→ [CLI Path] ────────────────────────────────┐
  │   python main_restructured.py \               │
  │     --model llama-2-7b \                      │
  │     --pruning_method 2ssp \                   │
  │     --sparsity_rate 0.5 \                     │
  │     --evaluate_all \                          │
  │     --save_models \                           │
  │     --compare_models                          │
  │                                               │
  │   Output:                                     │
  │   ├─ saved_models/model_pruned_50.pt         │
  │   └─ results/comparison.json                 │
  │                                               │
  └→ [API Path] ──────────────────────────────────┐
     1. uvicorn api/backend:app --reload         │
     2. POST /api/models/load (optional)         │
     3. POST /api/datasets/upload (optional)     │
     4. POST /api/pruning/start                  │
     5. GET /api/pruning/job/{id} (poll)         │
     6. GET /api/results/download/{id}           │
                                                 │
     Output:                                     │
     ├─ api_models/*.pt                          │
     ├─ api_uploads/*.json                       │
     └─ api_results/*.json                       │
```

---

## Integration Points

```
main_restructured.py
    ↓ [Generates models]
    ├─ saved_models/*.pt
    ├─ results/*.json
    └─ Can be moved to:
        └─ api/api_models/
           api/api_results/

        ↓ [API accesses]
        
api/backend.py
    ├─ GET /api/models/load
    ├─ POST /api/pruning/start
    ├─ GET /api/results/download
    └─ Can serve results to:
        └─ Web frontend
           Mobile app
           CI/CD pipeline
           Monitoring dashboard
```

---

## Scalability Growth

```
PHASE 1: Single Run (Week 1)
────────────────────────────
├─ Run pruning once
├─ Save results
└─ Analyze output
   └─ Time: Hours
   └─ Effort: Low
   └─ Complexity: Low

PHASE 2: Parameter Sweep (Week 2-3)
──────────────────────────────────────
├─ Multiple sparsity rates
├─ Multiple methods
├─ Compare results
└─ Documentation
   └─ Time: Days
   └─ Effort: Medium
   └─ Complexity: Medium

PHASE 3: Production Deployment (Week 4+)
───────────────────────────────────────────
├─ API backend setup
├─ User interface
├─ Job scheduling
├─ Result archival
└─ Monitoring
   └─ Time: Weeks
   └─ Effort: High
   └─ Complexity: High
```

---

## Performance Overview

```
MEMORY USAGE OVER TIME:
╔═══════════════════════════════════════════╗
║  Peak: Model loading + calibration data   ║
║  ████████████████████ 20GB                ║
║  Mid:  Active pruning                     ║
║  ███████████ 12GB                         ║
║  Low:  Idle between runs                  ║
║  ██ 2GB                                   ║
╚═══════════════════════════════════════════╝

TIME BREAKDOWN (Llama-2-7B, 2SSP, 50% sparsity):
├─ Setup & Loading:        8 min   (10%)
├─ Baseline Eval:          8 min   (10%)
├─ Pruning:               40 min   (50%)
├─ Pruned Eval:            8 min   (10%)
└─ Save & Cleanup:         4 min   (5%)
   ─────────────────────────────────
   TOTAL:                 68 min  (100%)
```

---

**Ready to use this guide?** 

**Start with**: `QUICK_REFERENCE.md` → Run first command → Explore results → Read relevant docs

**Questions?** Check `DOCUMENTATION_INDEX.md` for cross-references.

---

*Visual Guide v1.0 | 2024-01-15*
