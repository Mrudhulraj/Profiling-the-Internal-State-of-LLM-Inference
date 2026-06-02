# FastAPI Backend for LLM Pruning

## Overview

This FastAPI backend provides a comprehensive REST API for LLM model pruning using **ShortGPT** and **2SSP** methods. It supports:

- Model loading and statistics collection
- Custom dataset upload and management
- Perplexity scoring and inference time measurement
- Background pruning jobs with real-time status tracking
- Model comparison and result export

## Setup

### 1. Install Dependencies

```bash
cd /path/to/api
pip install -r requirements_backend.txt
```

### 2. Run the Backend

```bash
# Development mode with auto-reload
uvicorn backend:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn backend:app --host 0.0.0.0 --port 8000 --workers 1
```

### 3. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## API Endpoints

### Health & Info

#### GET `/`
Root endpoint with API information.

**Response:**
```json
{
  "name": "LLM Pruning Backend",
  "version": "1.0.0",
  "docs_url": "/docs"
}
```

#### GET `/health`
Health check with GPU availability.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "gpu_available": true,
  "gpu_name": "NVIDIA A100"
}
```

---

### Model Management

#### GET `/api/models/available`
Get list of supported models.

**Response:**
```json
{
  "available_models": [
    "meta-llama/Llama-2-7b-hf",
    "mistralai/Mistral-7B-v0.3",
    "microsoft/Phi-3-medium-128k-instruct",
    "Qwen/Qwen2.5-7B"
  ]
}
```

#### POST `/api/models/load`
Load a model and compute initial statistics.

**Query Parameters:**
- `model_name` (string, required): Model identifier

**Example:**
```bash
curl -X POST "http://localhost:8000/api/models/load?model_name=meta-llama/Llama-2-7b-hf"
```

**Response:**
```json
{
  "status": "success",
  "model_name": "meta-llama/Llama-2-7b-hf",
  "stats": {
    "model_id": "meta-llama/Llama-2-7b-hf",
    "model_type": "baseline",
    "total_parameters": 6738415616,
    "main_model_parameters": 6711558144,
    "created_at": "2024-01-15T10:30:00"
  }
}
```

---

### Dataset Management

#### GET `/api/datasets/available`
Get available datasets.

**Response:**
```json
{
  "available_datasets": [
    "wikitext2",
    "custom_upload"
  ]
}
```

#### POST `/api/datasets/upload`
Upload a custom dataset (JSON or CSV).

**Request:**
- `file` (FormData, required): JSON or CSV file with `text` field

**Example (using curl):**
```bash
curl -X POST "http://localhost:8000/api/datasets/upload" \
  -F "file=@my_dataset.json"
```

**Example (using Python):**
```python
import requests

with open("my_dataset.json", "rb") as f:
    files = {"file": f}
    response = requests.post(
        "http://localhost:8000/api/datasets/upload",
        files=files
    )
print(response.json())
```

**Response:**
```json
{
  "status": "success",
  "dataset": {
    "dataset_id": "dataset_a1b2c3d4",
    "name": "my_dataset.json",
    "size": 102400,
    "num_samples": 1000,
    "text_length": 5234890,
    "created_at": "2024-01-15T10:30:00"
  }
}
```

#### GET `/api/datasets/list`
List all uploaded datasets.

**Response:**
```json
{
  "datasets": [
    {
      "filename": "dataset_a1b2c3d4_my_data.json",
      "size_bytes": 102400,
      "uploaded_at": "2024-01-15T10:30:00"
    }
  ]
}
```

---

### Model Statistics

#### POST `/api/stats/compute`
Compute comprehensive model statistics (perplexity, inference time, etc.).

**Query Parameters:**
- `model_name` (string, required): Model identifier
- `dataset_id` (string, default: "wikitext2"): Dataset identifier
- `num_samples` (integer, default: 100): Number of samples to use (10-1000)

**Example:**
```bash
curl -X POST "http://localhost:8000/api/stats/compute?model_name=meta-llama/Llama-2-7b-hf&dataset_id=wikitext2&num_samples=100"
```

**Response:**
```json
{
  "status": "success",
  "model_name": "meta-llama/Llama-2-7b-hf",
  "stats": {
    "model_id": "meta-llama/Llama-2-7b-hf",
    "model_type": "baseline",
    "total_parameters": 6738415616,
    "main_model_parameters": 6711558144,
    "metrics": {
      "perplexity": 15.234,
      "inference_time_ms": 2450.5
    },
    "created_at": "2024-01-15T10:30:00"
  }
}
```

---

### Pruning Operations

#### POST `/api/pruning/start`
Start a pruning job (runs in background).

**Request Body:**
```json
{
  "model_id": "meta-llama/Llama-2-7b-hf",
  "pruning_method": "2ssp",
  "sparsity_rate": 0.5,
  "dataset_id": "wikitext2",
  "num_calibration_samples": 32,
  "seed": 0
}
```

**Fields:**
- `model_id` (string, required): Model identifier
- `pruning_method` (string, required): "2ssp" or "shortgpt"
- `sparsity_rate` (number, required): 0.0 to 1.0
- `dataset_id` (string, required): Dataset identifier
- `num_calibration_samples` (integer, default: 32): 1-256
- `seed` (integer, default: 0): Reproducibility seed

**Example (Python):**
```python
import requests

