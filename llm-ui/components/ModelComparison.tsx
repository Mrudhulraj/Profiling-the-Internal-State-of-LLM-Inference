/**
 * ModelComparison Component
 * Displays baseline vs pruned model comparison
 */

import React from 'react'
import styles from '../styles/ModelComparison.module.css'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import SpeedIcon from '@mui/icons-material/Speed'
import StorageIcon from '@mui/icons-material/Storage'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

interface ModelStats {
  model_id: string
  model_type: string
  total_parameters: number
  main_model_parameters: number
  metrics: Record<string, any>
  pruning_method?: string
  sparsity_rate?: number
  file_size_mb?: number
}

interface ComparisonData {
  baseline_stats: ModelStats
  pruned_stats: ModelStats
  comparison: {
    parameter_reduction_percent: number
    size_reduction_percent?: number
    perplexity_increase_percent?: number
    speedup?: number
  }
}

interface ModelComparisonProps {
  data: ComparisonData | null
  loading?: boolean
  error?: string | null
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

const formatPct = (num: number): string => {
  return `${num.toFixed(2)}%`
}

const ModelComparison: React.FC<ModelComparisonProps> = ({
  data,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Computing model statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          <p>Run a pruning job to see comparison results</p>
        </div>
      </div>
    )
  }

  const { baseline_stats, pruned_stats, comparison } = data

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Model Performance Comparison</h2>
        <p className={styles.subtitle}>Baseline vs Pruned</p>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.statBox}>
          <TrendingDownIcon className={styles.icon} />
          <div>
            <div className={styles.label}>Parameter Reduction</div>
            <div className={styles.value}>
              {formatPct(comparison.parameter_reduction_percent)}
            </div>
          </div>
        </div>

        {comparison.size_reduction_percent !== undefined && (
          <div className={styles.statBox}>
            <StorageIcon className={styles.icon} />
            <div>
              <div className={styles.label}>Size Reduction</div>
              <div className={styles.value}>
                {formatPct(comparison.size_reduction_percent)}
              </div>
            </div>
          </div>
        )}

        {comparison.speedup !== undefined && (
          <div className={styles.statBox}>
            <SpeedIcon className={styles.icon} />
            <div>
              <div className={styles.label}>Speedup</div>
              <div className={styles.value}>{comparison.speedup.toFixed(2)}x</div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Comparison */}
      <div className={styles.comparisonTable}>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Baseline</th>
              <th>Pruned</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Parameters</td>
              <td>{formatNumber(baseline_stats.total_parameters)}</td>
              <td>{formatNumber(pruned_stats.total_parameters)}</td>
              <td className={styles.positive}>
                -{formatPct(comparison.parameter_reduction_percent)}
              </td>
            </tr>

            <tr>
              <td>Model Parameters</td>
              <td>{formatNumber(baseline_stats.main_model_parameters)}</td>
              <td>{formatNumber(pruned_stats.main_model_parameters)}</td>
              <td className={styles.positive}>
                -{formatPct(
                  ((baseline_stats.main_model_parameters -
                    pruned_stats.main_model_parameters) /
                    baseline_stats.main_model_parameters) *
                    100
                )}
              </td>
            </tr>

            {baseline_stats.metrics.perplexity !== undefined && (
              <tr>
                <td>Perplexity</td>
                <td>{baseline_stats.metrics.perplexity.toFixed(4)}</td>
                <td>{pruned_stats.metrics.perplexity.toFixed(4)}</td>
                <td
                  className={
                    comparison.perplexity_increase_percent &&
                    comparison.perplexity_increase_percent > 0
                      ? styles.negative
                      : styles.positive
                  }
                >
                  {comparison.perplexity_increase_percent
                    ? `+${formatPct(comparison.perplexity_increase_percent)}`
                    : 'N/A'}
                </td>
              </tr>
            )}

            {baseline_stats.metrics.inference_time_ms !== undefined && (
              <tr>
                <td>Inference Time</td>
                <td>{baseline_stats.metrics.inference_time_ms.toFixed(2)} ms</td>
                <td>{pruned_stats.metrics.inference_time_ms.toFixed(2)} ms</td>
                <td className={styles.positive}>
                  {comparison.speedup
                    ? `${comparison.speedup.toFixed(2)}x faster`
                    : 'N/A'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pruning Details */}
      <div className={styles.pruningSummary}>
        <h3>Pruning Configuration</h3>
        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Method:</span>
            <span className={styles.value}>
              {pruned_stats.pruning_method === '2ssp'
                ? 'Two-Stage Structured Pruning'
                : pruned_stats.pruning_method}
            </span>
          </div>
          <div className={styles.detail}>
            <span className={styles.label}>Sparsity Rate:</span>
            <span className={styles.value}>
              {formatPct((pruned_stats.sparsity_rate || 0) * 100)}
            </span>
          </div>
          {pruned_stats.file_size_mb !== undefined && (
            <div className={styles.detail}>
              <span className={styles.label}>File Size:</span>
              <span className={styles.value}>
                {pruned_stats.file_size_mb.toFixed(2)} MB
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Success Indicator */}
      <div className={styles.successBox}>
        <CheckCircleIcon className={styles.successIcon} />
        <p>Pruning completed successfully!</p>
      </div>
    </div>
  )
}

export default ModelComparison
