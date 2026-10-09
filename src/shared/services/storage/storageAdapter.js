const STORAGE_NAMESPACE = 'helmsight:p0:v1'

export class StorageAdapterError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'StorageAdapterError'
  }
}

function createKey(key) {
  return `${STORAGE_NAMESPACE}:${key}`
}

export const storageAdapter = {
  read(key) {
    try {
      const rawValue = window.localStorage.getItem(createKey(key))

      if (rawValue === null) {
        return null
      }

      return JSON.parse(rawValue)
    } catch (error) {
      throw new StorageAdapterError(`Failed to read local data: ${key}`, {
        cause: error,
      })
    }
  },

  write(key, value) {
    try {
      window.localStorage.setItem(createKey(key), JSON.stringify(value))
      return value
    } catch (error) {
      throw new StorageAdapterError(`Failed to save local data: ${key}`, {
        cause: error,
      })
    }
  },

  remove(key) {
    try {
      window.localStorage.removeItem(createKey(key))
    } catch (error) {
      throw new StorageAdapterError(`Failed to remove local data: ${key}`, {
        cause: error,
      })
    }
  },
}

export const storageNamespace = STORAGE_NAMESPACE
