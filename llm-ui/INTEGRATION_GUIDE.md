# LLM Pruning Frontend Integration Guide

## Overview

This guide explains how the frontend UI integrates with the FastAPI backend for LLM model pruning.

## Components Architecture

### 1. **API Service** (`utils/pruningApi.ts`)
The central service for all backend communication.

```
Model Selection → Load Models → Get Available Models
Dataset Selection → Upload/List Datasets → Manage Custom Data
Configuration → Set Parameters → Validate Config
Pruning → Start Job → Poll Status → Get Results
```

### 2. **UI Components**

#### `ModelSelector.tsx`
- Lists available models from the backend
- Allows users to select a model
- Displays model details

**API Calls:**
- `GET /api/models/available` - Fetch available models
- `POST /api/models/load` - Load selected model (optional)

#### `DatasetSelector.tsx`
- Lists built-in datasets
- Allows custom dataset upload (JSON/CSV)
- Displays uploaded datasets

**API Calls:**
- `GET /api/datasets/available` - Fetch built-in datasets
- `POST /api/datasets/upload` - Upload custom dataset
- `GET /api/datasets/list` - List uploaded datasets

#### `PruningConfigPanel.tsx`
- Configures pruning parameters
- Selects pruning method (2SSP or ShortGPT)
- Sets sparsity rate, calibration samples, seed

**Parameters:**
- `pruningMethod`: '2ssp' | 'shortgpt'
- `sparsityRate`: 0.0 - 1.0 (percentage of pruning)
- `numCalibrationSamples`: 1 - 256
- `seed`: for reproducibility

#### `ModelComparison.tsx`
- Displays baseline vs pruned comparison
- Shows metrics: parameter reduction, speedup, etc.
- Displays pruning configuration details

### 3. **Main Page** (`pages/pruning.tsx`)

4-Step workflow:

```
Step 1: Model Selection
   ↓
Step 2: Dataset Selection
   ↓
Step 3: Configuration
   ↓
Step 4: Results (Running → Completed/Failed)
```

## API Integration Flow

### Flow Diagram

```
User Interface          Backend API          Models
   ┌──────────┐         ┌─────────┐         ┌─────┐
   │ Frontend │         │ FastAPI │         │ LLM │
   └──────────┘         └─────────┘         └─────┘
        │                    │                  │
   1. Select Model ────────→ GET /api/models/available
        │                    │
   2. Select Dataset ─────→ GET /api/datasets/available
        │                    │
   3. Upload (optional) ──→ POST /api/datasets/upload
        │                    │
   4. Configure Pruning     (Store config locally)
        │                    │
   5. Start Pruning ───────→ POST /api/pruning/start
        │                    │                  │
        │                    ├─ Load Model ─────→
        │                    │                  │
        │                    ├─ Load Dataset ───→
        │                    │                  │
   6. Poll Status ────────→ GET /api/pruning/job/{job_id}
        │ (Every 2 seconds) │                  │
        │                    ├─ Compute Stats ──→
        │                    │                  │
        │                    ├─ Apply Pruning ──→
        │                    │                  │
   7. Display Results       │                  │
        ├─ Baseline Stats    ├─ Save Model ────→
        ├─ Pruned Stats      │                  │
        ├─ Comparison        │                  │
        │                    │                  │
   8. Export/Download ────→ GET /api/results/{type}/{job_id}
```

## Key Features

### 1. Model Selection
- Displays 4 predefined models
- Shows model path and name
- One-click selection

### 2. Dataset Management
- Built-in datasets (Wikitext2)
- Custom upload (JSON/CSV)
- List uploaded datasets

### 3. Pruning Configuration
- **Method Selection:**
  - 2SSP: Two-Stage Structured Pruning (better quality, slower)
  - ShortGPT: Fast block-based pruning (faster, good quality)

- **Sparsity Rate:** 
  - Range: 10% - 90%
  - Higher = more aggressive pruning

- **Calibration Samples:**
  - Range: 1 - 256
  - More = better quality but slower

### 4. Real-time Monitoring
- Job status polling every 2 seconds
- Progress display
- Error handling

### 5. Results Display
- Baseline vs pruned comparison
- Performance metrics:
  - Parameter reduction %
  - Size reduction %
  - Perplexity increase %
  - Inference speedup
- Download options:
  - Pruned model
  - Results JSON

## Installation & Setup

### 1. Install Dependencies

```bash
cd llm-ui
npm install
# or
yarn install
```

