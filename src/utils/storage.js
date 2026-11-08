/**
 * IndexedDB persistence for Document History & Scanned Pages (CamScanner Style)
 * Stores full document collections, metadata, covers and individual page data.
 */

const DB_NAME = 'DocScan_CamScanner_DB_v3'
const DOCS_STORE = 'documents_store'
const STAGED_STORE = 'staged_store'
const DB_VERSION = 3

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        const store = db.createObjectStore(DOCS_STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STAGED_STORE)) {
        db.createObjectStore(STAGED_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ----------------- DOCUMENT HISTORY (COLLECTION OF SCANS) -----------------

/**
 * Gets all saved documents sorted by latest update
 */
export async function getAllDocuments() {
  try {
    const db = await openDB()
    const tx = db.transaction(DOCS_STORE, 'readonly')
    const store = tx.objectStore(DOCS_STORE)

    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => {
        const docs = req.result || []
        // Sort newest first
        docs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        resolve(docs)
      }
      req.onerror = () => resolve([])
    })
  } catch (err) {
    console.warn('Error reading documents from storage:', err)
    return []
  }
}

/**
 * Saves or updates a document in history
 */
export async function saveDocument(document) {
  try {
    const db = await openDB()
    const tx = db.transaction(DOCS_STORE, 'readwrite')
    const store = tx.objectStore(DOCS_STORE)

    const docToSave = {
      ...document,
      updatedAt: Date.now()
    }

    store.put(docToSave)

    return new Promise((res) => {
      tx.oncomplete = () => res(docToSave)
      tx.onerror = () => res(null)
    })
  } catch (err) {
    console.warn('Error saving document to storage:', err)
    return null
  }
}

/**
 * Deletes a document from history
 */
export async function deleteDocument(docId) {
  try {
    const db = await openDB()
    const tx = db.transaction(DOCS_STORE, 'readwrite')
    const store = tx.objectStore(DOCS_STORE)

    store.delete(docId)

    return new Promise((res) => {
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch (err) {
    console.warn('Error deleting document:', err)
    return false
  }
}

// ----------------- STAGED PHOTOS (TEMPORARY CAPTURE TRAY) -----------------

export async function saveStagedPhotosToStorage(photos) {
  try {
    const db = await openDB()
    const tx = db.transaction(STAGED_STORE, 'readwrite')
    const store = tx.objectStore(STAGED_STORE)

    await new Promise((res, rej) => {
      const clearReq = store.clear()
      clearReq.onsuccess = () => res()
      clearReq.onerror = () => rej(clearReq.error)
    })

    for (const photo of photos) {
      store.put(photo)
    }

    return new Promise((res) => {
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch (err) {
    console.warn('Could not persist staged photos:', err)
    return false
  }
}

export async function loadStagedPhotosFromStorage() {
  try {
    const db = await openDB()
    const tx = db.transaction(STAGED_STORE, 'readonly')
    const store = tx.objectStore(STAGED_STORE)

    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  } catch (err) {
    console.warn('Could not load staged photos:', err)
    return []
  }
}

export async function clearStagedPhotosFromStorage() {
  try {
    const db = await openDB()
    const tx = db.transaction(STAGED_STORE, 'readwrite')
    tx.objectStore(STAGED_STORE).clear()
  } catch (err) {
    console.warn('Could not clear staged photos:', err)
  }
}
