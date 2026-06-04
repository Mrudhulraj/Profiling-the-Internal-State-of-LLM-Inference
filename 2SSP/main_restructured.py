"""
Restructured Main Script for LLM Pruning with Model Selection and Custom Datasets

Workflow:
1. Choose model
2. Choose dataset (use predefined or custom)
3. Save both baseline and pruned models
4. Compare performance and size
"""

import argparse
import gc
import logging
import math
import time
import torch
import json
import os
from pathlib import Path
from typing import Dict, Tuple, Optional
from transformers import AutoTokenizer
from datetime import datetime

from src.evaluation import *
from src.utilities import *
from src.dataset import *
from src.pruning import *
from src.evopress import *
from src.slicegpt import *
from src.ablations import *


# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

SUPPORTED_MODELS = {
    "llama-2-7b": "meta-llama/Llama-2-7b-hf",
    "mistral-7b": "mistralai/Mistral-7B-v0.3",
    "phi-3": "microsoft/Phi-3-medium-128k-instruct",
    "qwen-7b": "Qwen/Qwen2.5-7B",
}

SUPPORTED_DATASETS = {
    "wikitext2": "load_wikitext2",
    "c4": "load_c4",
    "fineweb-edu": "load_fineweb_edu",
}

PRUNING_METHODS = {
    "2ssp": "two_stage_2ssp",
    "window_based": "window_based",
    "shortgpt": "shortGPT",
    "blockpruner": "blockpruner",
    "evopress": "evopress",
    "slicegpt": "slicegpt",
}

CALIBRATION_SAMPLES = {
    "2ssp": 32,
    "window_based": 256,
    "shortgpt": 256,
    "blockpruner": 256,
    "evopress": 256,
    "slicegpt": 256,
}

MODELS_SAVE_DIR = "saved_models"
RESULTS_SAVE_DIR = "results"


# ============================================================================
# ARGUMENT PARSING
# ============================================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="LLM Pruning with Model and Dataset Selection"
    )
    
    # Step 1: Model Selection
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        choices=list(SUPPORTED_MODELS.keys()),
        help="Choose model from predefined list or provide full model path"
    )
    parser.add_argument(
        "--model_path",
        type=str,
        help="Override with full model path (for custom models)"
    )
    
    # Step 2: Dataset Selection
    parser.add_argument(
        "--dataset",
        type=str,
        default="wikitext2",
        choices=list(SUPPORTED_DATASETS.keys()),
        help="Choose dataset for evaluation and calibration"
    )
    parser.add_argument(
        "--custom_dataset_path",
        type=str,
        help="Path to custom dataset (JSON or CSV file)"
    )
    parser.add_argument(
        "--local_datasets",
        action="store_true",
        help="Use local cached datasets from ./data/ folder"
    )
    
    # Pruning Configuration
    parser.add_argument(
        "--pruning_method",
        type=str,
        choices=list(PRUNING_METHODS.keys()),
        help="Pruning method to apply"
    )
    parser.add_argument(
        "--sparsity_rate",
        type=float,
        default=0.5,
        help="Target sparsity rate (0.0-1.0). Use -1 for all rates, -2 for preset rates"
    )
    
    # Step 3: Model Saving and Comparison
    parser.add_argument(
        "--save_models",
        action="store_true",
        help="Save baseline and pruned models locally"
    )
    parser.add_argument(
        "--models_dir",
        type=str,
        default=MODELS_SAVE_DIR,
        help="Directory to save models"
    )
    parser.add_argument(
        "--compare_models",
        action="store_true",
        help="Compare baseline vs pruned model performance"
    )
    
    # Evaluation Options
    parser.add_argument(
        "--evaluate_perplexity",
        action="store_true",
        help="Evaluate perplexity on dataset"
    )
    parser.add_argument(
        "--evaluate_inference",
        action="store_true",
        help="Measure inference time"
    )
    parser.add_argument(
        "--evaluate_downstream",
        action="store_true",
        help="Evaluate on downstream tasks"
    )
    parser.add_argument(
        "--evaluate_all",
        action="store_true",
        help="Run all evaluations"
    )
    
    # Other Options
    parser.add_argument(
        "--seed",
        type=int,
        default=0,
        help="Seed for reproducibility"
    )
    parser.add_argument(
        "--cache_dir",
        type=str,
        help="Cache directory for downloaded models"
    )
    parser.add_argument(
        "--logging",
        type=str,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default='INFO',
        help="Logging level"
    )
    
    return parser.parse_args()


