/**
 * IndexedDB persistence for scanned pages and staged photos
 * Prevents mobile browsers from losing documents if the OS reloads the tab
 * after using the phone camera or switching apps.
 */

const DB_NAME = 'DocScanDB_v2'
const PAGES_STORE = 'pages_store'
const STAGED_STORE = 'staged_store'
const DB_VERSION = 2

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(PAGES_STORE)) {
        db.createObjectStore(PAGES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STAGED_STORE)) {
        db.createObjectStore(STAGED_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// STAGED PHOTOS (Raw photos taken before confirming conversion)
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

// PROCESSED PAGES
export async function savePagesToStorage(pages) {
  try {
    const db = await openDB()
    const tx = db.transaction(PAGES_STORE, 'readwrite')
    const store = tx.objectStore(PAGES_STORE)

    await new Promise((res, rej) => {
      const clearReq = store.clear()
      clearReq.onsuccess = () => res()
      clearReq.onerror = () => rej(clearReq.error)
    })

    for (const page of pages) {
      store.put(page)
    }

    return new Promise((res) => {
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch (err) {
    console.warn('Could not persist pages:', err)
    return false
  }
}

export async function loadPagesFromStorage() {
  try {
    const db = await openDB()
    const tx = db.transaction(PAGES_STORE, 'readonly')
    const store = tx.objectStore(PAGES_STORE)

    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  } catch (err) {
    console.warn('Could not load pages:', err)
    return []
  }
}

export async function clearPagesFromStorage() {
  try {
    const db = await openDB()
    const tx = db.transaction(PAGES_STORE, 'readwrite')
    tx.objectStore(PAGES_STORE).clear()
  } catch (err) {
    console.warn('Could not clear pages:', err)
  }
}
