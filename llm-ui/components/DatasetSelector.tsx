/**
 * DatasetSelector Component
 * Allows users to choose or upload datasets
 */

import React, { useState, useEffect } from 'react'
import { getAvailableDatasets, uploadDataset, listUploadedDatasets } from '../utils/pruningApi'
import styles from '../styles/DatasetSelector.module.css'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

interface DatasetSelectorProps {
  onDatasetSelect: (datasetId: string) => void
  selectedDataset: string | null
  disabled?: boolean
}

const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  onDatasetSelect,
  selectedDataset,
  disabled = false,
}) => {
  const [builtInDatasets, setBuiltInDatasets] = useState<string[]>([])
  const [uploadedDatasets, setUploadedDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchDatasets()
  }, [])

  const fetchDatasets = async () => {
    setLoading(true)
    try {
      const builtInResponse = await getAvailableDatasets()
      setBuiltInDatasets(builtInResponse.available_datasets)

      const uploadedResponse = await listUploadedDatasets()
      setUploadedDatasets(uploadedResponse.datasets || [])

      setError(null)
    } catch (err) {
      setError('Failed to load datasets')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      setError('Please upload a JSON or CSV file')
      return
    }

    setUploading(true)
    try {
      const response = await uploadDataset(file)
      setSuccessMessage(`Dataset "${file.name}" uploaded successfully!`)
      setError(null)
      
      // Refresh datasets list
      setTimeout(() => fetchDatasets(), 1000)
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError('Failed to upload dataset')
      console.error(err)
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.header}>
        <h2>Select Dataset</h2>
        <p className={styles.subtitle}>Choose a built-in or upload custom dataset</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      {/* Upload Section */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadBox}>
          <CloudUploadIcon className={styles.uploadIcon} />
          <h3>Upload Custom Dataset</h3>
          <p>Drag and drop or click to upload</p>
          <input
            type="file"
            accept=".json,.csv"
            onChange={handleFileUpload}
            disabled={uploading || disabled}
            className={styles.fileInput}
            id="dataset-upload"
          />
          <label htmlFor="dataset-upload" className={styles.uploadButton}>
            {uploading ? 'Uploading...' : 'Choose File (JSON/CSV)'}
          </label>
        </div>
      </div>

      {/* Built-in Datasets */}
      <div className={styles.section}>
        <h3>Built-in Datasets</h3>
        {loading ? (
          <div className={styles.loading}>Loading datasets...</div>
        ) : builtInDatasets.length > 0 ? (
          <div className={styles.datasetsGrid}>
            {builtInDatasets.map((dataset) => (
              <div
                key={dataset}
                className={`${styles.datasetCard} ${
                  selectedDataset === dataset ? styles.selected : ''
                }`}
                onClick={() => onDatasetSelect(dataset)}
              >
                <div className={styles.datasetName}>{dataset}</div>
                {selectedDataset === dataset && (
                  <div className={styles.checkmark}>✓</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noDatasets}>No built-in datasets available</div>
        )}
      </div>

      {/* Uploaded Datasets */}
      {uploadedDatasets.length > 0 && (
        <div className={styles.section}>
          <h3>Uploaded Datasets ({uploadedDatasets.length})</h3>
          <div className={styles.datasetsGrid}>
            {uploadedDatasets.map((dataset) => (
              <div
                key={dataset.filename}
                className={`${styles.datasetCard} ${
                  selectedDataset === dataset.filename ? styles.selected : ''
                }`}
                onClick={() => onDatasetSelect(dataset.filename)}
              >
                <div className={styles.datasetName}>{dataset.filename}</div>
                <div className={styles.datasetMeta}>
                  {(dataset.size_bytes / 1024).toFixed(2)} KB
                </div>
                {selectedDataset === dataset.filename && (
                  <div className={styles.checkmark}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDataset && (
        <div className={styles.selectedInfo}>
          <p>Selected: <strong>{selectedDataset}</strong></p>
        </div>
      )}
    </div>
  )
}

export default DatasetSelector
