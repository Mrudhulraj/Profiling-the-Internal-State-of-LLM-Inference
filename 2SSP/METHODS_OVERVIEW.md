# Pruning Methods Overview

## Available Pruning Methods

### 1. **2SSP (Two-Stage Structured Pruning)** - Primary Method
- **Author**: Your research
- **Paper**: Two-Stage Framework for Structured Pruning of LLMs
- **Approach**: 
  - **Stage 1**: Prunes MLP neurons based on L2 norms of hidden states
  - **Stage 2**: Iteratively prunes attention submodules to minimize perplexity loss
- **Key Parameters**:
  - `pruning_rate`: Overall proportion of parameters to prune (0.0 - 1.0)
  - `alpha`: Balances parameter pruning between stages (default: 1.5)
  - `num_calibration_second_stage`: Calibration samples for attention pruning (default: 1)
- **Advantages**: Two-stage optimization for better accuracy preservation
- **Output**: Returns pruned model directly (no masks)

### 2. **ShortGPT**
- **Paper**: https://arxiv.org/abs/2403.03853
- **Approach**: Block pruning based on cosine similarity between consecutive layer outputs
- **Key Parameters**:
  - `num_prune`: Number of blocks to prune
- **Output**: Binary mask for pruned blocks

### 3. **Window-Based Pruning**
- **Paper**: https://arxiv.org/abs/2403.17887 (Sliding Window Cosine Similarity)
- **Approach**: Identifies contiguous blocks with high similarity within a sliding window
- **Key Parameters**:
  - `num_prune`: Number of blocks to prune
- **Output**: Binary mask for pruned blocks

### 4. **BlockPruner**
- **Approach**: Block-level pruning with separate attention and MLP masks
- **Key Parameters**:
  - `num_prune`: Number of blocks to prune
- **Output**: Separate masks for attention and MLP layers

### 5. **EvoPress**
- **Paper**: https://github.com/IST-DASLab/EvoPress
- **Approach**: Evolutionary pressure-based pruning
- **Key Parameters**:
  - `num_prune`: Number of blocks to prune
- **Output**: Separate masks for attention and MLP layers

### 6. **SliceGPT**
- **Paper**: Microsoft TransformerCompression
- **Approach**: Low-rank decomposition with dimension reduction
- **Key Parameters**:
  - `sparsity`: Sparsity rate (0.0 - 1.0)
- **Output**: Returns pruned model directly
- **Note**: Cannot use cache_dir parameter

---

## Workflow of Current main.py

```
1. INITIALIZATION
   ├── Parse command-line arguments
   ├── Set up logging
   ├── Set seed for reproducibility
   ├── Load tokenizer
   └── Set HF_TOKEN

2. DATASET LOADING & TOKENIZATION
   ├── Load evaluation datasets (Wikitext2, C4, FineWeb-Edu)
   ├── Tokenize datasets
   └── Prepare calibration datasets for pruning

3. DENSE MODEL EVALUATION (optional: --dense flag)
   ├── Load original model
   ├── Print model statistics
   ├── Optionally:
   │   ├── Evaluate inference time
   │   ├── Evaluate downstream tasks
   │   ├── Evaluate perplexity
   │   └── Generate qualitative results

4. PRUNING WORKFLOW (if --pruning_method specified)
   ├── Load model (unless SliceGPT)
   ├── Determine pruning rates based on --sparsity_rate:
   │   ├── If -1: All possible rates
   │   ├── If -2: [0.25, 0.375, 0.5]
   │   └── Otherwise: Single rate
   │
   ├── For each pruning rate:
   │   ├── Measure pruning time
   │   ├── Call method-specific pruning function
   │   ├── Print pruned model statistics
   │   │
   │   ├── If 2SSP or SliceGPT (no masks generated):
   │   │   ├── Evaluate inference time
   │   │   ├── Evaluate downstream tasks
   │   │   ├── Evaluate perplexity
   │   │   ├── Generate qualitative results
   │   │   └── Clean up (delete model, reload if needed)
   │   │
   │   └── If other methods (masks generated):
   │       ├── Apply masks to model
   │       ├── Evaluate inference time
   │       ├── Evaluate downstream tasks
   │       ├── Evaluate perplexity
   │       ├── Generate qualitative results
   │       └── Remove masks (restore original)

5. ABLATIONS (optional: --ablation flag)
   └── Run ablation studies
```

---

## Key Concepts

### Masks vs Direct Pruning
- **Masks (ShortGPT, Window-Based, BlockPruner, EvoPress)**: 
  - Create binary masks that zero out computations
  - Keep original model structure
  - Used for evaluation and can be toggled
  
- **Direct Pruning (2SSP, SliceGPT)**:
  - Actually remove weights/neurons
  - Model structure changes
  - Permanent modification

### Sparsity vs Pruning Rate
- **Sparsity**: Proportion of parameters removed relative to total
- **Pruning Rate**: For block pruning, number of blocks removed

### Calibration Datasets
- **Purpose**: Used to compute statistics for pruning decisions
- **2SSP**: 32 samples
- **Others**: 256 samples
