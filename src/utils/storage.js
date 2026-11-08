/**
 * IndexedDB persistence for scanned pages
 * Prevents mobile browsers from losing documents if the OS reloads the tab
 * after using the phone camera or switching apps.
 */

const DB_NAME = 'DocScanDB'
const STORE_NAME = 'pages_store'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePagesToStorage(pages) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Clear previous
    await new Promise((res, rej) => {
      const clearReq = store.clear()
      clearReq.onsuccess = () => res()
      clearReq.onerror = () => rej(clearReq.error)
    })

    // Store each page
    for (const page of pages) {
      store.put(page)
    }

    return new Promise((res) => {
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch (err) {
    console.warn('Could not persist to IndexedDB:', err)
    return false
  }
}

export async function loadPagesFromStorage() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  } catch (err) {
    console.warn('Could not load from IndexedDB:', err)
    return []
  }
}

export async function clearPagesFromStorage() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err)
  }
}
