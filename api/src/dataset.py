from datasets import Dataset, load_dataset, load_from_disk
import random
import logging

def load_addition(train=True, n=200, seed=None):
    if seed is None:
        seed = 42 if train else 2026

    rng = random.Random(seed)

    examples = []

    for _ in range(n):
        a = rng.randint(100, 999)
        b = rng.randint(100, 999)

        prompt = f"What is {a}+{b}? Answer with just the number."
        answer = str(a + b)

        examples.append({
            "prompt": prompt,
            "answer": answer,
            "text": f"{prompt} {answer}",
        })

    return Dataset.from_list(examples)

def load_wikitext2(local=False):
  if local:
    dataset = load_from_disk("data/wikitext-2")
  else:
    try:
      dataset = load_dataset("wikitext", "wikitext-2-raw-v1", split="test")
    except:
      logging.error(
        "Unable to download Wikitext-2 dataset from huggingface. Falling back to local version"
      )
      dataset = load_from_disk("data/wikitext-2")

  return dataset


def load_c4(train, local=False):
  if train:
    if local:
      dataset = load_from_disk("data/c4_train")
    else:
      try:
        dataset = load_dataset(
          "allenai/c4",
          "default",
          data_files={"train": "en/c4-train.00000-of-01024.json.gz"},
          split="train[:1000]",
          revision="607bd4c8450a42878aa9ddc051a65a055450ef87",
        )
      except:
        logging.error(
          "Unable to download C4 dataset from huggingface. Falling back to local version"
        )
        dataset = load_from_disk("data/c4_train")
  else:
    if local:
      dataset = load_from_disk("data/c4_val")
    else:
      try:
        dataset = load_dataset(
          "allenai/c4",
          "default",
          data_files={"validation": "en/c4-validation.00000-of-00008.json.gz"},
          split="validation[:1100]",
          revision="607bd4c8450a42878aa9ddc051a65a055450ef87",
        )
      except:
        logging.error(
          "Unable to download C4 dataset from huggingface. Falling back to local version"
        )
        dataset = load_from_disk("data/c4_val")

  return dataset


def load_fineweb_edu(local=False):
  if local:
    dataset = load_from_disk("data/fineweb-edu")
  else:
    try:
      dataset = load_dataset(
        "HuggingFaceFW/fineweb-edu",
        "sample-10BT",
        split="train[:1100]",
        data_files=["sample/10BT/000_00000.parquet"],
      )
    except:
      logging.error(
        "Unable to download fineweb-edu dataset from huggingface. Falling back to local version"
      )
      dataset = load_from_disk("data/fineweb-edu")

  return dataset


def get_calibration(dataset, tokenizer, num_samples=32, seq_len=2048):
  """
  Prepare calibration dataset by tokenizing text sequences.
  
  Args:
    dataset: HuggingFace dataset object or dict with 'text' key
    tokenizer: Tokenizer to use for encoding
    num_samples: Number of samples to use for calibration
    seq_len: Maximum sequence length
    
  Returns:
    List of tokenized input_ids tensors
  """
  import torch
  
  calibration_data = []
  
  # Handle different dataset formats
  if isinstance(dataset, dict):
    # Dict format with 'text' key
    texts = dataset.get('text', [])
    if not isinstance(texts, list):
      texts = [texts]
  elif hasattr(dataset, 'column_names'):
    # HuggingFace dataset format
    if "text" in dataset.column_names:
      text_column = "text"
    elif "content" in dataset.column_names:
      text_column = "content"
    else:
      text_column = dataset.column_names[0]
    
    texts = [dataset[idx][text_column] for idx in range(min(num_samples, len(dataset)))]
  else:
    raise ValueError("Unsupported dataset format")
  
  # Tokenize samples
  for text in texts[:num_samples]:
    if not text:
      continue
      
    encoded = tokenizer(
      text,
      return_tensors="pt",
      truncation=True,
      max_length=seq_len,
      add_special_tokens=False
    )
    
    if encoded.input_ids.shape[1] > 0:
      calibration_data.append(encoded.input_ids)
  
  return calibration_data