config = {
    "model_id": "meta-llama/Llama-2-7b-hf",
    "pruning_method": "2ssp",
    "sparsity_rate": 0.5,
    "dataset_id": "wikitext2",
    "num_calibration_samples": 32
}

response = requests.post(
    "http://localhost:8000/api/pruning/start",
    json=config
)
job = response.json()
print(f"Job ID: {job['job_id']}")
```

**Response:**
```json
{
  "status": "success",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Pruning job started"
}
```

#### GET `/api/pruning/job/{job_id}`
Get status of a specific pruning job.

**Example:**
```bash
curl "http://localhost:8000/api/pruning/job/550e8400-e29b-41d4-a716-446655440000"
```

**Response (Pending):**
```json
{
  "job": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "model_id": "meta-llama/Llama-2-7b-hf",
    "pruning_method": "2ssp",
    "sparsity_rate": 0.5,
    "status": "running",
    "created_at": "2024-01-15T10:30:00"
  }
}
```

**Response (Completed):**
```json
{
  "job": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "model_id": "meta-llama/Llama-2-7b-hf",
    "pruning_method": "2ssp",
    "sparsity_rate": 0.5,
    "status": "completed",
    "baseline_stats": {
      "model_id": "meta-llama/Llama-2-7b-hf",
      "model_type": "baseline",
      "total_parameters": 6738415616,
      "main_model_parameters": 6711558144,
      "metrics": {
        "perplexity": 15.234
      }
    },
    "pruned_stats": {
      "model_id": "meta-llama/Llama-2-7b-hf",
      "model_type": "pruned",
      "total_parameters": 3369207808,
      "main_model_parameters": 3355779072,
      "parameter_reduction_percent": 50.0,
      "metrics": {
        "perplexity": 16.842
      },
      "pruning_method": "2ssp",
      "sparsity_rate": 0.5
    },
    "comparison": {
      "parameter_reduction_percent": 50.0,
      "perplexity_increase_percent": 10.5,
      "speedup": 1.8
    },
    "created_at": "2024-01-15T10:30:00"
  }
}
```

#### GET `/api/pruning/jobs`
List all pruning jobs with their statuses.

**Response:**
```json
{
  "jobs": [
    {
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "model_id": "meta-llama/Llama-2-7b-hf",
      "status": "completed"
    }
  ],
  "total": 1
}
```

---

### Results & Export

#### GET `/api/results/download/{job_id}`
Download the pruned model.

**Example:**
```bash
curl "http://localhost:8000/api/results/download/550e8400-e29b-41d4-a716-446655440000" \
  -o pruned_model.pt
```

#### GET `/api/results/export/{job_id}`
Export pruning results as JSON.

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "baseline_stats": {...},
  "pruned_stats": {...},
  "comparison": {...}
}
```

---

## Workflow Examples

### Example 1: Complete Pruning Pipeline

