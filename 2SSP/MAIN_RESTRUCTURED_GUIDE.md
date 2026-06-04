# Restructured Main Script - Usage Guide

## Overview

The new `main_restructured.py` follows a 3-step workflow:

1. **Choose Model** - Select from predefined models or provide custom path
2. **Choose Dataset** - Use built-in datasets or upload custom ones
3. **Save & Compare** - Save models locally and compare baseline vs pruned performance

---

## Quick Start

### Basic Usage

```bash
cd 2SSP

# Prune with 2SSP at 50% sparsity, evaluate perplexity
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate 0.5 \
  --evaluate_perplexity \
  --save_models \
  --compare_models

# Full evaluation with all metrics
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method shortgpt \
  --sparsity_rate 0.375 \
  --evaluate_all \
  --save_models \
  --compare_models
```

---

## Command-Line Arguments

### Step 1: Model Selection

#### Predefined Models
```bash
# Choose from predefined list (recommended)
python main_restructured.py --model llama-2-7b
```

Available models:
- `llama-2-7b` → meta-llama/Llama-2-7b-hf
- `mistral-7b` → mistralai/Mistral-7B-v0.3
- `phi-3` → microsoft/Phi-3-medium-128k-instruct
- `qwen-7b` → Qwen/Qwen2.5-7B

#### Custom Model Path
```bash
# Use full model path
python main_restructured.py \
  --model custom \
  --model_path "meta-llama/Llama-2-70b-hf"
```

#### Cache Directory
```bash
# Specify where to cache downloaded models
python main_restructured.py \
  --model llama-2-7b \
  --cache_dir "/path/to/cache"
```

---

### Step 2: Dataset Selection

#### Built-in Datasets
```bash
# Wikitext-2 (default)
python main_restructured.py --dataset wikitext2

# C4 Validation
python main_restructured.py --dataset c4

# FineWeb-Edu
python main_restructured.py --dataset fineweb-edu
```

#### Custom Dataset
```bash
# Upload custom dataset (JSON or CSV)
python main_restructured.py \
  --model llama-2-7b \
  --custom_dataset_path "/path/to/data.json"
```

**Custom Dataset Format (JSON):**
```json
{
  "text": [
    "First document text here...",
    "Second document text here...",
    "..."
  ]
}
```

Or list of strings:
```json
[
  "First document text here...",
  "Second document text here...",
  "..."
]
```

**Custom Dataset Format (CSV):**
```csv
text
"First document text here..."
"Second document text here..."
```

#### Local Datasets
```bash
# Use cached/local datasets from ./data/ folder
python main_restructured.py \
  --dataset wikitext2 \
  --local_datasets
```

---

### Step 3: Pruning Configuration

#### Pruning Methods

**2SSP (Two-Stage Structured Pruning)**
```bash
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate 0.5
```
- **Best for**: Balanced accuracy-compression trade-off
- **Time**: 30-45 minutes
- **Calibration samples**: 32 (default)

**ShortGPT**
```bash
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method shortgpt \
  --sparsity_rate 0.5
```
- **Best for**: Quick pruning with reasonable results
- **Time**: 20-30 minutes
- **Calibration samples**: 256

#### Sparsity Rates

```bash
# Single rate
python main_restructured.py \
  --sparsity_rate 0.5

# Multiple preset rates (25%, 37.5%, 50%)
python main_restructured.py \
  --sparsity_rate -2

# All possible rates (fine-grained sweep)
python main_restructured.py \
  --sparsity_rate -1
```

**Sparsity Rate Guide:**
- `0.25` - 25% parameters removed (aggressive, faster inference)
- `0.375` - 37.5% parameters removed (balanced)
- `0.5` - 50% parameters removed (maximum compression)

---

### Step 4: Model Saving & Comparison

#### Save Models
```bash
# Save baseline and pruned models locally
python main_restructured.py \
  --pruning_method 2ssp \
  --sparsity_rate 0.5 \
  --save_models \
  --models_dir "/custom/path/to/save"
```