### 2. Update API URL (if needed)

In `config.js` or `.env`:
```javascript
export const BASE_URL = 'http://127.0.0.1:8000'
```

### 3. Start Frontend

```bash
npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Start Backend

```bash
cd ../2SSP
uvicorn backend:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access the Application

Open browser: `http://localhost:3000/pruning`

## API Endpoints Used

### Models
- `GET /api/models/available` - List available models
- `POST /api/models/load` - Load a specific model

### Datasets
- `GET /api/datasets/available` - List built-in datasets
- `POST /api/datasets/upload` - Upload custom dataset
- `GET /api/datasets/list` - List uploaded datasets

### Statistics
- `POST /api/stats/compute` - Compute model statistics

### Pruning
- `POST /api/pruning/start` - Start pruning job
- `GET /api/pruning/job/{job_id}` - Get job status
- `GET /api/pruning/jobs` - List all jobs

### Results
- `GET /api/results/download/{job_id}` - Download pruned model
- `GET /api/results/export/{job_id}` - Export results as JSON

### Health
- `GET /health` - Check backend health

## Data Flow Examples

### Example 1: Complete Pruning Workflow

```
1. User selects "meta-llama/Llama-2-7b-hf"
   → Component calls: getAvailableModels()

2. User selects "wikitext2" dataset
   → Component calls: getAvailableDatasets()

3. User configures:
   - Method: 2SSP
   - Sparsity: 50%
   - Calibration: 32 samples
   → Config stored in component state

4. User clicks "Start Pruning"
   → Component calls: startPruning({
       model_id: "meta-llama/Llama-2-7b-hf",
       pruning_method: "2ssp",
       sparsity_rate: 0.5,
       dataset_id: "wikitext2",
       num_calibration_samples: 32
     })

5. Backend returns job_id
   → Frontend starts polling: getPruningJob(job_id)
   → Updates UI every 2 seconds

6. When status = "completed"
   → Frontend displays ModelComparison component
   → Shows results and download options
```

### Example 2: Custom Dataset Upload

```
1. User selects DatasetSelector
2. User uploads "my_data.json"
3. Component calls: uploadDataset(file)
4. Backend saves and validates
5. Component refreshes: listUploadedDatasets()
6. New dataset appears in the grid
7. User can select it for pruning
```

## Error Handling

All components handle errors gracefully:

```
API Error → Display error message → Suggest action
Network Error → Retry logic → Fallback message
Validation Error → Show validation message → Allow correction
```

## Performance Considerations

1. **Polling Interval:** 2 seconds (configurable)
2. **File Upload Limit:** Check backend requirements
3. **Concurrent Jobs:** Backend tracks multiple jobs
4. **Cache:** Consider caching available models/datasets

## Customization Guide

### Adding New Models

In `backend.py`:
```python
@app.get("/api/models/available")
async def get_available_models():
    return {
        "available_models": [
            # Add new model here
            "new-org/new-model-id",
        ]
    }
```

### Adding New Pruning Methods

In `PruningConfigPanel.tsx`:
```tsx
<button onClick={() => handleMethodChange('newmethod')}>
  New Method
</button>
```

In `backend.py`:
```python
elif config.pruning_method == "newmethod":
    # Implement new method
    pruned_model = new_pruning_method(...)
```

### Customizing UI

All styles are in `styles/` directory using CSS Modules:
- `Pruning.module.css` - Main layout
- `ModelSelector.module.css` - Model selection
- `DatasetSelector.module.css` - Dataset selection
- `PruningConfigPanel.module.css` - Configuration
- `ModelComparison.module.css` - Results display

## Troubleshooting

### Backend not responding

```bash
# Check if backend is running
curl http://127.0.0.1:8000/health

# Should return:
# {"status": "healthy", "gpu_available": true, ...}
```

### Models not loading

```bash
# Check available models endpoint
curl http://127.0.0.1:8000/api/models/available
```

### Pruning job stuck

```bash
# Check job status
curl http://127.0.0.1:8000/api/pruning/jobs
```

### CORS errors

Ensure backend has CORS enabled:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    ...
)
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Responsive design

## Next Steps

1. **Deploy Backend:** Use Docker or cloud provider
2. **Deploy Frontend:** Use Vercel, Netlify, or self-hosted
3. **Monitor:** Add logging and monitoring
4. **Scale:** Consider load balancing for multiple users
5. **Security:** Add authentication if needed

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Review API response payloads
4. Check network tab in developer tools
