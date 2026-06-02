# Quick Start Guide - Frontend Integration

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd llm-ui
npm install
```

### Step 2: Start the Backend

In a new terminal:

```bash
cd 2SSP
uvicorn backend:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Start the Frontend

```bash
# From llm-ui directory
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 4: Open in Browser

Go to: **`http://localhost:3000/pruning`**

### Step 5: Use the Interface

1. **Select a Model** (e.g., `meta-llama/Llama-2-7b-hf`)
2. **Choose a Dataset** (e.g., `wikitext2`)
3. **Configure Pruning**
   - Method: `2SSP` or `ShortGPT`
   - Sparsity: `50%`
4. **Click "Start Pruning"**
5. **Wait for Results** (takes 5-15 minutes depending on model)
6. **View Comparison** and download pruned model

## 📊 What You'll See

### Step 1: Model Selection
```
Available Models:
┌─────────────────────────────┐
│ ✓ meta-llama/Llama-2-7b     │
├─────────────────────────────┤
│   mistralai/Mistral-7B      │
├─────────────────────────────┤
│ microsoft/Phi-3-medium      │
├─────────────────────────────┤
│ Qwen/Qwen2.5-7B             │
└─────────────────────────────┘
```

### Step 2: Dataset Selection
```
Built-in Datasets:
┌──────────────┐
│ ✓ wikitext2  │
└──────────────┘

Upload Custom Dataset:
┌────────────────────────────┐
│ 📁 Drag & drop or click    │
│    (JSON or CSV)            │
└────────────────────────────┘
```

### Step 3: Configuration
```
Pruning Method:
[✓ 2SSP] [ShortGPT]

Sparsity Rate: ████████░░ 50%
Calibration Samples: 32
```

### Step 4: Results
```
Parameter Reduction: ↓ 50%
Model Size: ↓ 45%
Speedup: 1.3x

[📥 Download Model] [📊 Export Results] [🔄 Try Another]
```

## 🔧 Configuration Files

### Backend Config
- Location: `2SSP/backend.py`
- API Port: `8000`
- API Base: `http://127.0.0.1:8000/api`

### Frontend Config
- Location: `llm-ui/config.js`
- UI Port: `3000`
- Backend URL: `http://127.0.0.1:8000`

### Update API URL (if needed)

Edit `llm-ui/config.js`:
```javascript
export const BASE_URL = 'http://YOUR_BACKEND_URL:8000'
```

## 📱 API Endpoints Exposed

### Models
```
GET  /api/models/available       → List available models
POST /api/models/load             → Load a model
```

### Datasets
```
GET  /api/datasets/available     → List built-in datasets
POST /api/datasets/upload        → Upload custom dataset
GET  /api/datasets/list          → List uploaded datasets
```

### Pruning
```
POST /api/pruning/start          → Start pruning job
GET  /api/pruning/job/{job_id}   → Get job status
GET  /api/pruning/jobs           → List all jobs
```

### Results
```
GET  /api/results/download/{job_id}  → Download pruned model
GET  /api/results/export/{job_id}    → Export results JSON
```

## 🎯 Example: Full Workflow

### Terminal 1: Backend
```bash
$ cd Profiling-the-Internal-State-of-LLM-Inference/2SSP
$ uvicorn backend:app --reload
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Frontend
```bash
$ cd Profiling-the-Internal-State-of-LLM-Inference/llm-ui
$ npm run dev
ready - started server on 0.0.0.0:3000
```

### Browser: http://localhost:3000/pruning
1. Click on "meta-llama/Llama-2-7b-hf"
2. Click on "wikitext2"
3. Leave configuration as default (2SSP, 50% sparsity)
4. Click "Start Pruning"
5. Wait for completion...
6. View results!

## 🐛 Debugging

### Check Backend Health
```bash
curl http://127.0.0.1:8000/health
```

Expected output:
```json
{
  "status": "healthy",
  "gpu_available": true,
  "gpu_name": "NVIDIA A100"
}
```

### Check Available Models
```bash
curl http://127.0.0.1:8000/api/models/available
```

### Check Job Status
```bash
curl http://127.0.0.1:8000/api/pruning/jobs
```

### View Browser Console
Press `F12` in browser → Console tab → Check for errors

### View Network Requests
Press `F12` in browser → Network tab → Watch API calls

## ⚠️ Common Issues

### Backend won't start
```bash
# Make sure port 8000 is free
lsof -i :8000

# If occupied, kill process or use different port
uvicorn backend:app --port 8001
```

### Models not loading
```bash
# Check if model files are cached
ls -la ~/.cache/huggingface/hub/

# Clear cache if needed
rm -rf ~/.cache/huggingface/hub/
```

### Frontend won't connect to backend
```bash
# Check backend is running
curl http://127.0.0.1:8000/health

# Check firewall
# Check browser console for CORS errors
```

### Pruning takes too long
- Try smaller calibration samples (8 instead of 32)
- Try higher sparsity (70% instead of 50%)
- Check GPU availability: `nvidia-smi`

## 📚 File Structure

```
llm-ui/
├── components/
│   ├── ModelSelector.tsx           ← Model selection UI
│   ├── DatasetSelector.tsx         ← Dataset management UI
│   ├── PruningConfigPanel.tsx      ← Configuration UI
│   ├── ModelComparison.tsx         ← Results display
│   └── ...
├── pages/
│   ├── pruning.tsx                 ← Main pruning page ⭐
│   ├── index.tsx
│   └── ...
├── styles/
│   ├── Pruning.module.css
│   ├── ModelSelector.module.css
│   ├── DatasetSelector.module.css
│   ├── PruningConfigPanel.module.css
│   ├── ModelComparison.module.css
│   └── ...
├── utils/
│   ├── pruningApi.ts               ← API client ⭐
│   ├── axiosInstance.js
│   └── ...
├── config.js                       ← Configuration
└── ...
```

## 🔗 Important Files

| File | Purpose |
|------|---------|
| `utils/pruningApi.ts` | All API calls |
| `pages/pruning.tsx` | Main workflow page |
| `components/ModelSelector.tsx` | Model selection |
| `components/DatasetSelector.tsx` | Dataset management |
| `components/PruningConfigPanel.tsx` | Configuration |
| `components/ModelComparison.tsx` | Results display |

## ✅ Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can access `http://localhost:3000/pruning`
- [ ] Can see model list
- [ ] Can select model
- [ ] Can select dataset
- [ ] Can start pruning
- [ ] Can see results

## 🎓 Next Steps

1. **Customize Models** - Add/remove models in `backend.py`
2. **Customize UI** - Edit CSS in `styles/` directory
3. **Add Features** - Add new pruning methods or metrics
4. **Deploy** - Deploy to cloud (AWS, GCP, Azure, etc.)

## 📖 Full Documentation

See `INTEGRATION_GUIDE.md` for detailed documentation on:
- Architecture
- API integration
- Component structure
- Customization
- Troubleshooting
- Deployment

## 💡 Tips

- **First run takes longer**: Model downloads ~14GB from HuggingFace
- **GPU recommended**: CPU pruning will be very slow
- **Test endpoints**: Use `curl` to test API endpoints
- **Check logs**: Monitor both backend and frontend logs
- **Save results**: Always download/export pruned models and results

---

**Ready to start? Go to `http://localhost:3000/pruning` 🚀**
