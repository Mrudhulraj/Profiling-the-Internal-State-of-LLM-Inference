import argparse
import gc
import logging
import math
import time
import torch
from transformers import AutoTokenizer
import os
from src.evaluation import *
from src.utilities import *
from src.dataset import *
from src.pruning import *
from src.evopress import *
from src.slicegpt import *
from src.ablations import *


def parse_args():
  parser = argparse.ArgumentParser(description="Pruning of transformer models")
  parser.add_argument('--model', type=str, required=True, help="Specify the model's name or path to be pruned")
  parser.add_argument('--seed', type=int, default=0, help="Set a seed for reproducibility (default: 0)")
  parser.add_argument('--cache_dir', type=str, required=False, help="Path to a directory in which a downloaded pretrained model should be cached. This option is not supported when --pruning_method=slicegpt")

  parser.add_argument(
    '--dense', 
    help="Load the original dense model without pruning", 
    action='store_true'
  )

  parser.add_argument(
    '--pruning_method', 
    type=str, 
    choices=['2ssp', 'window_based', 'shortgpt', 'blockpruner', 'evopress', 'slicegpt'],
    help="Specify the pruning method to apply"
  )
  parser.add_argument(
    '--sparsity_rate', 
    type=float, 
    help="A floating-point value ranging from 0.0 to 1.0 that determines the target sparsity level for pruning. If set to -1, pruning is performed at all sparsity levels from 0.0 to 1.0 with a step size of 1/N. A value of -2 applies pruning at predefined sparsity levels of 25%%, 37.5%%, and 50%%.)"
  )

  parser.add_argument('--main_table_results', help="Generate results for the main results table in the paper (Table 1)", action='store_true')
  parser.add_argument('--evaluate_inference', help="Measure the model's inference time", action='store_true')
  parser.add_argument('--evaluate_downstream', help="Perform downstream task evaluation at 37.5%% sparsity", action='store_true')
  parser.add_argument('--evaluate_perplexity', help="Evaluates perplexity on Wikitext2 only", action='store_true')
  parser.add_argument('--evaluate_qualitative', help="Qualitative results", action='store_true')

  parser.add_argument('--local_datasets', help="Use local datasets stored in the './data/' folder", action='store_true')
  parser.add_argument(
    '--ablation', 
    action='store_true',
    help="Run the ablation study experiments"
  )
  parser.add_argument(
        '--logging',
        type=str,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default='INFO',
        help="Set the logging level (default: INFO)"
    )

  return parser.parse_args()


# ---------------------------------------------------------------------------
# Summary helpers
# ---------------------------------------------------------------------------

def _count_params(model):
  """Return (total_params, main_layer_params) for a model."""
  total = sum(p.numel() for p in model.parameters())
  main  = sum(p.numel() for p in model.model.layers.parameters())
  return total, main


def _measure_inference_ms(model, sample, n_warmup=5, n_runs=10):
  """Return average inference latency in milliseconds over n_runs."""
  sample = sample.to("cuda")
  for _ in range(n_warmup):
    _ = model(sample)
  times = []
  for _ in range(n_runs):
    start = torch.cuda.Event(enable_timing=True)
    end   = torch.cuda.Event(enable_timing=True)
    torch.cuda.synchronize()
    start.record()
    _ = model(sample)
    end.record()
    torch.cuda.synchronize()
    times.append(start.elapsed_time(end))
  return sum(times) / n_runs