# ============================================================================
# STEP 1: MODEL SELECTION AND LOADING
# ============================================================================

def select_and_load_model(model_name: str, model_path: Optional[str] = None, cache_dir: Optional[str] = None):
    """
    Select model from predefined list or use custom path.
    
    Args:
        model_name: Key from SUPPORTED_MODELS or full model path
        model_path: Override model path
        cache_dir: Cache directory for downloaded models
        
    Returns:
        Loaded model and model identifier
    """
    if model_path:
        model_id = Path(model_path).name
        actual_path = model_path
    elif model_name in SUPPORTED_MODELS:
        model_id = model_name
        actual_path = SUPPORTED_MODELS[model_name]
    else:
        model_id = Path(model_name).name
        actual_path = model_name
    
    logging.info(f"Loading model: {actual_path}")
    model = loadModel(actual_path, cache_dir)
    
    return model, model_id, actual_path


# ============================================================================
# STEP 2: DATASET SELECTION AND LOADING
# ============================================================================

def load_selected_dataset(dataset_name: str, local: bool = False, custom_path: Optional[str] = None):
    """
    Load selected dataset or custom dataset.
    
    Args:
        dataset_name: Name of predefined dataset
        local: Use local cached datasets
        custom_path: Path to custom dataset
        
    Returns:
        Loaded dataset
    """
    if custom_path:
        logging.info(f"Loading custom dataset from: {custom_path}")
        # Load custom dataset (JSON or CSV)
        if custom_path.endswith('.json'):
            import json
            with open(custom_path) as f:
                data = json.load(f)
                return {"text": data} if isinstance(data, list) else data
        elif custom_path.endswith('.csv'):
            import pandas as pd
            df = pd.read_csv(custom_path)
            return {"text": df['text'].tolist()} if 'text' in df.columns else df
        else:
            raise ValueError("Custom dataset must be JSON or CSV format")
    
    logging.info(f"Loading dataset: {dataset_name}")
    
    if dataset_name == "wikitext2":
        return load_wikitext2(local)
    elif dataset_name == "c4":
        return load_c4(train=False, local=local)
    elif dataset_name == "fineweb-edu":
        return load_fineweb_edu(local=local)[:500]
    else:
        raise ValueError(f"Unknown dataset: {dataset_name}")


def prepare_evaluation_data(dataset, tokenizer, seq_len=2048):
    """
    Prepare tokenized dataset for evaluation.
    
    Args:
        dataset: Raw dataset with 'text' field
        tokenizer: Tokenizer instance
        seq_len: Sequence length
        
    Returns:
        Tokenized input IDs
    """
    text = "\n\n".join(dataset["text"])
    input_ids = tokenizer(text, return_tensors="pt", add_special_tokens=False).input_ids
    return input_ids


# ============================================================================
# STEP 3: MODEL STATISTICS AND COMPARISON
# ============================================================================

class ModelStats:
    """Container for model statistics and performance metrics."""
    
    def __init__(self, model_id: str, model_name: str):
        self.model_id = model_id
        self.model_name = model_name
        self.timestamp = datetime.now().isoformat()
        self.parameters = {}
        self.metrics = {}
        self.file_size = None
        self.pruning_method = None
        self.sparsity_rate = None
    
    def compute_parameters(self, model):
        """Compute and store parameter counts."""
        self.parameters['total'] = sum(p.numel() for p in model.parameters())
        self.parameters['main_model'] = sum(p.numel() for p in model.model.layers.parameters())
        self.parameters['reduction_ratio'] = self.parameters['main_model'] / self.parameters['total']
        return self.parameters
    
    def add_metric(self, metric_name: str, value):
        """Add evaluation metric."""
        self.metrics[metric_name] = value
        logging.info(f"{metric_name}: {value}")
    
    def compute_file_size(self, model_path: str):
        """Compute file size if model is saved."""
        if os.path.exists(model_path):
            self.file_size = os.path.getsize(model_path) / (1024 ** 3)  # GB
            return self.file_size
        return None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            'model_id': self.model_id,
            'model_name': self.model_name,
            'timestamp': self.timestamp,
            'parameters': self.parameters,
            'metrics': self.metrics,
            'file_size_gb': self.file_size,
            'pruning_method': self.pruning_method,
            'sparsity_rate': self.sparsity_rate,
        }


