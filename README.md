## Getting Started 
### UI Setup Steps

Install yarn:
```bash
npm install -g yarn
```

First, install the necessary packages:
```bash
npm install
# or
yarn
```

Second, run the development server:

```bash
npm run dev
# or
yarn dev
```

The UI runs on http://loclahost:3000/

### Backend Setup


#### Testing on Kind

##### Installation

To run the vLLM simulator in a Kind cluster, run:
```bash
make dev-env-kind
```
Check [Makefile](Makefile) for environment variables to tune the process.
For example:
```bash
 KIND_CLUSTER_NAME=mytest UDS_TOKENIZER_TAG=v0.6.0 SIM_TAG=dev make dev-env-kind
``` 

To verify the deployment is available, run:
```bash
kubectl get deployment vllm-sim
kubectl get service vllm-sim
```

Test the API with curl

```bash
curl -X POST http://localhost:30080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```