**Default directory:** `saved_models/`

**Saved files:**
```
saved_models/
├── llama-2-7b_pruned_50.pt      # Pruned model at 50% sparsity
├── comparison_llama-2-7b_50.json # Comparison metrics
└── ...
```

#### Compare Models
```bash
# Generate comparison report between baseline and pruned
python main_restructured.py \
  --pruning_method 2ssp \
  --sparsity_rate 0.5 \
  --save_models \
  --compare_models
```

**Comparison Output (JSON):**
```json
{
  "baseline": {
    "parameters": {
      "total": 6738415616,
      "main_model": 6711558144
    },
    "metrics": {
      "perplexity": 15.234
    }
  },
  "pruned": {
    "parameters": {
      "total": 3369207808,
      "main_model": 3355779072
    },
    "metrics": {
      "perplexity": 16.842
    }
  },
  "comparison": {
    "parameter_reduction_percent": 50.0,
    "size_reduction_percent": 49.8,
    "perplexity_increase_percent": 10.5,
    "speedup": 1.8
  }
}
```

---

### Step 5: Evaluation Options

#### Individual Evaluations
```bash
# Perplexity only
python main_restructured.py \
  --model llama-2-7b \
  --evaluate_perplexity

# Inference time only
python main_restructured.py \
  --model llama-2-7b \
  --evaluate_inference

# Downstream tasks only
python main_restructured.py \
  --model llama-2-7b \
  --evaluate_downstream
```

#### All Evaluations
```bash
# Run all evaluations at once
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method 2ssp \
  --sparsity_rate 0.5 \
  --evaluate_all
```

**Includes:**
- Perplexity (on chosen dataset)
- Inference time (ms)
- Downstream tasks (winogrande, ARC, HellaSwag, PIQA, MMLU)

---

### Other Options

#### Reproducibility
```bash
# Set seed for reproducible results
python main_restructured.py \
  --model llama-2-7b \
  --seed 42 \
  --pruning_method 2ssp \
  --sparsity_rate 0.5
```

#### Logging
```bash
# Control logging verbosity
python main_restructured.py \
  --logging DEBUG    # Most verbose
  --logging INFO     # Default
  --logging WARNING  # Less verbose
```

---

## Complete Examples

### Example 1: Quick Pruning with Evaluation

```bash
python main_restructured.py \
  --model llama-2-7b \
  --dataset wikitext2 \
  --pruning_method 2ssp \
  --sparsity_rate 0.5 \
  --evaluate_perplexity \
  --save_models \
  --compare_models \
  --seed 0
```

**Steps:**
1. Loads Llama-2-7B
2. Loads Wikitext-2 dataset
3. Computes baseline perplexity
4. Applies 2SSP pruning at 50% sparsity
5. Computes pruned model perplexity
6. Saves both models
7. Generates comparison report
8. Outputs results to `results/`

### Example 2: Full Evaluation Pipeline

```bash
python main_restructured.py \
  --model mistral-7b \
  --dataset c4 \
  --pruning_method shortgpt \
  --sparsity_rate 0.375 \
  --evaluate_all \
  --save_models \
  --compare_models \
  --logging DEBUG
```

**Steps:**
1. Loads Mistral-7B
2. Loads C4 validation dataset
3. Computes baseline perplexity, inference time, downstream tasks
4. Applies ShortGPT pruning at 37.5% sparsity
5. Computes all metrics on pruned model
6. Saves comparison with all metrics
7. Shows detailed logs

### Example 3: Custom Dataset Pruning

```bash
# Prepare custom dataset
cat > my_dataset.json << 'EOF'
{
  "text": [
    "Your custom document 1...",
    "Your custom document 2...",
    "Your custom document 3..."
  ]
}
EOF

# Run pruning
python main_restructured.py \
  --model phi-3 \
  --custom_dataset_path "./my_dataset.json" \
  --pruning_method 2ssp \
  --sparsity_rate 0.25 \
  --evaluate_perplexity \
  --save_models \
  --compare_models
```

