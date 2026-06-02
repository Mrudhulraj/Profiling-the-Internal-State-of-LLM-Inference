/**
 * PruningConfigPanel Component
 * Allows users to configure pruning parameters
 */

import React, { useState } from 'react'
import styles from '../styles/PruningConfigPanel.module.css'

interface PruningConfigPanelProps {
  onConfigChange: (config: PruningConfig) => void
  selectedModel: string | null
  disabled?: boolean
}

export interface PruningConfig {
  pruningMethod: '2ssp' | 'shortgpt'
  sparsityRate: number
  numCalibrationSamples: number
  seed: number
}

const PruningConfigPanel: React.FC<PruningConfigPanelProps> = ({
  onConfigChange,
  selectedModel,
  disabled = false,
}) => {
  const [config, setConfig] = useState<PruningConfig>({
    pruningMethod: '2ssp',
    sparsityRate: 0.5,
    numCalibrationSamples: 32,
    seed: 0,
  })

  const handleMethodChange = (method: '2ssp' | 'shortgpt') => {
    const updatedConfig = { ...config, pruningMethod: method }
    setConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  const handleSparsityChange = (value: number) => {
    const updatedConfig = { ...config, sparsityRate: value }
    setConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  const handleCalibrationSamplesChange = (value: number) => {
    const updatedConfig = { ...config, numCalibrationSamples: value }
    setConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  const handleSeedChange = (value: number) => {
    const updatedConfig = { ...config, seed: value }
    setConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.header}>
        <h2>Pruning Configuration</h2>
        <p className={styles.subtitle}>Configure pruning parameters</p>
      </div>

      {!selectedModel && (
        <div className={styles.warning}>
          ⚠️ Please select a model first
        </div>
      )}

      <div className={styles.configSection}>
        <div className={styles.configGroup}>
          <label>Pruning Method</label>
          <div className={styles.methodButtons}>
            <button
              className={`${styles.methodBtn} ${
                config.pruningMethod === '2ssp' ? styles.active : ''
              }`}
              onClick={() => handleMethodChange('2ssp')}
              disabled={disabled}
              title="Two-Stage Structured Pruning - Recommended for best quality"
            >
              2SSP
              <div className={styles.methodDesc}>Two-Stage</div>
            </button>
            <button
              className={`${styles.methodBtn} ${
                config.pruningMethod === 'shortgpt' ? styles.active : ''
              }`}
              onClick={() => handleMethodChange('shortgpt')}
              disabled={disabled}
              title="ShortGPT - Fast block-based pruning"
            >
              ShortGPT
              <div className={styles.methodDesc}>Fast</div>
            </button>
          </div>
        </div>

        <div className={styles.configGroup}>
          <label>Sparsity Rate (Pruning Amount)</label>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={config.sparsityRate}
              onChange={(e) => handleSparsityChange(parseFloat(e.target.value))}
              disabled={disabled}
              className={styles.slider}
            />
            <div className={styles.sliderValue}>
              {Math.round(config.sparsityRate * 100)}%
            </div>
          </div>
          <p className={styles.hint}>
            Higher = more aggressive pruning (faster but lower quality)
          </p>
        </div>

        <div className={styles.configGroup}>
          <label>Calibration Samples</label>
          <div className={styles.inputContainer}>
            <input
              type="number"
              min="1"
              max="256"
              value={config.numCalibrationSamples}
              onChange={(e) =>
                handleCalibrationSamplesChange(parseInt(e.target.value))
              }
              disabled={disabled}
              className={styles.numberInput}
            />
            <span className={styles.unit}>samples</span>
          </div>
          <p className={styles.hint}>
            More samples = better calibration (slower)
          </p>
        </div>

        <div className={styles.configGroup}>
          <label>Random Seed</label>
          <div className={styles.inputContainer}>
            <input
              type="number"
              value={config.seed}
              onChange={(e) => handleSeedChange(parseInt(e.target.value))}
              disabled={disabled}
              className={styles.numberInput}
            />
          </div>
          <p className={styles.hint}>For reproducibility</p>
        </div>
      </div>

      <div className={styles.summary}>
        <h3>Summary</h3>
        <ul>
          <li>
            <strong>Method:</strong> {config.pruningMethod === '2ssp' ? 'Two-Stage Structured Pruning' : 'ShortGPT'}
          </li>
          <li>
            <strong>Sparsity:</strong> {Math.round(config.sparsityRate * 100)}%
          </li>
          <li>
            <strong>Calibration Samples:</strong> {config.numCalibrationSamples}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default PruningConfigPanel
