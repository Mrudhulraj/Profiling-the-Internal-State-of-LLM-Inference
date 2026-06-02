/**
 * ModelSelector Component
 * Allows users to select a model and view available options
 */

import React, { useState, useEffect } from 'react'
import { getAvailableModels } from '../utils/pruningApi'
import styles from '../styles/ModelSelector.module.css'

interface ModelSelectorProps {
  onModelSelect: (modelName: string) => void
  selectedModel: string | null
  loading?: boolean
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelSelect,
  selectedModel,
  loading = false,
}) => {
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true)
      try {
        const response = await getAvailableModels()
        setModels(response.available_models)
        setError(null)
      } catch (err) {
        setError('Failed to load available models')
        console.error(err)
      } finally {
        setLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Select Model</h2>
        <p className={styles.subtitle}>Choose an LLM to prune</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.modelsGrid}>
        {loadingModels ? (
          <div className={styles.loading}>Loading models...</div>
        ) : models.length > 0 ? (
          models.map((model) => (
            <div
              key={model}
              className={`${styles.modelCard} ${
                selectedModel === model ? styles.selected : ''
              }`}
              onClick={() => onModelSelect(model)}
            >
              <div className={styles.modelName}>{model.split('/')[1]}</div>
              <div className={styles.modelPath}>{model}</div>
              {selectedModel === model && (
                <div className={styles.checkmark}>✓</div>
              )}
            </div>
          ))
        ) : (
          <div className={styles.noModels}>No models available</div>
        )}
      </div>

      {selectedModel && (
        <div className={styles.selectedInfo}>
          <p>Selected: <strong>{selectedModel}</strong></p>
        </div>
      )}
    </div>
  )
}

export default ModelSelector
