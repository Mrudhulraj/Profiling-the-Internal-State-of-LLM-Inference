# Quick Reference Card

## 🚀 Start in 30 Seconds

### Installation
```bash
cd 2SSP
pip install -r requirements.txt
export HF_TOKEN="your_token"
```

### Run Pruning
```bash
# Basic (30 min)
python main_restructured.py --model llama-2-7b --pruning_method 2ssp --sparsity_rate 0.5 --evaluate_perplexity

# Full (90 min)
python main_restructured.py --model llama-2-7b --pruning_method 2ssp --sparsity_rate 0.5 --evaluate_all --save_models --compare_models

# With custom dataset
python main_restructured.py --model llama-2-7b --custom_dataset_path data.json --pruning_method 2ssp --sparsity_rate 0.5 --evaluate_all
```

### Start Backend
```bash
cd ../api
pip install -r requirements_backend.txt
uvicorn backend:app --reload
# Visit: http://localhost:8000/docs
```

---

## 📋 Commands Cheat Sheet

### Model Selection
```bash
--model llama-2-7b           # Predefined
--model mistral-7b           # Predefined
--model phi-3                # Predefined
--model qwen-7b              # Predefined
--model custom --model_path "path/to/model"  # Custom
```

### Dataset Selection
```bash
--dataset wikitext2          # Built-in (default)
--dataset c4                 # Built-in C4 val
--dataset fineweb-edu        # Built-in FineWeb
--custom_dataset_path data.json  # Custom JSON
--custom_dataset_path data.csv   # Custom CSV
--local_datasets             # Use cached versions
```

### Pruning Methods
```bash
--pruning_method 2ssp        # Two-stage (best)
--pruning_method shortgpt    # Fast & good
--pruning_method window_based # Baseline comparison
--pruning_method blockpruner # Block-level
--pruning_method evopress    # Evolutionary
--pruning_method slicegpt    # Low-rank
```

### Sparsity Rates
```bash
--sparsity_rate 0.25         # 25% pruned
--sparsity_rate 0.375        # 37.5% pruned
--sparsity_rate 0.5          # 50% pruned (default)
--sparsity_rate -2           # Preset: [0.25, 0.375, 0.5]
--sparsity_rate -1           # All possible rates
```

### Evaluation Options
```bash
--evaluate_perplexity        # Only perplexity
--evaluate_inference         # Only inference time
--evaluate_downstream        # Only downstream tasks
--evaluate_all               # All metrics
```

### Saving & Comparison
```bash
--save_models                # Save baseline & pruned
--models_dir "./models"      # Custom save location
--compare_models             # Generate comparison JSON
```

### Other
```bash
--seed 42                    # Reproducibility
--cache_dir "/path"          # Model cache location
--logging DEBUG              # Verbose logging
```

---

## 📊 Output Files

### Directories Created
```
saved_models/                # Pruned models (.pt files)
results/                     # JSON results & comparisons
api_models/                  # (Backend) Saved models
api_uploads/                 # (Backend) Custom datasets
api_results/                 # (Backend) Results
```

### Key Files Generated
```
results/pruning_results_MODEL_*.json     # All results
results/comparison_MODEL_SPARSITY.json   # Comparison metrics
saved_models/MODEL_pruned_SPARSITY.pt    # Pruned model weights
```

### Results JSON Structure
```json
{
  "baseline": {
    "parameters": {"total": 6738415616, "main_model": 6711558144},
    "metrics": {"perplexity": 15.234, "inference_time_ms": 2450}
  },
  "pruned": {
    "parameters": {...},
    "metrics": {...}
  },
  "comparison": {
    "parameter_reduction_percent": 50.0,
    "perplexity_increase_percent": 10.5,
    "speedup": 1.8
  }
}
```

---

## 🔄 Common Workflows

### Quick Test (15 min)
```bash
python main_restructured.py --model phi-3 --pruning_method shortgpt --sparsity_rate 0.25
```

### Full Evaluation (90 min)
```bash
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate 0.375 \
  --evaluate_all \
  --save_models \
  --compare_models
```

