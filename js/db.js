/* ===========================
   PixBooth — IndexedDB Photo Storage
   Replaces localStorage for photo data to avoid the 5MB limit.
   Layout config remains in localStorage (it's tiny).
   =========================== */

const PhotoDB = (() => {
    const DB_NAME = 'PixBoothDB';
    const DB_VERSION = 2; // Incremented for strips store
    const PHOTO_STORE = 'photos';
    const META_STORE = 'meta';
    const STRIPS_STORE = 'strips';

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                    db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE, { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains(STRIPS_STORE)) {
                    db.createObjectStore(STRIPS_STORE, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Save a single photo (id, base64 data, filters, timestamp)
    async function savePhoto(photo) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readwrite');
            tx.objectStore(PHOTO_STORE).put(photo);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Save all photos at once (array)
    async function saveAllPhotos(photos) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readwrite');
            const store = tx.objectStore(PHOTO_STORE);
            // Clear existing photos first
            store.clear();
            photos.forEach(photo => store.put(photo));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Get all photos, sorted by id
    async function getAllPhotos() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readonly');
            const request = tx.objectStore(PHOTO_STORE).getAll();
            request.onsuccess = () => {
                const photos = request.result.sort((a, b) => a.id - b.id);
                resolve(photos);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Get a single photo by id
    async function getPhoto(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readonly');
            const request = tx.objectStore(PHOTO_STORE).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Delete a single photo by id
    async function deletePhoto(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readwrite');
            tx.objectStore(PHOTO_STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Clear all photos
    async function clearPhotos() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readwrite');
            tx.objectStore(PHOTO_STORE).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Get photo count
    async function getPhotoCount() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, 'readonly');
            const request = tx.objectStore(PHOTO_STORE).count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- Strips methods ---
    async function saveStrip(strip) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STRIPS_STORE, 'readwrite');
            tx.objectStore(STRIPS_STORE).put(strip);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getAllStrips() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STRIPS_STORE, 'readonly');
            const request = tx.objectStore(STRIPS_STORE).getAll();
            request.onsuccess = () => {
                // Return newest first
                const strips = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(strips);
            };
            request.onerror = () => reject(request.error);
        });
    }

    return {
        savePhoto,
        saveAllPhotos,
        getAllPhotos,
        getPhoto,
        deletePhoto,
        clearPhotos,
        getPhotoCount,
        saveStrip,
        getAllStrips
    };
})();
