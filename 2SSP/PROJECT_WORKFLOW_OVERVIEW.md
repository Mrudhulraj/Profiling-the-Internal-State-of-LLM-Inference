# Complete Project Structure & Workflow Overview

## 📊 Visual Workflow

### Original main.py Flow
```
Parse Args
    ↓
Load Tokenizer
    ↓
Load Datasets (Fixed)
    ↓
├─→ Dense Model Evaluation (optional)
│
├─→ Pruning Loop (for each method/sparsity)
│   ├─ Load Model
│   ├─ Apply Pruning
│   ├─ Evaluate
│   └─ Optional: Apply/Remove Masks
│
└─→ Ablations (optional)
```

### Restructured main_restructured.py Flow
```
┌─────────────────────────────────────────┐
│ STEP 1: MODEL SELECTION                 │
├─────────────────────────────────────────┤
│ Choose Model:                           │
│ • Predefined (llama-2-7b, mistral-7b, │
│              phi-3, qwen-7b)           │
│ • Custom path                           │
│                                         │
│ Output: Loaded model, baseline stats   │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ STEP 2: DATASET SELECTION               │
├─────────────────────────────────────────┤
│ Choose Dataset:                         │
│ • Built-in (wikitext2, c4, fineweb)   │
│ • Custom upload (JSON/CSV)              │
│ • Local cached datasets                 │
│                                         │
│ Output: Tokenized evaluation data,     │
│         calibration dataset             │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ BASELINE EVALUATION (optional)          │
├─────────────────────────────────────────┤
│ • Perplexity scoring                    │
│ • Inference time measurement            │
│ • Downstream tasks evaluation           │
│                                         │
│ Output: Baseline statistics             │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ STEP 3: PRUNING & COMPARISON            │
├─────────────────────────────────────────┤
│ For each sparsity rate:                 │
│                                         │
│ 1. Apply pruning (2SSP/ShortGPT/...)   │
│    ├─ Load fresh model                 │
│    ├─ Apply pruning method             │
│    └─ Measure time                     │
│                                         │
│ 2. Evaluate pruned model               │
│    ├─ Perplexity                       │
│    ├─ Inference time                   │
│    └─ Downstream tasks                 │
│                                         │
│ 3. Compare metrics                     │
│    ├─ Parameter reduction %            │
│    ├─ Size reduction %                 │
│    ├─ Perplexity increase %            │
│    ├─ Speedup factor                   │
│    └─ Save comparison JSON             │
│                                         │
│ 4. Save models                         │
│    ├─ Save pruned model weights        │
│    ├─ Store statistics                 │
│    └─ Clean up memory                  │
│                                         │
│ Output: Models + comparisons saved to  │
│         saved_models/ + results/       │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ RESULTS                                 │
├─────────────────────────────────────────┤
│ saved_models/                           │
│   ├─ model_pruned_50.pt                │
│   ├─ model_pruned_375.pt               │
│   └─ ...                                │
│                                         │
│ results/                                │
│   ├─ pruning_results_*.json            │
│   ├─ comparison_model_50.json          │
│   └─ ...                                │
└─────────────────────────────────────────┘
```

### FastAPI Backend Flow
```
┌──────────────────────────────────────────┐
│ CLIENT REQUESTS                          │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ HEALTH CHECK                             │
│ GET /health                              │
│ → GPU status, availability               │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ MODEL MANAGEMENT                         │
├──────────────────────────────────────────┤
│ GET /api/models/available               │
│   ↓                                      │
│ POST /api/models/load                   │
│   ↓                                      │
│ Store: model_info, parameters           │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ DATASET MANAGEMENT                       │
├──────────────────────────────────────────┤
│ POST /api/datasets/upload               │
│   ↓                                      │
│ Validate & store in api_uploads/        │
│   ↓                                      │
│ GET /api/datasets/list                  │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ STATISTICS COMPUTATION                   │
├──────────────────────────────────────────┤
│ POST /api/stats/compute                 │
│   ↓                                      │
│ Compute: perplexity, inference time     │
│   ↓                                      │
│ Store: model_stats JSON                 │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ PRUNING JOB MANAGEMENT (Background)      │
├──────────────────────────────────────────┤
│ POST /api/pruning/start                 │
│   → job_id created                       │
│   → status: pending → running → done     │
│                                          │
│ GET /api/pruning/job/{job_id}           │
│   → poll for status                      │
│                                          │
│ GET /api/pruning/jobs                   │
│   → list all jobs                        │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ RESULT EXPORT & DOWNLOAD                 │
├──────────────────────────────────────────┤
│ GET /api/results/download/{job_id}      │
│   → Download pruned model.pt             │
│                                          │
│ GET /api/results/export/{job_id}        │
│   → Export results JSON                  │
└──────────────────────────────────────────┘
```