def compare_models(baseline_stats: ModelStats, pruned_stats: ModelStats) -> Dict:
    """
    Compare baseline and pruned models.
    
    Args:
        baseline_stats: Stats for baseline model
        pruned_stats: Stats for pruned model
        
    Returns:
        Comparison dictionary
    """
    comparison = {
        'baseline': baseline_stats.to_dict(),
        'pruned': pruned_stats.to_dict(),
        'comparison': {}
    }
    
    # Parameter reduction
    if baseline_stats.parameters.get('main_model') and pruned_stats.parameters.get('main_model'):
        param_reduction = (
            1 - pruned_stats.parameters['main_model'] / baseline_stats.parameters['main_model']
        ) * 100
        comparison['comparison']['parameter_reduction_percent'] = param_reduction
    
    # File size reduction
    if baseline_stats.file_size and pruned_stats.file_size:
        size_reduction = (1 - pruned_stats.file_size / baseline_stats.file_size) * 100
        comparison['comparison']['size_reduction_percent'] = size_reduction
    
    # Perplexity comparison
    if 'perplexity' in baseline_stats.metrics and 'perplexity' in pruned_stats.metrics:
        ppl_increase = (
            (pruned_stats.metrics['perplexity'] / baseline_stats.metrics['perplexity']) - 1
        ) * 100
        comparison['comparison']['perplexity_increase_percent'] = ppl_increase
    
    # Inference time comparison
    if 'inference_time' in baseline_stats.metrics and 'inference_time' in pruned_stats.metrics:
        speedup = baseline_stats.metrics['inference_time'] / pruned_stats.metrics['inference_time']
        comparison['comparison']['speedup'] = speedup
    
    return comparison


# ============================================================================
# STEP 4: PRUNING WORKFLOW
# ============================================================================

@torch.no_grad()
def prune_model(
    model,
    pruning_method: str,
    sparsity_rate: float,
    calibration_dataset,
    tokenizer,
    dataset_c4_train=None,
) -> Tuple[torch.nn.Module, Optional[Tuple[list, list]]]:
    """
    Apply pruning method to model.
    
    Args:
        model: Model to prune
        pruning_method: Method name
        sparsity_rate: Target sparsity
        calibration_dataset: Calibration data
        tokenizer: Tokenizer instance
        dataset_c4_train: Training dataset (for some methods)
        
    Returns:
        Pruned model and masks (if applicable)
    """
    num_blocks = len(model.model.layers)
    start_time = time.time()
    
    attnMask = mlpMask = None
    
    if pruning_method == "2ssp":
        logging.info(f"Applying 2SSP at {sparsity_rate*100:.1f}% sparsity")
        model = two_stage_2ssp(model, calibration_dataset, sparsity_rate)
    
    elif pruning_method == "shortgpt":
        target_blocks = int(math.ceil(sparsity_rate * num_blocks))
        logging.info(f"Applying ShortGPT: pruning {target_blocks} blocks")
        attnMask = mlpMask = shortGPT(model, target_blocks, calibration_dataset)
    
    elif pruning_method == "window_based":
        target_blocks = int(math.ceil(sparsity_rate * num_blocks))
        logging.info(f"Applying Window-Based: pruning {target_blocks} blocks")
        attnMask = mlpMask = window_based(model, target_blocks, calibration_dataset)
    
    elif pruning_method == "blockpruner":
        target_blocks = int(math.ceil(sparsity_rate * num_blocks))
        logging.info(f"Applying BlockPruner: pruning {target_blocks} blocks")
        first_sample = calibration_dataset[0]
        attnMask, mlpMask = blockpruner(model, target_blocks, first_sample)
    
    elif pruning_method == "evopress":
        target_blocks = int(math.ceil(sparsity_rate * num_blocks))
        logging.info(f"Applying EvoPress: pruning {target_blocks} blocks")
        attnMask, mlpMask = evopress(model, target_blocks, tokenizer, dataset_c4_train)
    
    elif pruning_method == "slicegpt":
        logging.info(f"Applying SliceGPT at {sparsity_rate*100:.1f}% sparsity")
        # Note: SliceGPT reloads model internally
        model = slicegpt(model, sparsity_rate, calibration_dataset)
    
    else:
        raise ValueError(f"Unknown pruning method: {pruning_method}")
    
    end_time = time.time()
    pruning_time = end_time - start_time
    logging.info(f"Pruning completed in {pruning_time:.2f}s")
    
    return model, (attnMask, mlpMask) if (attnMask is not None or mlpMask is not None) else None