```python
import requests
import time

BASE_URL = "http://localhost:8000"

# 1. Check health
health = requests.get(f"{BASE_URL}/health").json()
print(f"GPU Available: {health['gpu_available']}")

# 2. Get available models
models = requests.get(f"{BASE_URL}/api/models/available").json()
print(f"Available models: {models['available_models']}")

# 3. Load a model
response = requests.post(
    f"{BASE_URL}/api/models/load",
    params={"model_name": "meta-llama/Llama-2-7b-hf"}
)
print(f"Model loaded: {response.json()['stats']['total_parameters']} parameters")

# 4. Compute baseline statistics
stats = requests.post(
    f"{BASE_URL}/api/stats/compute",
    params={
        "model_name": "meta-llama/Llama-2-7b-hf",
        "dataset_id": "wikitext2",
        "num_samples": 100
    }
).json()
print(f"Baseline Perplexity: {stats['stats']['metrics']['perplexity']}")

# 5. Start pruning job
config = {
    "model_id": "meta-llama/Llama-2-7b-hf",
    "pruning_method": "2ssp",
    "sparsity_rate": 0.5,
    "dataset_id": "wikitext2"
}
job = requests.post(f"{BASE_URL}/api/pruning/start", json=config).json()
job_id = job['job_id']
print(f"Pruning started: {job_id}")

# 6. Poll for completion
while True:
    job_status = requests.get(f"{BASE_URL}/api/pruning/job/{job_id}").json()
    status = job_status['job']['status']
    print(f"Job status: {status}")
    
    if status == "completed":
        comparison = job_status['job']['comparison']
        print(f"Parameter reduction: {comparison['parameter_reduction_percent']:.1f}%")
        print(f"Perplexity increase: {comparison['perplexity_increase_percent']:.1f}%")
        break
    elif status == "failed":
        print(f"Error: {job_status['job']['error']}")
        break
    
    time.sleep(5)

# 7. Download pruned model
model_response = requests.get(f"{BASE_URL}/api/results/download/{job_id}")
with open("pruned_model.pt", "wb") as f:
    f.write(model_response.content)
print("Pruned model downloaded")
```

### Example 2: Upload Custom Dataset and Prune

```python
import requests

BASE_URL = "http://localhost:8000"

# 1. Upload custom dataset
with open("my_dataset.json", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/api/datasets/upload",
        files={"file": f}
    )
dataset_info = response.json()['dataset']
dataset_id = dataset_info['dataset_id']
print(f"Dataset uploaded: {dataset_id}")
print(f"Samples: {dataset_info['num_samples']}")

# 2. Start pruning with custom dataset
config = {
    "model_id": "meta-llama/Llama-2-7b-hf",
    "pruning_method": "shortgpt",
    "sparsity_rate": 0.375,
    "dataset_id": dataset_id  # Use uploaded dataset
}
job = requests.post(f"{BASE_URL}/api/pruning/start", json=config).json()
print(f"Pruning job: {job['job_id']}")
```

---

## Configuration

### Environment Variables

```bash
export HF_TOKEN="your_huggingface_token"  # For model access
export CUDA_VISIBLE_DEVICES="0"            # GPU selection
```

### Directory Structure

```
api/
├── backend.py                  # Main FastAPI application
├── requirements_backend.txt    # Dependencies
├── api_models/                 # Saved pruned models
├── api_datasets/               # Cached datasets
├── api_uploads/                # Uploaded custom datasets
├── api_results/                # Results and statistics
└── README.md                   # This file
```

---

## Performance Considerations

### Memory Usage
- **Baseline Model Loading**: ~14GB for 7B parameter model
- **Pruning (2SSP)**: ~16GB total (model + calibration data + intermediate states)
- **Pruning (ShortGPT)**: ~14GB total

### Execution Time
- **Model Loading**: 2-3 minutes
- **Baseline Stats**: 5-10 minutes
- **2SSP Pruning**: 30-45 minutes (32 calibration samples)
- **ShortGPT Pruning**: 20-30 minutes (256 calibration samples)

### GPU Recommendation
- **Minimum**: NVIDIA A10 (24GB)
- **Recommended**: NVIDIA A100 (40GB) or V100 (32GB)

---

## Error Handling

All endpoints return proper HTTP status codes:

- **200**: Success
- **400**: Bad request (invalid parameters)
- **404**: Not found (model, dataset, or job)
- **500**: Server error

**Error Response Format:**
```json
{
  "detail": "Error message explaining what went wrong"
}
```

---

## Monitoring & Logging

The backend logs all operations to console. Enable detailed logging:

```bash
# Set logging level
export LOG_LEVEL=DEBUG
uvicorn backend:app --log-level debug
```

---

## Troubleshooting

### Out of Memory (OOM)
- Reduce batch size or calibration samples
- Use a smaller model variant

### Slow Performance
- Check GPU utilization: `nvidia-smi`
- Consider using mixed precision training

### Module Import Errors
- Ensure all dependencies in `requirements_backend.txt` are installed
- Verify `src/` directory is accessible from `api/` directory

---

## Future Enhancements

- [ ] Support for more pruning methods (window_based, blockpruner, evopress)
- [ ] Batch job processing
- [ ] Model fine-tuning after pruning
- [ ] WebSocket support for real-time job monitoring
- [ ] Database persistence for job history
- [ ] Docker containerization
- [ ] Multi-GPU support

---

## License

Same as parent project (refer to main README)

## Support

For issues, questions, or contributions, please refer to the main project repository.