---

## 📁 Project File Structure

```
Profiling-the-Internal-State-of-LLM-Inference/
│
├── 2SSP/                                 [MAIN PRUNING CODE]
│   ├── main.py                          [Original script]
│   ├── main_restructured.py             [NEW: Restructured script]
│   ├── requirements.txt
│   ├── METHODS_OVERVIEW.md              [NEW: Methods documentation]
│   ├── MAIN_RESTRUCTURED_GUIDE.md       [NEW: Usage guide]
│   │
│   ├── src/
│   │   ├── __init__.py
│   │   ├── pruning.py                   [Pruning methods: 2SSP, ShortGPT, etc.]
│   │   ├── evaluation.py                [Perplexity, downstream task eval]
│   │   ├── utilities.py                 [Model loading, masking, statistics]
│   │   ├── datasets.py                  [Dataset loading helpers]
│   │   ├── evopress.py                  [EvoPress method]
│   │   ├── slicegpt.py                  [SliceGPT method]
│   │   ├── ablations.py                 [Ablation studies]
│   │   └── slicegpt_utils/
│   │
│   ├── lm_harness/                      [LM Evaluation Harness]
│   │   └── lm_eval/                     [Evaluation framework]
│   │
│   ├── saved_models/                    [NEW: Models saved by restructured script]
│   │   └── *.pt                         [Pruned model weights]
│   │
│   └── results/                         [NEW: Results directory]
│       ├── pruning_results_*.json       [Complete pruning results]
│       └── comparison_*.json            [Model comparisons]
│
├── api/                                 [NEW: FASTAPI BACKEND]
│   ├── backend.py                       [NEW: FastAPI application]
│   ├── BACKEND_API_DOCS.md              [NEW: API documentation]
│   ├── requirements_backend.txt         [NEW: Backend dependencies]
│   ├── main.py                          [Original endpoint file]
│   ├── router.py                        [Original routing]
│   │
│   ├── api_models/                      [NEW: Models directory for API]
│   │   └── *.pt                         [Cached pruned models]
│   │
│   ├── api_uploads/                     [NEW: User uploads]
│   │   └── *.json, *.csv                [Custom datasets]
│   │
│   ├── api_results/                     [NEW: API results]
│   │   ├── model_stats.json
│   │   ├── pruning_job_*.json
│   │   └── ...
│   │
│   └── api_datasets/                    [NEW: Cached datasets]
│       └── *.cache
│
└── README.md                            [Original readme]
```

---

## 🔄 Workflow Comparison

### Old Workflow (main.py)
| Step | Feature | Status |
|------|---------|--------|
| 1 | Model Selection | Fixed set of models |
| 2 | Dataset Loading | Fixed predefined datasets |
| 3 | Baseline Eval | Optional |
| 4 | Pruning | Single method at a time |
| 5 | Evaluation | Inline with pruning |
| 6 | Result Tracking | Limited logging only |
| 7 | Model Comparison | Basic metrics |
| 8 | Model Storage | No built-in saving |

### New Workflow (main_restructured.py)
| Step | Feature | Status |
|------|---------|--------|
| 1 | Model Selection | ✅ Flexible (predefined + custom) |
| 2 | Dataset Loading | ✅ Flexible (built-in + custom upload) |
| 3 | Baseline Eval | ✅ Comprehensive (all metrics) |
| 4 | Pruning | ✅ Supports all methods |
| 5 | Evaluation | ✅ Modular (pick what you need) |
| 6 | Result Tracking | ✅ Structured JSON output |
| 7 | Model Comparison | ✅ Detailed analytics |
| 8 | Model Storage | ✅ Automatic saving + versioning |

