/**
 * Pruning API Service
 * Handles all interactions with the FastAPI backend for LLM pruning
 */

import axios from 'axios'

const PRUNING_API_BASE_URL = 'http://127.0.0.1:8000/api'

// Create axios instance for pruning API
const pruningApi = axios.create({
  baseURL: PRUNING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================================
// MODEL ENDPOINTS
// ============================================================================

export interface AvailableModelsResponse {
  available_models: string[]
}

export const getAvailableModels = async (): Promise<AvailableModelsResponse> => {
  try {
    const response = await pruningApi.get('/models/available')
    return response.data
  } catch (error) {
    console.error('Error fetching available models:', error)
    throw error
  }
}

export const loadModel = async (modelName: string): Promise<any> => {
  try {
    const response = await pruningApi.post('/models/load', null, {
      params: { model_name: modelName },
    })
    return response.data
  } catch (error) {
    console.error('Error loading model:', error)
    throw error
  }
}

// ============================================================================
// DATASET ENDPOINTS
// ============================================================================

export interface AvailableDatasetsResponse {
  available_datasets: string[]
}

export const getAvailableDatasets = async (): Promise<AvailableDatasetsResponse> => {
  try {
    const response = await pruningApi.get('/datasets/available')
    return response.data
  } catch (error) {
    console.error('Error fetching available datasets:', error)
    throw error
  }
}

export const uploadDataset = async (file: File): Promise<any> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(
      `${PRUNING_API_BASE_URL}/datasets/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  } catch (error) {
    console.error('Error uploading dataset:', error)
    throw error
  }
}

export const listUploadedDatasets = async (): Promise<any> => {
  try {
    const response = await pruningApi.get('/datasets/list')
    return response.data
  } catch (error) {
    console.error('Error listing datasets:', error)
    throw error
  }
}

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

export interface ModelStatsResponse {
  status: string
  model_name: string
  stats: {
    model_id: string
    model_type: string
    total_parameters: number
    main_model_parameters: number
    created_at: string
    metrics: Record<string, any>
  }
}

export const computeModelStats = async (
  modelName: string,
  datasetId: string = 'wikitext2',
  numSamples: number = 100
): Promise<ModelStatsResponse> => {
  try {
    const response = await pruningApi.post('/stats/compute', null, {
      params: {
        model_name: modelName,
        dataset_id: datasetId,
        num_samples: numSamples,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error computing model stats:', error)
    throw error
  }
}

// ============================================================================
// PRUNING ENDPOINTS
// ============================================================================

export interface PruningConfigRequest {
  model_id: string
  pruning_method: '2ssp' | 'shortgpt'
  sparsity_rate: number
  dataset_id: string
  num_calibration_samples?: number
  seed?: number
}

export interface StartPruningResponse {
  status: string
  job_id: string
  message: string
}

export const startPruning = async (
  config: PruningConfigRequest
): Promise<StartPruningResponse> => {
  try {
    const response = await pruningApi.post('/pruning/start', config)
    return response.data
  } catch (error) {
    console.error('Error starting pruning:', error)
    throw error
  }
}

export interface PruningJobResponse {
  job: {
    job_id: string
    model_id: string
    pruning_method: string
    sparsity_rate: number
    status: 'pending' | 'running' | 'completed' | 'failed'
    baseline_stats?: {
      model_id: string
      model_type: string
      total_parameters: number
      main_model_parameters: number
      file_size_mb?: number
      pruning_method?: string
      sparsity_rate?: number
      metrics: Record<string, any>
    }
    pruned_stats?: {
      model_id: string
      model_type: string
      total_parameters: number
      main_model_parameters: number
      file_size_mb?: number
      pruning_method?: string
      sparsity_rate?: number
      metrics: Record<string, any>
    }
    comparison?: {
      parameter_reduction_percent: number
      size_reduction_percent?: number
      perplexity_increase_percent?: number
      speedup?: number
    }
    error?: string
    created_at: string
  }
}

export const getPruningJob = async (jobId: string): Promise<PruningJobResponse> => {
  try {
    const response = await pruningApi.get(`/pruning/job/${jobId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching pruning job:', error)
    throw error
  }
}

export const listPruningJobs = async (): Promise<any> => {
  try {
    const response = await pruningApi.get('/pruning/jobs')
    return response.data
  } catch (error) {
    console.error('Error listing pruning jobs:', error)
    throw error
  }
}

// ============================================================================
// INFERENCE ENDPOINTS
// ============================================================================

export interface GeneratePrunedModelRequest {
  job_id: string
  prompt: string
  max_new_tokens?: number
  temperature?: number
  top_p?: number
  use_chat_template?: boolean
}

export interface GeneratePrunedModelResponse {
  job_id: string
  model_id: string
  prompt: string
  generated_text: string
}

export interface CompareModelGenerationsResponse {
  job_id: string
  model_id: string
  prompt: string
  baseline_generated_text: string
  pruned_generated_text: string
}

export const generateFromPrunedModel = async (
  request: GeneratePrunedModelRequest
): Promise<GeneratePrunedModelResponse> => {
  try {
    const response = await pruningApi.post('/inference/generate', request)
    return response.data
  } catch (error) {
    console.error('Error generating from pruned model:', error)
    throw error
  }
}

export const compareModelGenerations = async (
  request: GeneratePrunedModelRequest
): Promise<CompareModelGenerationsResponse> => {
  try {
    const response = await pruningApi.post('/inference/compare', request)
    return response.data
  } catch (error) {
    console.error('Error comparing model generations:', error)
    throw error
  }
}

// ============================================================================
// RESULTS ENDPOINTS
// ============================================================================

export const downloadPrunedModel = async (jobId: string): Promise<Blob> => {
  try {
    const response = await pruningApi.get(`/results/download/${jobId}`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    console.error('Error downloading pruned model:', error)
    throw error
  }
}

export const exportResults = async (jobId: string): Promise<any> => {
  try {
    const response = await pruningApi.get(`/results/export/${jobId}`)
    return response.data
  } catch (error) {
    console.error('Error exporting results:', error)
    throw error
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthCheck = async (): Promise<any> => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/health')
    return response.data
  } catch (error) {
    console.error('Error checking health:', error)
    throw error
  }
}

export default pruningApi
