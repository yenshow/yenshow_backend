import { ref, onBeforeUnmount } from 'vue'

/**
 * Composable to manage multiple file attachments (images, videos, documents).
 *
 * @param {object} config - Configuration object.
 * @param {string} config.formFieldName - The field name to use when appending files to FormData.
 * @param {string} config.markerPrefix - A prefix for generating unique markers for new files.
 * @param {string} [config.accept] - Optional. The 'accept' attribute value for the file input.
 */
export function useMultiAttachmentManager(config) {
  if (!config || !config.formFieldName || !config.markerPrefix) {
    throw new Error(
      'useMultiAttachmentManager requires a configuration object with `formFieldName` and `markerPrefix`.',
    )
  }

  const previews = ref([]) // Array of preview objects
  const inputRef = ref(null) // Ref for the file input element

  /**
   * Triggers a click on the hidden file input element.
   */
  const triggerInput = () => {
    inputRef.value?.click()
  }

  /**
   * Handles the file input change event.
   * Creates preview objects for selected files, including Blob URLs for local preview.
   * @param {Event} event - The file input change event.
   */
  const handleUpload = (event) => {
    const newFiles = Array.from(event.target.files)
    newFiles.forEach((file) => {
      const blobUrl = URL.createObjectURL(file)
      const newFileMarkerIndex = previews.value.filter((p) => p.isNew).length

      previews.value.push({
        blobUrl: blobUrl, // Used for <img> src or <video> src for new files
        fileName: file.name,
        isNew: true,
        tempId: `${config.markerPrefix}_new_${Date.now()}_${Math.random()}`,
        file: file, // The actual File object
        fileMarker: `${config.markerPrefix}${newFileMarkerIndex}`,
      })
    })
    if (event.target) event.target.value = '' // Reset file input to allow selecting the same file again
  }

  /**
   * Removes a preview item from the list.
   * If the item is a new file, its Blob URL is revoked.
   * @param {object} previewToRemove - The preview object to remove.
   */
  const removePreview = (previewToRemove) => {
    if (previewToRemove.isNew && previewToRemove.blobUrl) {
      URL.revokeObjectURL(previewToRemove.blobUrl)
    }
    previews.value = previews.value.filter((p) => p.tempId !== previewToRemove.tempId)
  }

  /**
   * Populates the previews list with existing file URLs (e.g., when editing an item).
   * @param {string[]} existingUrls - An array of URLs for existing files.
   */
  const populatePreviews = (existingUrls = []) => {
    previews.value = existingUrls.map((url, index) => ({
      url: url, // Server URL for existing files
      fileName: url.substring(url.lastIndexOf('/') + 1) || `Existing File ${index + 1}`,
      isNew: false,
      tempId: `${config.markerPrefix}_existing_${index}_${Date.now()}`,
    }))
  }

  /**
   * Resets the attachment manager: clears previews and revokes any Blob URLs.
   */
  const reset = () => {
    previews.value.forEach((preview) => {
      if (preview.isNew && preview.blobUrl) {
        URL.revokeObjectURL(preview.blobUrl)
      }
    })
    previews.value = []
  }

  /**
   * Prepares file data for form submission.
   * Updates the `formModel` with an array of URLs/markers for the specified `formModelKey`.
   * Appends new files to the `formDataInstance`.
   *
   * @param {FormData} formDataInstance - The FormData object to append new files to.
   * @param {object} formModel - The reactive form model object (e.g., form.value).
   * @param {string} formModelKey - The key in `formModel` to update with URLs/markers (e.g., 'imageUrl').
   * @returns {boolean} True if new files were added to FormData, false otherwise.
   */
  const prepareFormData = (formDataInstance, formModel, formModelKey) => {
    const payloadUrlsOrMarkers = []
    const filesToUpload = []

    previews.value.forEach((preview) => {
      if (preview.isNew && preview.fileMarker && preview.file) {
        payloadUrlsOrMarkers.push(preview.fileMarker)
        filesToUpload.push(preview.file)
      } else if (!preview.isNew && preview.url) {
        payloadUrlsOrMarkers.push(preview.url) // Existing file URL
      }
    })

    formModel[formModelKey] = payloadUrlsOrMarkers

    filesToUpload.forEach((file) => {
      formDataInstance.append(config.formFieldName, file, file.name)
    })

    return filesToUpload.length > 0
  }

  onBeforeUnmount(() => {
    reset()
  })

  return {
    previews,
    inputRef,
    triggerInput,
    handleUpload,
    removePreview,
    populatePreviews,
    reset,
    prepareFormData,
    markerPrefix: config.markerPrefix,
    accept: config.accept,
  }
}