### FastAPI Backend
| Capability | Feature | Status |
|-----------|---------|--------|
| 1 | Model Management | ✅ Load, list, stats |
| 2 | Dataset Upload | ✅ Custom JSON/CSV |
| 3 | Statistics | ✅ Perplexity, inference time |
| 4 | Pruning | ✅ Background jobs |
| 5 | Monitoring | ✅ Real-time job status |
| 6 | Results | ✅ Download & export |
| 7 | Scalability | ✅ Multi-job support |
| 8 | API Docs | ✅ Swagger UI + ReDoc |

---

## 🚀 Pruning Methods Matrix

| Method | Type | Input | Output | Speed | Accuracy | Best For |
|--------|------|-------|--------|-------|----------|----------|
| **2SSP** | Structured | Calib. data | Model | Slow | ⭐⭐⭐⭐⭐ | Balanced |
| **ShortGPT** | Block | Calib. data | Masks | Fast | ⭐⭐⭐⭐ | Quick |
| **Window-Based** | Block | Calib. data | Masks | Fast | ⭐⭐⭐ | Testing |
| **BlockPruner** | Block | Single sample | Masks | Fast | ⭐⭐⭐ | Testing |
| **EvoPress** | Evolutionary | Full dataset | Masks | Slow | ⭐⭐⭐⭐ | Research |
| **SliceGPT** | Low-rank | Calib. data | Model | Medium | ⭐⭐⭐⭐ | Dimension |

---

## 💾 Data Flow & Persistence

### main_restructured.py
```
Input:
  ├─ Model (HF Hub)
  ├─ Dataset (HF Hub or custom)
  └─ Pruning config

Processing:
  ├─ Load model + tokenizer
  ├─ Prepare datasets
  ├─ Baseline evaluation
  ├─ Apply pruning
  ├─ Evaluate pruned model
  └─ Compare results

Output:
  ├─ saved_models/
  │   ├─ {model_id}_pruned_{sparsity}.pt
  │   └─ ...
  ├─ results/
  │   ├─ pruning_results_*.json
  │   ├─ comparison_*.json
  │   └─ ...
  └─ Console logs
```

### FastAPI Backend
```
Input:
  ├─ API Requests (JSON)
  ├─ File Uploads (datasets)
  └─ Configuration (query params)

Processing (Background):
  ├─ Job tracker
  ├─ Model management
  ├─ Dataset validation
  ├─ Pruning execution
  └─ Statistics collection

Output:
  ├─ api_models/
  │   └─ {job_id}_pruned.pt
  ├─ api_uploads/
  │   └─ {dataset_id}_*
  ├─ api_results/
  │   ├─ model_stats.json
  │   └─ pruning_results_*.json
  ├─ api_datasets/
  │   └─ *.cache
  └─ JSON Responses
```

---

## 🎯 Use Case Examples

### Use Case 1: Research & Experimentation
**Best Tool**: `main_restructured.py` with `--logging DEBUG`

```bash
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate -1 \  # All rates
  --evaluate_all \
  --save_models \
  --logging DEBUG
```

### Use Case 2: Production Model Pruning
**Best Tool**: FastAPI Backend with scheduled jobs

```python
# Upload dataset
dataset_id = upload_dataset("production_data.csv")

# Start pruning
job = start_pruning({
    "model_id": "llama-2-7b",
    "pruning_method": "2ssp",
    "sparsity_rate": 0.375,
    "dataset_id": dataset_id
})

# Monitor & download
while monitor_job(job['job_id']) != "completed":
    time.sleep(60)

download_pruned_model(job['job_id'])
```

### Use Case 3: Quick Prototyping
**Best Tool**: `main_restructured.py` with ShortGPT

```bash
python main_restructured.py \
  --model phi-3 \
  --pruning_method shortgpt \
  --sparsity_rate 0.5 \
  --evaluate_perplexity \
  --save_models
```

### Use Case 4: Benchmark Comparison
**Best Tool**: `main_restructured.py` with parameter sweep

