/**
 * Pruning Page
 * Main page for the LLM pruning interface
 * Integrates all components: model selection, dataset selection, configuration, and results
 */

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Navbar from '../components/Navbar'
import ModelSelector from '../components/ModelSelector'
import DatasetSelector from '../components/DatasetSelector'
import PruningConfigPanel, { PruningConfig } from '../components/PruningConfigPanel'
import ModelComparison from '../components/ModelComparison'
import { 
  startPruning, 
  getPruningJob,
  computeModelStats,
  PruningConfigRequest,
  PruningJobResponse
} from '../utils/pruningApi'
import styles from '../styles/Pruning.module.css'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CircularProgress from '@mui/material/CircularProgress'

type Step = 'model-selection' | 'dataset-selection' | 'configuration' | 'running' | 'results'

interface JobStatus {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  data: PruningJobResponse | null
  error: string | null
}

const PruningPage: React.FC = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('model-selection')

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [modelStatsLoading, setModelStatsLoading] = useState(false)

  // Dataset selection
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)

  // Configuration
  const [pruningConfig, setPruningConfig] = useState<PruningConfig>({
    pruningMethod: '2ssp',
    sparsityRate: 0.5,
    numCalibrationSamples: 32,
    seed: 0,
  })

  // Job tracking
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    jobId: '',
    status: 'pending',
    data: null,
    error: null,
  })

  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Poll for job status
  useEffect(() => {
    if (jobStatus.jobId && currentStep === 'running') {
      const interval = setInterval(async () => {
        try {
          const response = await getPruningJob(jobStatus.jobId)
          setJobStatus((prev) => ({
            ...prev,
            status: response.job.status as any,
            data: response,
            error: response.job.error || null,
          }))

          // Move to results when completed
          if (response.job.status === 'completed' || response.job.status === 'failed') {
            setCurrentStep('results')
            if (interval) clearInterval(interval)
          }
        } catch (error) {
          console.error('Error polling job status:', error)
        }
      }, 2000) // Poll every 2 seconds

      setPollingInterval(interval)

      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [jobStatus.jobId, currentStep])

  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName)
  }

  const handleDatasetSelect = (datasetId: string) => {
    setSelectedDataset(datasetId)
  }

  const handleConfigChange = (config: PruningConfig) => {
    setPruningConfig(config)
  }

  const handleStartPruning = async () => {
    if (!selectedModel || !selectedDataset) {
      alert('Please select both model and dataset')
      return
    }

    const config: PruningConfigRequest = {
      model_id: selectedModel,
      pruning_method: pruningConfig.pruningMethod,
      sparsity_rate: pruningConfig.sparsityRate,
      dataset_id: selectedDataset,
      num_calibration_samples: pruningConfig.numCalibrationSamples,
      seed: pruningConfig.seed,
    }

    try {
      setCurrentStep('running')
      const response = await startPruning(config)
      setJobStatus({
        jobId: response.job_id,
        status: 'running',
        data: null,
        error: null,
      })
    } catch (error) {
      console.error('Error starting pruning:', error)
      setJobStatus({
        jobId: '',
        status: 'failed',
        data: null,
        error: 'Failed to start pruning job',
      })
      setCurrentStep('results')
    }
  }

  const handleReset = () => {
    setCurrentStep('model-selection')
    setSelectedModel(null)
    setSelectedDataset(null)
    setJobStatus({
      jobId: '',
      status: 'pending',
      data: null,
      error: null,
    })
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
  }

  const isModelSelected = selectedModel !== null
  const isDatasetSelected = selectedDataset !== null
  const canProceed = isModelSelected && isDatasetSelected

  return (
    <>
      <Head>
        <title>LLM Model Pruning</title>
        <meta name="description" content="Prune LLM models with 2SSP and ShortGPT" />
      </Head>

      <Navbar />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1> Tracing the Mind of a Language Model </h1>
          <p>Compress your large language models with the aid of pruning techniques</p>
        </div>

        {/* Progress Stepper */}
        <div className={styles.stepper}>
          <div
            className={`${styles.step} ${
              currentStep === 'model-selection' ? styles.active : ''
            } ${
              isModelSelected ? styles.completed : ''
            }`}
          >
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepLabel}>Select Model</div>
          </div>

          <div className={styles.stepConnector} />

          <div
            className={`${styles.step} ${
              currentStep === 'dataset-selection' ? styles.active : ''
            } ${
              isDatasetSelected ? styles.completed : ''
            }`}
          >
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepLabel}>Choose Dataset</div>
          </div>

          <div className={styles.stepConnector} />

          <div
            className={`${styles.step} ${
              currentStep === 'configuration' ? styles.active : ''
            }`}
          >
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepLabel}>Configure</div>
          </div>

          <div className={styles.stepConnector} />

          <div
            className={`${styles.step} ${
              currentStep === 'running' ? styles.active : ''
            } ${
              currentStep === 'results' ? styles.completed : ''
            }`}
          >
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepLabel}>Results</div>
          </div>
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          {/* Step 1: Model Selection */}
          <div
            className={`${styles.stepContent} ${
              currentStep === 'model-selection' ? styles.visible : ''
            }`}
          >
            <ModelSelector
              selectedModel={selectedModel}
              onModelSelect={handleModelSelect}
            />
            <div className={styles.stepActions}>
              <button
                onClick={() => setCurrentStep('dataset-selection')}
                disabled={!isModelSelected}
                className={styles.nextButton}
              >
                Next: Choose Dataset →
              </button>
            </div>
          </div>

          {/* Step 2: Dataset Selection */}
          <div
            className={`${styles.stepContent} ${
              currentStep === 'dataset-selection' ? styles.visible : ''
            }`}
          >
            <DatasetSelector
              selectedDataset={selectedDataset}
              onDatasetSelect={handleDatasetSelect}
              disabled={!isModelSelected}
            />
            <div className={styles.stepActions}>
              <button
                onClick={() => setCurrentStep('model-selection')}
                className={styles.backButton}
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep('configuration')}
                disabled={!isDatasetSelected}
                className={styles.nextButton}
              >
                Next: Configure →
              </button>
            </div>
          </div>

          {/* Step 3: Configuration */}
          <div
            className={`${styles.stepContent} ${
              currentStep === 'configuration' ? styles.visible : ''
            }`}
          >
            <PruningConfigPanel
              selectedModel={selectedModel}
              onConfigChange={handleConfigChange}
              disabled={!canProceed}
            />
            <div className={styles.stepActions}>
              <button
                onClick={() => setCurrentStep('dataset-selection')}
                className={styles.backButton}
              >
                ← Back
              </button>
              <button
                onClick={handleStartPruning}
                disabled={!canProceed}
                className={styles.startButton}
              >
                🚀 Start Pruning
              </button>
            </div>
          </div>

          {/* Step 4: Running / Results */}
          <div
            className={`${styles.stepContent} ${
              currentStep === 'running' || currentStep === 'results'
                ? styles.visible
                : ''
            }`}
          >
            {currentStep === 'running' && (
              <div className={styles.runningContainer}>
                <CircularProgress size={60} />
                <h2>Pruning in Progress...</h2>
                <p>Job ID: {jobStatus.jobId.slice(0, 8)}...</p>
                <p>Status: {jobStatus.status}</p>
                <div className={styles.progressInfo}>
                  <p>⏱️ This may take a few minutes depending on model size and configuration</p>
                </div>
              </div>
            )}

            {currentStep === 'results' && (
              <>
                {jobStatus.status === 'completed' && jobStatus.data ? (
                  <>
                    <div className={styles.successBanner}>
                      <CheckCircleIcon className={styles.successIcon} />
                      <h2>Pruning Completed Successfully! 🎉</h2>
                    </div>

                    <ModelComparison
                      data={{
                        baseline_stats: jobStatus.data.job.baseline_stats!,
                        pruned_stats: jobStatus.data.job.pruned_stats!,
                        comparison: jobStatus.data.job.comparison!,
                      }}
                    />

                    <div className={styles.resultsActions}>
                      <button
                        onClick={() => {
                          // Download pruned model
                          window.open(
                            `http://127.0.0.1:8000/api/results/download/${jobStatus.jobId}`,
                            '_blank'
                          )
                        }}
                        className={styles.downloadButton}
                      >
                        📥 Download Pruned Model
                      </button>
                      <button
                        onClick={() => {
                          // Export results as JSON
                          window.open(
                            `http://127.0.0.1:8000/api/results/export/${jobStatus.jobId}`,
                            '_blank'
                          )
                        }}
                        className={styles.exportButton}
                      >
                        📊 Export Results
                      </button>
                      <button
                        onClick={handleReset}
                        className={styles.resetButton}
                      >
                        🔄 Try Another Model
                      </button>
                    </div>
                  </>
                ) : jobStatus.status === 'failed' || jobStatus.error ? (
                  <div className={styles.errorBanner}>
                    <ErrorIcon className={styles.errorIcon} />
                    <h2>Pruning Failed</h2>
                    <p>{jobStatus.error || 'An unexpected error occurred'}</p>
                    <button
                      onClick={handleReset}
                      className={styles.resetButton}
                    >
                      ← Go Back
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className={styles.footer}>
          <p>
            💡 <strong>Tips:</strong> 2SSP provides better quality but slower pruning.
            ShortGPT is faster but may have slightly lower quality.
          </p>
        </div>
      </div>
    </>
  )
}

export default PruningPage