def print_summary_table(before: dict, after: dict | None = None):
  """
  Print a clean before/after comparison table to the log.

  `before` and `after` are dicts with keys:
    label         – e.g. "Dense" / "Pruned (2ssp @ 50%)"
    total_params  – int
    main_params   – int
    ppl           – float | None
    inference_ms  – float | None
  """
  rows = [before] if after is None else [before, after]

  # Column widths
  col_label  = max(len(r["label"]) for r in rows) + 2
  col_label  = max(col_label, 14)

  header = (
    f"{'Model':<{col_label}} "
    f"{'Total Params':>14} "
    f"{'Main Params':>13} "
    f"{'Reduction':>11} "
    f"{'Perplexity':>12} "
    f"{'Inference (ms)':>16}"
  )
  sep = "-" * len(header)

  logging.info("")
  logging.info("=" * len(header))
  logging.info("  RESULTS SUMMARY")
  logging.info("=" * len(header))
  logging.info(header)
  logging.info(sep)

  base_params = rows[0]["total_params"]

  for r in rows:
    reduction = 0.0 if r["total_params"] == base_params else \
                100.0 * (1 - r["total_params"] / base_params)
    ppl_str  = f"{r['ppl']:.4f}"        if r.get("ppl")          is not None else "  —"
    inf_str  = f"{r['inference_ms']:.2f}" if r.get("inference_ms") is not None else "  —"
    red_str  = f"{reduction:.1f}%"

    logging.info(
      f"{r['label']:<{col_label}} "
      f"{r['total_params']:>14,} "
      f"{r['main_params']:>13,} "
      f"{red_str:>11} "
      f"{ppl_str:>12} "
      f"{inf_str:>16}"
    )

  logging.info("=" * len(header))
  logging.info("")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