### Example 4: Parameter Sweep

```bash
# Test multiple sparsity rates
python main_restructured.py \
  --model qwen-7b \
  --pruning_method shortgpt \
  --sparsity_rate -2 \
  --evaluate_perplexity \
  --save_models \
  --compare_models
```

**Runs pruning at:** 25%, 37.5%, 50% sparsity
**Generates:** 3 comparison reports
**Saves:** 3 pruned models

---

## Output Structure

### Directory Layout

```
.
├── saved_models/                          # Saved models
│   ├── llama-2-7b_pruned_50.pt           # Pruned model
│   └── ...
├── results/                               # Results and comparisons
│   ├── pruning_results_llama-2-7b_*.json # Comprehensive results
│   ├── comparison_llama-2-7b_*.json      # Pairwise comparisons
│   └── ...
└── main_restructured.py                   # This script
```

### Results File Format (JSON)

```json
{
  "baseline": {
    "model_id": "llama-2-7b",
    "model_name": "meta-llama/Llama-2-7b-hf",
    "parameters": {
      "total": 6738415616,
      "main_model": 6711558144,
      "reduction_ratio": 0.9961
    },
    "metrics": {
      "perplexity": 15.234,
      "inference_time_ms": 2450.5
    }
  },
  "pruned_models": [
    {
      "model_id": "llama-2-7b_pruned_50",
      "pruning_method": "2ssp",
      "sparsity_rate": 0.5,
      "parameters": {
        "total": 3369207808,
        "main_model": 3355779072
      },
      "metrics": {
        "perplexity": 16.842,
        "inference_time_ms": 1361.2
      }
    }
  ],
  "dataset": "wikitext2",
  "pruning_method": "2ssp"
}
```

---

## Performance Tips

### Faster Execution
1. Use fewer calibration samples (trade quality for speed)
2. Test with smaller models first
3. Use ShortGPT instead of 2SSP (faster, less accurate)
4. Set `--local_datasets` to avoid downloading

### Better Accuracy
1. Increase calibration samples
2. Use 2SSP method
3. Use custom dataset relevant to your use case
4. Test multiple sparsity rates

### Memory Optimization
1. Reduce calibration samples
2. Use smaller sparsity rates (less aggressive)
3. Run on smaller models (5B instead of 7B)

---

## Troubleshooting

### CUDA Out of Memory
```bash
# Reduce calibration samples
python main_restructured.py \
  --model llama-2-7b \
  --pruning_method shortgpt \
  --sparsity_rate 0.5
# This reduces memory usage significantly
```

### Model Not Found
```bash
# Check available models
python -c "from main_restructured import SUPPORTED_MODELS; print(SUPPORTED_MODELS)"

# Or use full path
python main_restructured.py \
  --model custom \
  --model_path "meta-llama/Llama-2-70b-hf"
```

### Dataset Download Issues
```bash
# Use local datasets instead
python main_restructured.py \
  --dataset wikitext2 \
  --local_datasets
```

---

## Integration with FastAPI Backend

To use results from `main_restructured.py` with the FastAPI backend:

1. Generate results with main script:
   ```bash
   python main_restructured.py \
     --model llama-2-7b \
     --pruning_method 2ssp \
     --sparsity_rate 0.5 \
     --evaluate_all \
     --save_models \
     --compare_models
   ```

2. Copy saved models to FastAPI models directory:
   ```bash
   cp saved_models/* ../api/api_models/
   ```

3. Use the models in API:
   ```python
   requests.post(
       "http://localhost:8000/api/models/load",
       params={"model_name": "meta-llama/Llama-2-7b-hf"}
   )
   ```

---

## Next Steps

- See `METHODS_OVERVIEW.md` for detailed pruning method information
- Check `../api/BACKEND_API_DOCS.md` for FastAPI backend usage
- Refer to `../README.md` for overall project documentation