```bash
# Test all three methods at same sparsity
for method in 2ssp shortgpt window_based; do
  python main_restructured.py \
    --model qwen-7b \
    --pruning_method $method \
    --sparsity_rate 0.375 \
    --evaluate_all \
    --save_models \
    --compare_models
done
```

---

## 🔧 Configuration Recommendations

### For Speed (Quick Testing)
```bash
# Use ShortGPT, fewer samples, single rate
python main_restructured.py \
  --model phi-3 \
  --pruning_method shortgpt \
  --sparsity_rate 0.375
```
⏱️ **Time**: ~30 minutes | 📦 **Accuracy**: Good

### For Accuracy (Research)
```bash
# Use 2SSP, more samples, sweep rates
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate -2 \
  --evaluate_all \
  --save_models \
  --compare_models
```
⏱️ **Time**: ~2 hours | 📦 **Accuracy**: Excellent

### For Production (Balanced)
```bash
# Use 2SSP at target rate, full evaluation
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate 0.375 \
  --evaluate_all \
  --save_models \
  --compare_models \
  --seed 42
```
⏱️ **Time**: ~45 minutes | 📦 **Accuracy**: Excellent | 🔄 **Reproducible**: Yes

---

## 📈 Expected Performance

### Time Breakdown (Llama-2-7B)
| Operation | Duration |
|-----------|----------|
| Model loading | 3-5 min |
| Dataset tokenization | 2-3 min |
| Baseline evaluation | 5-10 min |
| 2SSP pruning | 30-45 min |
| ShortGPT pruning | 20-30 min |
| Model saving | 1-2 min |
| **Total** | **60-95 min** |

### Memory Usage
| Component | Size |
|-----------|------|
| Base model (Llama-7B) | ~14 GB |
| Calibration data | ~2 GB |
| Intermediate outputs | ~3 GB |
| **Total** | ~20 GB |

---

## 🔗 Integration Guide

### Running Both
```bash
# 1. Generate results with main script
cd 2SSP
python main_restructured.py \
  --model llama-2-7b \
  --evaluate_all \
  --save_models \
  --compare_models

# 2. Start backend
cd ../api
python -m uvicorn backend:app --reload

# 3. Use API to deploy saved models
curl http://localhost:8000/api/models/load?model_name=llama-2-7b
```

### Sharing Results
```bash
# Export results as JSON
cp 2SSP/results/pruning_results_*.json api/api_results/

# Now accessible via API
curl http://localhost:8000/api/results/export/{job_id}
```

---

## 📚 Documentation Map

| Document | Location | Purpose |
|----------|----------|---------|
| Overview | `METHODS_OVERVIEW.md` | Pruning methods explanation |
| Usage Guide | `MAIN_RESTRUCTURED_GUIDE.md` | How to use restructured script |
| API Docs | `api/BACKEND_API_DOCS.md` | API endpoints & examples |
| Workflow | This file | Complete system overview |
| Original | `main.py` | Legacy script reference |

---

## ✅ Checklist for First Run

- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Set HF_TOKEN: `export HF_TOKEN="your_token"`
- [ ] Test basic run: `python main_restructured.py --model phi-3 --evaluate_perplexity`
- [ ] Check output: `ls saved_models/ results/`
- [ ] Review results JSON: `cat results/pruning_results_*.json`
- [ ] Install backend deps: `pip install -r api/requirements_backend.txt`
- [ ] Start API: `uvicorn api/backend:app --reload`
- [ ] Test API: `curl http://localhost:8000/health`

---

## 🎓 Learning Path

### Beginner
1. Read `METHODS_OVERVIEW.md` to understand methods
2. Run `main_restructured.py` with basic example
3. Check generated results in JSON files
4. Review comparison metrics

### Intermediate
1. Experiment with different pruning methods
2. Test parameter sweep with `-2` or `-1` sparsity
3. Upload custom dataset
4. Compare multiple configurations

### Advanced
1. Set up FastAPI backend
2. Integrate with production pipelines
3. Automate pruning via API
4. Build monitoring dashboard

---

**Ready to start? Begin with the quick start in `MAIN_RESTRUCTURED_GUIDE.md`!** 🚀