@torch.no_grad()
def main():
  args = parse_args()
  logging_level = getattr(logging, args.logging.upper())
  logging.basicConfig(
      level=logging_level,
      format='%(asctime)s - %(levelname)s - %(message)s',
      datefmt='%H:%M:%S'
  )
  
  set_seed(args.seed)
  os.environ["HF_TOKEN"] = os.environ.get("HF_TOKEN")
  logging.info("Loading the environment variable",os.environ["HF_TOKEN"])
  # Load the tokenizer
  logging.info("Loading the tokenizer")
  tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True, use_fast=False)
  logging.info("Loaded the tokenizer")

  ###################### Datasets 
  logging.info("Loading the Datasets")
   
  dataset_wikitext    = load_wikitext2(args.local_datasets)
  dataset_c4_val      = load_c4(train=False, local=args.local_datasets)
  dataset_fineweb_edu = load_fineweb_edu(local=args.local_datasets)[:500]
  dataset_c4_train    = load_c4(train=True,  local=args.local_datasets)
  logging.info("Loaded the Datasets")

  logging.info("Tokenizing the Datasets")
  wikitext_input_ids      = tokenizer("\n\n".join(dataset_wikitext["text"]),    return_tensors="pt", add_special_tokens=False).input_ids
  c4_val_input_ids        = tokenizer("\n\n".join(dataset_c4_val["text"]),      return_tensors="pt", add_special_tokens=False).input_ids
  fineweb_edu_input_ids   = tokenizer("\n\n".join(dataset_fineweb_edu["text"]), return_tensors="pt", add_special_tokens=False).input_ids
  logging.info("Tokenized the datasets")

  # Calibration datasets
  num_calibration_samples_2ssp = 32
  num_calibration_samples      = 256   # For SliceGPT, ShortGPT and Window Based

  calibration_dataset      = get_calibration(dataset_c4_train, tokenizer, num_samples=num_calibration_samples, seq_len=2048)
  calibration_dataset_2ssp = calibration_dataset[:num_calibration_samples_2ssp]
  first_calibration_sample = calibration_dataset[0]
  

  ###################### Dense model
  if args.dense:

    logging.info("Dense model evaluation")
    logging.info("Loading the model")    
    model = loadModel(args.model, args.cache_dir)
    logging.debug(model)
    printModelStats(model, "Dense model")

    # Collect before-stats for the summary table
    before_total, before_main = _count_params(model)
    before_stats = {
      "label":        "Dense (original)",
      "total_params": before_total,
      "main_params":  before_main,
      "ppl":          None,
      "inference_ms": None,
    }
    
    if args.evaluate_inference:
      before_stats["inference_ms"] = _measure_inference_ms(model, first_calibration_sample)
      logging.info(f"[Dense] Average inference time: {before_stats['inference_ms']:.2f} ms")

    if args.evaluate_downstream:
      evaluation_downstream(model, args.model)

    if args.main_table_results:
      evaluation_ppl(model, wikitext_input_ids, c4_val_input_ids, fineweb_edu_input_ids)
    
    if args.evaluate_perplexity:
      before_stats["ppl"] = evaluate_perplexity(model, wikitext_input_ids, seq_len=2048)
      logging.info(f"[Dense] Perplexity (wikitext2): {before_stats['ppl']}")

    if args.evaluate_qualitative:
      qualitative_results(model, tokenizer, max_length=128)

    # Print dense-only summary (no "after" yet)
    print_summary_table(before_stats)
    

  ###################### Pruning

  pruning_method = args.pruning_method
  if pruning_method is not None:

    sparsity_rate = args.sparsity_rate

    # Guard: sparsity_rate is required when a pruning method is chosen
    if sparsity_rate is None:
      logging.error(
        "--sparsity_rate is required when --pruning_method is set. "
        "Example: --sparsity_rate=0.5  (valid range: 0.0–1.0, or -2 for 25/37.5/50%%)"
      )
      exit(1)

    logging.info("Loading the model")
    model = loadModel(args.model, args.cache_dir)
    num_blocks = len(model.model.layers)
    logging.debug(model)

    # Collect dense baseline stats for summary (re-measure if --dense already did it)
    before_total, before_main = _count_params(model)
    dense_ppl = None
    dense_inf = None

    if args.evaluate_perplexity:
      logging.info("Measuring dense baseline perplexity for summary table …")
      dense_ppl = evaluate_perplexity(model, wikitext_input_ids, seq_len=2048)
      logging.info(f"[Dense baseline] Perplexity (wikitext2): {dense_ppl}")

    if args.evaluate_inference:
      dense_inf = _measure_inference_ms(model, first_calibration_sample)
      logging.info(f"[Dense baseline] Average inference time: {dense_inf:.2f} ms")

    before_stats = {
      "label":        "Dense (original)",
      "total_params": before_total,
      "main_params":  before_main,
      "ppl":          dense_ppl,
      "inference_ms": dense_inf,
    }

    if pruning_method == "slicegpt":
      del model
      gc.collect()
      torch.cuda.empty_cache()
      

    if int(round(sparsity_rate)) == -1:    # prune all possible blocks
      pruning_rates = [i / num_blocks for i in range(1, num_blocks - 1)]
    elif int(round(sparsity_rate)) == -2:  # prune at 25%, 37.5%, 50%
      pruning_rates = [0.25, 0.375, 0.5]
    else:                                   # single sparsity rate
      pruning_rates = [sparsity_rate]

    for target_sparsity in pruning_rates:

      set_seed(args.seed)

      start_time = time.time()

      if pruning_method in ["window_based", "shortgpt", "blockpruner", "evopress"]:
        target_sparsity_blocks = target_sparsity * num_blocks
        if not target_sparsity_blocks.is_integer():
          logging.warning(f"Invalid sparsity rate for {pruning_method}: must be a multiple of 1/{num_blocks} since model has {num_blocks} blocks.")
          target_sparsity_blocks = int(math.ceil(target_sparsity_blocks)) 
          logging.warning(f"Rounding to next valid sparsity rate: {target_sparsity_blocks/num_blocks:.6f} ({int(target_sparsity_blocks)} blocks)")
        else:
          target_sparsity_blocks = int(target_sparsity_blocks)
        
        target_sparsity = target_sparsity_blocks / num_blocks

      logging.info(f"Pruning rate {target_sparsity*100:.1f}%  (≈ {target_sparsity * num_blocks:.1f} blocks)")

      attnMask = mlpMask = None
      if pruning_method == "window_based":
        attnMask = mlpMask = window_based(model, target_sparsity_blocks, calibration_dataset)
      elif pruning_method == "shortgpt":
        attnMask, mlpMask = shortGPT(model, target_sparsity_blocks, calibration_dataset)
      elif pruning_method == "blockpruner":
        attnMask, mlpMask = blockpruner(model, target_sparsity_blocks, first_calibration_sample)
      elif pruning_method == "evopress":
        attnMask, mlpMask = evopress(model, target_sparsity_blocks, tokenizer, dataset_c4_train, drop_entire_block=False)
      elif pruning_method == "2ssp":
        result = two_stage_2ssp(model, calibration_dataset_2ssp, target_sparsity)
        if result is False:
          logging.error(f"Pruning failed for sparsity={target_sparsity:.3f} — skipping.")
          continue
        model = result
      elif pruning_method == "slicegpt":
        model = slicegpt(args.model, target_sparsity, calibration_dataset)
      else:
        logging.error("Invalid method provided")
        exit(1)

      end_time = time.time()
      pruning_time = end_time - start_time
      logging.info(f"Pruning Time: {pruning_time:.2f} s")

      printModelStats(model, "Pruned model")

      # ------------------------------------------------------------------
      # Collect after-stats for summary table
      # ------------------------------------------------------------------
      after_total, after_main = _count_params(model)
      after_stats = {
        "label":        f"Pruned ({pruning_method} @ {target_sparsity*100:.1f}%)",
        "total_params": after_total,
        "main_params":  after_main,
        "ppl":          None,
        "inference_ms": None,
      }

      # 2SSP: parameters are physically removed — no masks needed
      if attnMask is None:

        if args.evaluate_inference:
          after_stats["inference_ms"] = _measure_inference_ms(model, first_calibration_sample)
          logging.info(f"[Pruned] Average inference time: {after_stats['inference_ms']:.2f} ms")
        
        if args.evaluate_downstream:
          evaluation_downstream(model, args.model)

        if args.main_table_results:
          evaluation_ppl(model, wikitext_input_ids, c4_val_input_ids, fineweb_edu_input_ids)         
        
        if args.evaluate_perplexity:
          after_stats["ppl"] = evaluate_perplexity(model, wikitext_input_ids, seq_len=2048)
          logging.info(f"[Pruned] Perplexity (wikitext2): {after_stats['ppl']}")

        if args.evaluate_qualitative:
          qualitative_results(model, tokenizer, max_length=128)

        # ── Summary table ──────────────────────────────────────────────
        print_summary_table(before_stats, after_stats)

        reset_mlps_shape(model)
        del model
        gc.collect()
        torch.cuda.empty_cache()
        if pruning_method != "slicegpt":
          model = loadModel(args.model, args.cache_dir)

      else:
        logging.debug(f"Pruned blocks: attn={attnMask} mlp={mlpMask}")
        maskModel(model, attnMask=attnMask, mlpMask=mlpMask)

        if args.evaluate_inference:
          after_stats["inference_ms"] = _measure_inference_ms(model, first_calibration_sample)
          logging.info(f"[Pruned] Average inference time: {after_stats['inference_ms']:.2f} ms")

        if args.evaluate_downstream:
          evaluation_downstream(model, args.model)

        if args.main_table_results:
          evaluation_ppl(model, wikitext_input_ids, c4_val_input_ids, fineweb_edu_input_ids)
        
        if args.evaluate_perplexity:
          after_stats["ppl"] = evaluate_perplexity(model, wikitext_input_ids, seq_len=2048)
          logging.info(f"[Pruned] Perplexity (wikitext2): {after_stats['ppl']}")

        if args.evaluate_qualitative:
          qualitative_results(model, tokenizer, max_length=128)

        # ── Summary table ──────────────────────────────────────────────
        print_summary_table(before_stats, after_stats)
        
        unmaskModel(model, attnMask=attnMask, mlpMask=mlpMask)

  ###################### Ablations
  if args.ablation:
    run_ablations(args, tokenizer, dataset_c4_train, wikitext_input_ids, calibration_dataset_2ssp)
    

if __name__ == "__main__":
  main()