### Benchmark Sweep (3 hours)
```bash
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate -2 \
  --evaluate_all \
  --save_models \
  --compare_models
```

### Custom Data Pipeline (90 min)
```bash
python main_restructured.py \
  --model llama-2-7b \
  --custom_dataset_path my_data.json \
  --pruning_method 2ssp \
  --sparsity_rate 0.5 \
  --evaluate_all \
  --save_models \
  --compare_models
```

### Production Deployment (via API)
```bash
# 1. Start backend
cd api && uvicorn backend:app --reload &

# 2. Upload dataset
curl -X POST http://localhost:8000/api/datasets/upload -F "file=@data.json"

# 3. Start pruning job
curl -X POST http://localhost:8000/api/pruning/start \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "meta-llama/Llama-2-7b-hf",
    "pruning_method": "2ssp",
    "sparsity_rate": 0.5,
    "dataset_id": "wikitext2"
  }'

# 4. Check status & download
curl http://localhost:8000/api/pruning/job/{job_id}
curl http://localhost:8000/api/results/download/{job_id} -o pruned.pt
```

---

## 💡 Tips & Tricks

### Speed Up (Trade Quality)
```bash
# Use ShortGPT instead of 2SSP
--pruning_method shortgpt

# Use smaller sparsity rate
--sparsity_rate 0.25

# Skip some evaluations
--evaluate_perplexity  # Skip downstream & inference
```

### Better Quality (Trade Time)
```bash
# Use 2SSP method
--pruning_method 2ssp

# Sweep multiple rates
--sparsity_rate -2  # Or -1 for all

# Full evaluation
--evaluate_all
```

### Save Memory
```bash
# Fewer calibration samples
# (In code: CALIBRATION_SAMPLES dict)

# Use smaller models
--model phi-3  # Smaller than Llama-7B

# Sequential runs
# Run one sparsity at a time vs sweep
```

### Debug Issues
```bash
# Verbose logging
--logging DEBUG

# Check what's being loaded
# Review console output during loading

# Test with small model first
--model phi-3  # Test before Llama-70B

# Verify dataset format
# JSON: {"text": ["sample1", "sample2"]}
# CSV: text column with samples
```

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| CUDA OOM | Reduce calibration samples or use smaller model |
| Model not found | Check model name in SUPPORTED_MODELS or use full path |
| Dataset error | Verify JSON/CSV format with 'text' field |
| Slow performance | Check GPU with `nvidia-smi` |
| Import errors | Install deps: `pip install -r requirements.txt` |
| HF token issues | `export HF_TOKEN="your_token"` |

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| `METHODS_OVERVIEW.md` | Understand pruning methods |
| `MAIN_RESTRUCTURED_GUIDE.md` | Detailed usage guide |
| `PROJECT_WORKFLOW_OVERVIEW.md` | Complete system overview |
| `api/BACKEND_API_DOCS.md` | API endpoints & examples |
| `main_restructured.py` | Full source code |
| `api/backend.py` | Backend implementation |

---

## 🎯 Next Steps

1. **Try it now**: `python main_restructured.py --model phi-3 --pruning_method 2ssp --sparsity_rate 0.5 --evaluate_perplexity`

2. **Check results**: `cat results/pruning_results_*.json | python -m json.tool`

3. **Explore options**: Read `MAIN_RESTRUCTURED_GUIDE.md`

4. **Deploy**: Start FastAPI backend with `uvicorn api/backend:app --reload`

5. **Scale**: Use API for production deployments

---

## 📞 Support Resources

- **Methods**: See `METHODS_OVERVIEW.md`
- **Usage**: See `MAIN_RESTRUCTURED_GUIDE.md`
- **Architecture**: See `PROJECT_WORKFLOW_OVERVIEW.md`
- **API**: See `api/BACKEND_API_DOCS.md`
- **Code**: Check docstrings in source files

---

**Happy Pruning! 🚀**

Last Updated: 2024-01-15
Version: 1.0 (Restructured)
