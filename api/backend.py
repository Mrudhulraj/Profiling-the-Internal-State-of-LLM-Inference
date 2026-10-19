"""
FastAPI Backend for LLM Pruning with ShortGPT + 2SSP Methods

Features:
- Upload/Select custom datasets
- Model statistics collection
- Perplexity scoring
- Model size comparison
- Inference time testing
- Pruned model evaluation

Run: uvicorn backend:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import torch
import json
import os
import logging
import tempfile
from pathlib import Path
from datetime import datetime
import uuid
import shutil
from transformers import AutoTokenizer

# Import pruning utilities
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.evaluation import evaluate_perplexity
from src.utilities import (
    loadModel, set_seed, printModelStats, 
    maskModel, unmaskModel, reset_mlps_shape
)
from src.dataset import get_calibration, load_wikitext2
from src.pruning import two_stage_2ssp, shortGPT
from src.utilities import compute_intermediate_outputs


# ============================================================================
# CONFIGURATION
# ============================================================================

MODELS_DIR = "api_models"
DATASETS_DIR = "api_datasets"
RESULTS_DIR = "api_results"
UPLOADS_DIR = "api_uploads"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="LLM Pruning Backend",
    description="API for model pruning with ShortGPT and 2SSP methods",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# DATA MODELS
# ============================================================================

class ModelInfo(BaseModel):
    """Model information and statistics."""
    model_id: str
    model_name: str
    parameters_count: int
    main_model_parameters: int
    description: Optional[str] = None


class DatasetInfo(BaseModel):
    """Dataset information."""
    dataset_id: str
    name: str
    size: int
    num_samples: int
    text_length: int
    created_at: str


class PruningConfig(BaseModel):
    """Pruning configuration."""
    model_id: str
    pruning_method: str = Field(..., pattern="^(2ssp|shortgpt)$")
    sparsity_rate: float = Field(..., ge=0.0, le=1.0)
    dataset_id: str
    num_calibration_samples: int = Field(default=32, ge=1, le=256)
    seed: int = Field(default=0)


class ModelStats(BaseModel):
    """Complete model statistics and metrics."""
    model_id: str
    model_type: str  # 'baseline' or 'pruned'
    total_parameters: int
    main_model_parameters: int
    parameter_reduction_percent: Optional[float] = None
    file_size_mb: Optional[float] = None
    metrics: Dict[str, Any] = {}
    pruning_method: Optional[str] = None
    sparsity_rate: Optional[float] = None
    created_at: str


class PruningResult(BaseModel):
    """Result of pruning operation."""
    job_id: str
    model_id: str
    pruning_method: str
    sparsity_rate: float
    status: str  # 'pending', 'running', 'completed', 'failed'
    baseline_stats: Optional[ModelStats] = None
    pruned_stats: Optional[ModelStats] = None
    comparison: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str


class GenerationRequest(BaseModel):
    """Text generation request for a completed pruning job."""
    job_id: str
    prompt: str = Field(..., min_length=1)
    max_new_tokens: int = Field(default=128, ge=1, le=512)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    use_chat_template: bool = True


class GenerationResponse(BaseModel):
    """Generated text response from a pruned model."""
    job_id: str
    model_id: str
    prompt: str
    generated_text: str


class GenerationComparisonResponse(BaseModel):
    """Side-by-side generated text from baseline and pruned models."""
    job_id: str
    model_id: str
    prompt: str
    baseline_generated_text: str
    pruned_generated_text: str


# ============================================================================
# IN-MEMORY JOB TRACKING
# ============================================================================

class JobTracker:
    """Track pruning jobs."""
    def __init__(self):
        self.jobs: Dict[str, PruningResult] = {}
    
    def create_job(self, config: PruningConfig) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = PruningResult(
            job_id=job_id,
            model_id=config.model_id,
            pruning_method=config.pruning_method,
            sparsity_rate=config.sparsity_rate,
            status="pending",
            created_at=datetime.now().isoformat(),
        )
        return job_id
    
    def get_job(self, job_id: str) -> Optional[PruningResult]:
        return self.jobs.get(job_id)
    
    def update_job(self, job_id: str, **kwargs):
        if job_id in self.jobs:
            for key, value in kwargs.items():
                if hasattr(self.jobs[job_id], key):
                    setattr(self.jobs[job_id], key, value)
    
    def list_jobs(self) -> List[PruningResult]:
        return list(self.jobs.values())


job_tracker = JobTracker()
loaded_pruned_models: Dict[str, Dict[str, Any]] = {}
loaded_baseline_models: Dict[str, Dict[str, Any]] = {}


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_model_stats(model, model_id: str, model_type: str = "baseline") -> ModelStats:
    """Calculate model statistics."""
    total_params = sum(p.numel() for p in model.parameters())
    main_params = sum(p.numel() for p in model.model.layers.parameters())
    
    return ModelStats(
        model_id=model_id,
        model_type=model_type,
        total_parameters=total_params,
        main_model_parameters=main_params,
        created_at=datetime.now().isoformat(),
    )


def get_state_dict_file_size_mb(model) -> float:
    """Measure serialized state_dict size without keeping an extra checkpoint."""
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".pt",
            dir=MODELS_DIR,
            delete=False,
        ) as temp_file:
            temp_path = temp_file.name

        torch.save(model.state_dict(), temp_path)
        return os.path.getsize(temp_path) / (1024 ** 2)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def compare_models(baseline_stats: ModelStats, pruned_stats: ModelStats) -> Dict:
    """Compare baseline and pruned models."""
    comparison = {}
    
    # Parameter reduction
    param_reduction = (
        1 - pruned_stats.main_model_parameters / baseline_stats.main_model_parameters
    ) * 100
    comparison['parameter_reduction_percent'] = param_reduction
    
    # Size reduction
    if baseline_stats.file_size_mb is not None and pruned_stats.file_size_mb is not None:
        size_reduction = (
            1 - pruned_stats.file_size_mb / baseline_stats.file_size_mb
        ) * 100
        comparison['size_reduction_percent'] = size_reduction
    
    # Metric comparisons
    if 'perplexity' in baseline_stats.metrics and 'perplexity' in pruned_stats.metrics:
        ppl_increase = (
            (pruned_stats.metrics['perplexity'] / baseline_stats.metrics['perplexity']) - 1
        ) * 100
        comparison['perplexity_increase_percent'] = ppl_increase
    
    if 'inference_time_ms' in baseline_stats.metrics and 'inference_time_ms' in pruned_stats.metrics:
        speedup = baseline_stats.metrics['inference_time_ms'] / pruned_stats.metrics['inference_time_ms']
        comparison['speedup'] = speedup
    
    return comparison


def get_model_input_device(model) -> torch.device:
    """Return the device where prompt tensors should be placed."""
    if hasattr(model, "device"):
        return model.device
    return next(model.parameters()).device


def cache_pruned_model(job_id: str, model, tokenizer, model_id: str):
    """Keep the latest pruned model available for interactive generation."""
    removed_cached_model = False
    for cached_job_id in list(loaded_pruned_models.keys()):
        if cached_job_id != job_id:
            del loaded_pruned_models[cached_job_id]
            removed_cached_model = True

    for cached_job_id in list(loaded_baseline_models.keys()):
        if cached_job_id != job_id:
            del loaded_baseline_models[cached_job_id]
            removed_cached_model = True

    if removed_cached_model:
        torch.cuda.empty_cache()

    model.eval()
    loaded_pruned_models[job_id] = {
        "model": model,
        "tokenizer": tokenizer,
        "model_id": model_id,
        "cached_at": datetime.now().isoformat(),
    }


def get_or_load_baseline_model(job_id: str, model_id: str, tokenizer) -> Dict[str, Any]:
    """Load and cache the original selected model for side-by-side comparison."""
    cached = loaded_baseline_models.get(job_id)
    if cached:
        return cached

    logger.info(f"Loading baseline model for comparison: {model_id}")
    model = loadModel(model_id)
    model.eval()
    loaded_baseline_models[job_id] = {
        "model": model,
        "tokenizer": tokenizer,
        "model_id": model_id,
        "cached_at": datetime.now().isoformat(),
    }
    return loaded_baseline_models[job_id]


def render_generation_prompt(tokenizer, prompt: str, use_chat_template: bool) -> str:
    """Apply a chat template when available, otherwise use the raw prompt."""
    if use_chat_template and getattr(tokenizer, "chat_template", None):
        try:
            return tokenizer.apply_chat_template(
                [{"role": "user", "content": prompt}],
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception as e:
            logger.warning(f"Could not apply chat template, using raw prompt: {e}")

    return prompt


def generate_text(model, tokenizer, prompt: str, request: GenerationRequest) -> str:
    """Generate only the completion text for a prompt."""
    prompt_text = render_generation_prompt(tokenizer, prompt, request.use_chat_template)
    inputs = tokenizer(prompt_text, return_tensors="pt")
    input_device = get_model_input_device(model)
    inputs = {key: value.to(input_device) for key, value in inputs.items()}

    generation_kwargs = {
        "max_new_tokens": request.max_new_tokens,
        "do_sample": request.temperature > 0,
        "eos_token_id": tokenizer.eos_token_id,
        "pad_token_id": (
            tokenizer.pad_token_id
            if tokenizer.pad_token_id is not None
            else tokenizer.eos_token_id
        ),
    }

    if request.temperature > 0:
        generation_kwargs["temperature"] = request.temperature
        generation_kwargs["top_p"] = request.top_p

    with torch.no_grad():
        output_ids = model.generate(**inputs, **generation_kwargs)

    prompt_token_count = inputs["input_ids"].shape[-1]
    generated_ids = output_ids[0][prompt_token_count:]
    return tokenizer.decode(generated_ids, skip_special_tokens=True).strip()


# ============================================================================
# API ENDPOINTS: MODELS
# ============================================================================

@app.get("/api/models/available")
async def get_available_models() -> Dict[str, List[str]]:
    """Get list of available models."""
    return {
        "available_models": [
            "meta-llama/Llama-3.2-3B-Instruct",
            "meta-llama/Llama-3.2-1B-Instruct",
            "meta-llama/Llama-2-7b-hf",
            "meta-llama/Llama-2-13b-hf",
            "meta-llama/Llama-3.1-8B",
        ]
    }


@app.post("/api/models/load")
async def load_model(model_name: str = Query(...)):
    """Load a model and get its statistics."""
    try:
        logger.info(f"Loading model: {model_name}")
        model = loadModel(model_name)
        
        stats = get_model_stats(model, model_name)
        
        # Save model info
        model_info = {
            "model_name": model_name,
            "model_id": model_name.replace("/", "_"),
            "loaded_at": datetime.now().isoformat(),
            "stats": stats.dict(),
        }
        
        with open(os.path.join(RESULTS_DIR, f"model_{model_name.replace('/', '_')}.json"), 'w') as f:
            json.dump(model_info, f, indent=2)
        
        # del model
        # torch.cuda.empty_cache()
        
        return {
            "status": "success",
            "model_name": model_name,
            "stats": stats.dict(),
        }
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# API ENDPOINTS: DATASETS
# ============================================================================

@app.get("/api/datasets/available")
async def get_available_datasets() -> Dict:
    """Get available built-in datasets."""
    return {
        "available_datasets": [
            "wikitext2",
            "custom_upload",
        ]
    }


@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)) -> Dict:
    """Upload custom dataset (JSON or CSV)."""
    try:
        if not file.filename.endswith(('.json', '.csv')):
            raise HTTPException(
                status_code=400,
                detail="File must be JSON or CSV format"
            )
        
        dataset_id = f"dataset_{uuid.uuid4().hex[:8]}"
        file_path = os.path.join(UPLOADS_DIR, f"{dataset_id}_{file.filename}")
        
        # Save uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Parse and validate
        if file.filename.endswith('.json'):
            with open(file_path) as f:
                data = json.load(f)
                if isinstance(data, list):
                    num_samples = len(data)
                    text_length = sum(len(str(item)) for item in data)
                else:
                    num_samples = 1
                    text_length = len(str(data))
        else:  # CSV
            import pandas as pd
            df = pd.read_csv(file_path)
            num_samples = len(df)
            text_length = sum(df['text'].str.len()) if 'text' in df.columns else 0
        
        dataset_info = DatasetInfo(
            dataset_id=dataset_id,
            name=file.filename,
            size=os.path.getsize(file_path),
            num_samples=num_samples,
            text_length=text_length,
            created_at=datetime.now().isoformat(),
        )
        
        logger.info(f"Dataset uploaded: {dataset_id}")
        
        return {
            "status": "success",
            "dataset": dataset_info.dict(),
        }
    except Exception as e:
        logger.error(f"Error uploading dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/list")
async def list_datasets() -> Dict:
    """List all uploaded datasets."""
    datasets = []
    for file in os.listdir(UPLOADS_DIR):
        file_path = os.path.join(UPLOADS_DIR, file)
        if os.path.isfile(file_path):
            datasets.append({
                "filename": file,
                "size_bytes": os.path.getsize(file_path),
                "uploaded_at": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
            })
    
    return {"datasets": datasets}


# ============================================================================
# API ENDPOINTS: MODEL STATISTICS
# ============================================================================

@app.post("/api/stats/compute")
async def compute_model_stats(
    model_name: str = Query(...),
    dataset_id: str = Query("wikitext2"),
    num_samples: int = Query(default=100, ge=10, le=1000),
) -> Dict:
    """Compute comprehensive model statistics."""
    try:
        logger.info(f"Computing stats for {model_name} on {dataset_id}")
        
        set_seed(0)
        model = loadModel(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True, use_fast=False)
        
        # Load dataset
        if dataset_id == "wikitext2":
            dataset = load_wikitext2(local=False)
        else:
            # Load uploaded dataset
            uploaded_file = next(
                (f for f in os.listdir(UPLOADS_DIR) if f.startswith(dataset_id)),
                None
            )
            if not uploaded_file:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            file_path = os.path.join(UPLOADS_DIR, uploaded_file)
            if uploaded_file.endswith('.json'):
                with open(file_path) as f:
                    data = json.load(f)
                    dataset = {"text": data if isinstance(data, list) else [data]}
            else:
                import pandas as pd
                df = pd.read_csv(file_path)
                dataset = {"text": df['text'].tolist()}
        
        # Prepare data
        text = "\n\n".join(dataset["text"][:num_samples])
        input_ids = tokenizer(text, return_tensors="pt", add_special_tokens=False).input_ids
        
        # Compute perplexity
        logger.info("Computing perplexity...")
        perplexity = evaluate_perplexity(model, input_ids, seq_len=2048, enable_tqdm=False)
        
        # Get model stats
        stats = get_model_stats(model, model_name)
        stats.metrics['perplexity'] = perplexity
        
        # Inference time (single forward pass)
        logger.info("Testing inference time...")
        import time
        with torch.no_grad():
            start = time.time()
            _ = model(input_ids[:, :512].to(model.device))
            inference_time = (time.time() - start) * 1000  # ms
        stats.metrics['inference_time_ms'] = inference_time
        
        # Cleanup
        del model, tokenizer
        torch.cuda.empty_cache()
        
        logger.info(f"Stats computation completed")
        
        return {
            "status": "success",
            "model_name": model_name,
            "stats": stats.dict(),
        }
    except Exception as e:
        logger.error(f"Error computing stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# API ENDPOINTS: PRUNING
# ============================================================================

@app.post("/api/pruning/start")
async def start_pruning(
    config: PruningConfig,
    background_tasks: BackgroundTasks,
) -> Dict:
    """Start a pruning job."""
    try:
        job_id = job_tracker.create_job(config)
        logger.info(f"Created pruning job: {job_id}")
        
        # Add background task
        background_tasks.add_task(
            execute_pruning,
            job_id,
            config,
        )
        
        return {
            "status": "success",
            "job_id": job_id,
            "message": "Pruning job started",
        }
    except Exception as e:
        logger.error(f"Error starting pruning: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@torch.no_grad()
def execute_pruning(job_id: str, config: PruningConfig):
    """Execute pruning in background."""
    try:
        job_tracker.update_job(job_id, status="running")
        logger.info(f"Executing pruning job: {job_id}")
        
        set_seed(config.seed)
        
        # Load model
        model = loadModel(config.model_id)
        baseline_stats = get_model_stats(model, config.model_id, "baseline")
        try:
            baseline_stats.file_size_mb = get_state_dict_file_size_mb(model)
        except Exception as e:
            logger.warning(f"Could not measure baseline checkpoint size: {e}")
        
        # Compute perplexity on baseline
        tokenizer = AutoTokenizer.from_pretrained(config.model_id, trust_remote_code=True, use_fast=False)
        dataset = load_wikitext2(local=False)
        text = "\n\n".join(dataset["text"][:100])
        input_ids = tokenizer(text, return_tensors="pt", add_special_tokens=False).input_ids
        
        baseline_ppl = evaluate_perplexity(model, input_ids, seq_len=2048, enable_tqdm=False)
        baseline_stats.metrics['perplexity'] = baseline_ppl
        
        # Prepare calibration data
        calibration_dataset = get_calibration(
            dataset, tokenizer, 
            num_samples=config.num_calibration_samples, 
            seq_len=2048
        )
        
        # Apply pruning
        if config.pruning_method == "2ssp":
            logger.info(f"Applying 2SSP at {config.sparsity_rate*100:.1f}%")
            pruned_model = two_stage_2ssp(model, calibration_dataset, config.sparsity_rate)
        elif config.pruning_method == "shortgpt":
            logger.info(f"Applying ShortGPT at {config.sparsity_rate*100:.1f}%")
            num_blocks = len(model.model.layers)
            target_blocks = int(config.sparsity_rate * num_blocks)
            attnMask, mlpMask = shortGPT(model, target_blocks, calibration_dataset)
            maskModel(pruned_model := model, attnMask=attnMask, mlpMask=mlpMask)
        else:
            raise ValueError(f"Unsupported pruning method: {config.pruning_method}")
        
        # Evaluate pruned model
        pruned_ppl = evaluate_perplexity(pruned_model, input_ids, seq_len=2048, enable_tqdm=False)
        pruned_stats = get_model_stats(pruned_model, config.model_id, "pruned")
        pruned_stats.metrics['perplexity'] = pruned_ppl
        pruned_stats.pruning_method = config.pruning_method
        pruned_stats.sparsity_rate = config.sparsity_rate

        # Save pruned model
        model_path = os.path.join(MODELS_DIR, f"{job_id}_pruned.pt")
        torch.save(pruned_model.state_dict(), model_path)
        pruned_stats.file_size_mb = os.path.getsize(model_path) / (1024 ** 2)

        # Compare after file sizes are populated so size reduction is accurate.
        comparison = compare_models(baseline_stats, pruned_stats)
        
        # Update job
        job_tracker.update_job(
            job_id,
            status="completed",
            baseline_stats=baseline_stats,
            pruned_stats=pruned_stats,
            comparison=comparison,
        )
        cache_pruned_model(job_id, pruned_model, tokenizer, config.model_id)
        
        logger.info(f"Pruning job completed: {job_id}")
        
        # Cleanup
        if model is not pruned_model:
            del model
        torch.cuda.empty_cache()
        
    except Exception as e:
        logger.error(f"Error in pruning job {job_id}: {str(e)}")
        job_tracker.update_job(
            job_id,
            status="failed",
            error=str(e),
        )


@app.get("/api/pruning/job/{job_id}")
async def get_pruning_job(job_id: str) -> Dict:
    """Get status of a pruning job."""
    job = job_tracker.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job": job.dict(),
    }


@app.get("/api/pruning/jobs")
async def list_pruning_jobs() -> Dict:
    """List all pruning jobs."""
    jobs = job_tracker.list_jobs()
    return {
        "jobs": [job.dict() for job in jobs],
        "total": len(jobs),
    }


# ============================================================================
# API ENDPOINTS: INFERENCE
# ============================================================================

@app.post("/api/inference/generate", response_model=GenerationResponse)
async def generate_with_pruned_model(request: GenerationRequest):
    """Generate text with the pruned model produced by a completed job."""
    job = job_tracker.get_job(request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=409, detail="Pruning job is not completed yet")

    cached = loaded_pruned_models.get(request.job_id)
    if not cached:
        raise HTTPException(
            status_code=404,
            detail=(
                "Pruned model is not loaded in backend memory. "
                "Rerun pruning or restart from a job that has just completed."
            ),
        )

    model = cached["model"]
    tokenizer = cached["tokenizer"]
    prompt = request.prompt.strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        generated_text = generate_text(model, tokenizer, prompt, request)

        return GenerationResponse(
            job_id=request.job_id,
            model_id=cached["model_id"],
            prompt=prompt,
            generated_text=generated_text,
        )
    except Exception as e:
        logger.error(f"Error generating from pruned model {request.job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/inference/compare", response_model=GenerationComparisonResponse)
async def compare_baseline_and_pruned_models(request: GenerationRequest):
    """Generate side-by-side responses from the selected baseline and pruned model."""
    job = job_tracker.get_job(request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=409, detail="Pruning job is not completed yet")

    pruned_cached = loaded_pruned_models.get(request.job_id)
    if not pruned_cached:
        raise HTTPException(
            status_code=404,
            detail=(
                "Pruned model is not loaded in backend memory. "
                "Rerun pruning or restart from a job that has just completed."
            ),
        )

    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        baseline_cached = get_or_load_baseline_model(
            request.job_id,
            job.model_id,
            pruned_cached["tokenizer"],
        )
    except Exception as e:
        logger.error(f"Error loading baseline model for {request.job_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not load baseline model for comparison: {str(e)}",
        )

    try:
        baseline_generated_text = generate_text(
            baseline_cached["model"],
            baseline_cached["tokenizer"],
            prompt,
            request,
        )
        pruned_generated_text = generate_text(
            pruned_cached["model"],
            pruned_cached["tokenizer"],
            prompt,
            request,
        )

        return GenerationComparisonResponse(
            job_id=request.job_id,
            model_id=job.model_id,
            prompt=prompt,
            baseline_generated_text=baseline_generated_text,
            pruned_generated_text=pruned_generated_text,
        )
    except Exception as e:
        logger.error(f"Error comparing model generations {request.job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/inference/unload/{job_id}")
async def unload_pruned_model(job_id: str) -> Dict:
    """Unload a cached pruned model from memory."""
    removed_model = False
    if job_id in loaded_pruned_models:
        del loaded_pruned_models[job_id]
        removed_model = True

    if job_id in loaded_baseline_models:
        del loaded_baseline_models[job_id]
        removed_model = True

    if not removed_model:
        raise HTTPException(status_code=404, detail="Pruned model is not loaded")

    torch.cuda.empty_cache()

    return {
        "status": "success",
        "message": f"Unloaded cached models for job {job_id}",
    }


# ============================================================================
# API ENDPOINTS: RESULTS
# ============================================================================

@app.get("/api/results/download/{job_id}")
async def download_pruned_model(job_id: str):
    """Download pruned model."""
    model_path = os.path.join(MODELS_DIR, f"{job_id}_pruned.pt")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model not found")
    
    return FileResponse(model_path, filename=f"{job_id}_pruned.pt")


@app.get("/api/results/export/{job_id}")
async def export_results(job_id: str):
    """Export pruning results as JSON."""
    job = job_tracker.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return FileResponse(
        filename=f"{job_id}_results.json",
        media_type="application/json",
    )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check() -> Dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/")
async def root() -> Dict:
    """Root endpoint with API documentation."""
    return {
        "name": "LLM Pruning Backend",
        "version": "1.0.0",
        "description": "FastAPI backend for LLM pruning with ShortGPT and 2SSP",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
        "endpoints": {
            "models": "/api/models/available",
            "datasets": "/api/datasets/available",
            "health": "/health",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