# ============================================================================
# MAIN WORKFLOW
# ============================================================================

@torch.no_grad()
def main():
    args = parse_args()
    
    # Setup logging
    logging_level = getattr(logging, args.logging.upper())
    logging.basicConfig(
        level=logging_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Setup reproducibility
    set_seed(args.seed)
    os.environ["HF_TOKEN"] = os.environ.get("HF_TOKEN", "")
    
    # Create directories
    os.makedirs(args.models_dir, exist_ok=True)
    os.makedirs(RESULTS_SAVE_DIR, exist_ok=True)
    
    # ========================================================================
    # STEP 1: SELECT AND LOAD MODEL
    # ========================================================================
    logging.info("=" * 70)
    logging.info("STEP 1: MODEL SELECTION AND LOADING")
    logging.info("=" * 70)
    
    model, model_id, model_path = select_and_load_model(
        args.model, args.model_path, args.cache_dir
    )
    
    baseline_stats = ModelStats(model_id, model_path)
    baseline_stats.compute_parameters(model)
    logging.info(f"Baseline Parameters: {baseline_stats.parameters}")
    
    # ========================================================================
    # STEP 2: SELECT AND LOAD DATASET
    # ========================================================================
    logging.info("\n" + "=" * 70)
    logging.info("STEP 2: DATASET SELECTION AND LOADING")
    logging.info("=" * 70)
    
    dataset = load_selected_dataset(
        args.dataset,
        local=args.local_datasets,
        custom_path=args.custom_dataset_path
    )
    
    # Load tokenizer
    logging.info(f"Loading tokenizer for {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(
        model_path, trust_remote_code=True, use_fast=False
    )
    
    # Prepare evaluation data
    logging.info("Tokenizing dataset for evaluation")
    eval_input_ids = prepare_evaluation_data(dataset, tokenizer)
    logging.info(f"Evaluation data shape: {eval_input_ids.shape}")
    
    # Prepare calibration data
    num_cal_samples = CALIBRATION_SAMPLES.get(args.pruning_method or "window_based", 256)
    calibration_dataset = get_calibration(
        dataset, tokenizer, num_samples=num_cal_samples, seq_len=2048
    )
    logging.info(f"Calibration dataset prepared with {len(calibration_dataset)} samples")
    
    # ========================================================================
    # BASELINE EVALUATION
    # ========================================================================
    if args.evaluate_all or args.evaluate_perplexity:
        logging.info("\n" + "=" * 70)
        logging.info("BASELINE MODEL EVALUATION")
        logging.info("=" * 70)
        
        ppl = evaluate_perplexity(model, eval_input_ids, seq_len=2048)
        baseline_stats.add_metric('perplexity', ppl)
    
    if args.evaluate_all or args.evaluate_inference:
        first_calibration_sample = calibration_dataset[0]
        evaluate_inference_time(model, first_calibration_sample)
    
    if args.evaluate_all or args.evaluate_downstream:
        evaluation_downstream(model, model_path)
    
    # ========================================================================
    # STEP 3: PRUNING AND COMPARISON
    # ========================================================================
    if args.pruning_method:
        logging.info("\n" + "=" * 70)
        logging.info("STEP 3: PRUNING AND MODEL COMPARISON")
        logging.info("=" * 70)
        
        # Determine sparsity rates
        if int(round(args.sparsity_rate)) == -1:
            num_blocks = len(model.model.layers)
            sparsity_rates = [i / num_blocks for i in range(1, num_blocks - 1)]
        elif int(round(args.sparsity_rate)) == -2:
            sparsity_rates = [0.25, 0.375, 0.5]
        else:
            sparsity_rates = [args.sparsity_rate]
        
        pruning_results = []
        
        for target_sparsity in sparsity_rates:
            logging.info(f"\n--- Processing sparsity: {target_sparsity*100:.1f}% ---")
            
            # Reload baseline model
            set_seed(args.seed)
            model = loadModel(model_path, args.cache_dir)
            
            # Apply pruning
            pruned_model, masks = prune_model(
                model,
                args.pruning_method,
                target_sparsity,
                calibration_dataset,
                tokenizer,
                dataset if args.pruning_method == "evopress" else None,
            )
            
            # Create pruned stats
            pruned_stats = ModelStats(
                f"{model_id}_pruned_{target_sparsity*100:.0f}",
                model_path
            )
            pruned_stats.pruning_method = args.pruning_method
            pruned_stats.sparsity_rate = target_sparsity
            pruned_stats.compute_parameters(pruned_model)
            logging.info(f"Pruned Parameters: {pruned_stats.parameters}")
            
            # Apply masks if needed
            if masks:
                attnMask, mlpMask = masks
                maskModel(pruned_model, attnMask=attnMask, mlpMask=mlpMask)
            
            # ================================================================
            # EVALUATE PRUNED MODEL
            # ================================================================
            if args.evaluate_all or args.evaluate_perplexity:
                ppl = evaluate_perplexity(pruned_model, eval_input_ids, seq_len=2048)
                pruned_stats.add_metric('perplexity', ppl)
            
            if args.evaluate_all or args.evaluate_inference:
                first_calibration_sample = calibration_dataset[0]
                evaluate_inference_time(pruned_model, first_calibration_sample)
            
            if args.evaluate_all or args.evaluate_downstream:
                evaluation_downstream(pruned_model, model_path)
            
            # ================================================================
            # SAVE MODELS
            # ================================================================
            if args.save_models:
                model_save_path = os.path.join(
                    args.models_dir,
                    f"{model_id}_pruned_{target_sparsity*100:.0f}.pt"
                )
                logging.info(f"Saving pruned model to {model_save_path}")
                torch.save(pruned_model.state_dict(), model_save_path)
                pruned_stats.compute_file_size(model_save_path)
            
            # ================================================================
            # COMPARE MODELS
            # ================================================================
            if args.compare_models:
                comparison = compare_models(baseline_stats, pruned_stats)
                comparison_path = os.path.join(
                    RESULTS_SAVE_DIR,
                    f"comparison_{model_id}_pruned_{target_sparsity*100:.0f}.json"
                )
                logging.info(f"Saving comparison to {comparison_path}")
                with open(comparison_path, 'w') as f:
                    json.dump(comparison, f, indent=2)
            
            # Cleanup
            if masks:
                unmaskModel(pruned_model, attnMask=attnMask, mlpMask=mlpMask)
            
            reset_mlps_shape(pruned_model)
            del pruned_model
            gc.collect()
            torch.cuda.empty_cache()
            
            pruning_results.append(pruned_stats)
        
        # Save all results
        all_results = {
            'baseline': baseline_stats.to_dict(),
            'pruned_models': [stats.to_dict() for stats in pruning_results],
            'dataset': args.dataset,
            'pruning_method': args.pruning_method,
        }
        
        results_path = os.path.join(
            RESULTS_SAVE_DIR,
            f"pruning_results_{model_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        logging.info(f"Saving all results to {results_path}")
        with open(results_path, 'w') as f:
            json.dump(all_results, f, indent=2)
    
    logging.info("\n" + "=" * 70)
    logging.info("WORKFLOW COMPLETED")
    logging.info("=" * 70)


if __name__ == "__main__":
    main()
