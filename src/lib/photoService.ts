import { doc, onSnapshot, setDoc, deleteDoc, deleteField, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface ChurchPhotos {
  heroPhoto?: string | null;
  staffPhoto?: string | null;
  pastorPhoto?: string | null;
}

export const LOCAL_STORAGE_KEYS = {
  heroPhoto: 'church_hero_landing_photo',
  staffPhoto: 'church_custom_staff_photo',
  pastorPhoto: 'pastor_custom_photo',
} as const;

export const FIRESTORE_DOC_KEYS = {
  heroPhoto: 'photo_hero',
  staffPhoto: 'photo_staff',
  pastorPhoto: 'photo_pastor',
} as const;

export function getInitialChurchPhotos(): ChurchPhotos {
  try {
    return {
      heroPhoto: localStorage.getItem(LOCAL_STORAGE_KEYS.heroPhoto),
      staffPhoto: localStorage.getItem(LOCAL_STORAGE_KEYS.staffPhoto),
      pastorPhoto: localStorage.getItem(LOCAL_STORAGE_KEYS.pastorPhoto),
    };
  } catch {
    return { heroPhoto: null, staffPhoto: null, pastorPhoto: null };
  }
}

// Current memory cache
let cachedPhotos: ChurchPhotos = getInitialChurchPhotos();
const photoListeners = new Set<(photos: ChurchPhotos) => void>();

function notifyPhotoListeners() {
  photoListeners.forEach((fn) => fn({ ...cachedPhotos }));
}

let isListening = false;

export function subscribeToChurchPhotos(callback: (photos: ChurchPhotos) => void): () => void {
  // Send current cached or initial values immediately
  callback({ ...cachedPhotos });
  photoListeners.add(callback);

  if (!isListening) {
    isListening = true;
    initFirestorePhotoListeners();
  }

  return () => {
    photoListeners.delete(callback);
  };
}

function initFirestorePhotoListeners() {
  // 1. Listen to individual documents (each has its own 1MB limit for safety)
  const keys: (keyof typeof FIRESTORE_DOC_KEYS)[] = ['heroPhoto', 'staffPhoto', 'pastorPhoto'];

  keys.forEach((key) => {
    const docName = FIRESTORE_DOC_KEYS[key];
    const docRef = doc(db, 'site_settings', docName);

    onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const url = data.url || data[key] || null;
          if (url) {
            cachedPhotos[key] = url;
            try {
              localStorage.setItem(LOCAL_STORAGE_KEYS[key], url);
            } catch (err) {
              console.warn("LocalStorage cache error:", err);
            }
            notifyPhotoListeners();
          }
        }
      },
      (err) => {
        console.warn(`Firestore photo listener for ${docName} error:`, err);
      }
    );
  });

  // 2. Also listen to combined legacy/fallback document 'site_settings/photos'
  const combinedRef = doc(db, 'site_settings', 'photos');
  onSnapshot(
    combinedRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        let changed = false;

        keys.forEach((key) => {
          if (data[key] && !cachedPhotos[key]) {
            cachedPhotos[key] = data[key];
            changed = true;
            try {
              localStorage.setItem(LOCAL_STORAGE_KEYS[key], data[key]);
            } catch (err) {
              console.warn("LocalStorage cache error:", err);
            }
          }
        });

        if (changed) {
          notifyPhotoListeners();
        }
      }
    },
    (err) => {
      console.warn("Firestore photo listener for photos error:", err);
    }
  );
}

/**
 * Resizes and compresses image data to optimal dimensions and size (<150KB),
 * ensuring fast loading on mobile and compliance with Firestore storage.
 */
export function compressAndProcessImage(file: File, maxDimension = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지 파일을 불러올 수 없습니다."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for photographic content to keep sizes strictly under ~120KB
        const mimeType = file.type === 'image/png' && !file.name.endsWith('.jpg') ? 'image/png' : 'image/jpeg';
        let dataUrl = canvas.toDataURL(mimeType, quality);

        // If PNG is still large (>400KB), convert to JPEG at 0.82 for optimal mobile speed
        if (dataUrl.length > 400000 && mimeType === 'image/png') {
          dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }

        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an existing base64 string if it exceeds target dimensions/size
 */
export function compressBase64(dataUrl: string, maxDimension = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const isPng = dataUrl.startsWith('data:image/png');
      let result = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
      if (result.length > 400000 && isPng) {
        result = canvas.toDataURL('image/jpeg', 0.82);
      }
      resolve(result);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Save photo to Firestore cloud database AND local storage so all mobile and desktop devices see it.
 */
export async function saveChurchPhoto(
  key: keyof typeof LOCAL_STORAGE_KEYS,
  dataUrl: string,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) {
    throw new Error("사진 변경은 교회 관리자 권한이 필요합니다.");
  }

  // Optimize size
  const optimizedUrl = await compressBase64(dataUrl);

  // Update memory and local cache immediately
  cachedPhotos[key] = optimizedUrl;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS[key], optimizedUrl);
  } catch (err) {
    console.warn("Local storage write error:", err);
  }
  notifyPhotoListeners();

  const userEmail = auth.currentUser?.email || 'admin';
  const now = Date.now();

  // 1. Save to dedicated single-photo document (Guaranteed < 200KB, well under 1MB limit)
  const singleDocRef = doc(db, 'site_settings', FIRESTORE_DOC_KEYS[key]);
  await setDoc(singleDocRef, {
    url: optimizedUrl,
    key,
    updatedAt: now,
    updatedBy: userEmail,
  });

  // 2. Also try updating combined document for backwards compatibility
  try {
    const combinedRef = doc(db, 'site_settings', 'photos');
    await setDoc(
      combinedRef,
      {
        [key]: optimizedUrl,
        updatedAt: now,
        updatedBy: userEmail,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Combined document update skipped:", err);
  }
}

/**
 * Reset photo to default
 */
export async function resetChurchPhoto(
  key: keyof typeof LOCAL_STORAGE_KEYS,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) {
    throw new Error("사진 변경은 교회 관리자 권한이 필요합니다.");
  }

  cachedPhotos[key] = null;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEYS[key]);
  } catch (err) {
    console.warn("Local storage remove error:", err);
  }
  notifyPhotoListeners();

  // Delete from dedicated single-photo document
  try {
    const singleDocRef = doc(db, 'site_settings', FIRESTORE_DOC_KEYS[key]);
    await deleteDoc(singleDocRef);
  } catch (err) {
    console.warn("Delete single doc error:", err);
  }

  // Remove field from combined document
  try {
    const combinedRef = doc(db, 'site_settings', 'photos');
    await setDoc(
      combinedRef,
      {
        [key]: deleteField(),
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.email || 'admin',
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Remove field from combined error:", err);
  }
}

/**
 * Auto-syncs any photos currently residing in this browser's localStorage
 * to Firestore cloud so that mobile devices and all other visitors can see them!
 */
export async function syncLocalPhotosToFirestore(isAdmin: boolean): Promise<{ syncedCount: number; errors: string[] }> {
  if (!isAdmin) {
    return { syncedCount: 0, errors: ["관리자 권한이 필요합니다."] };
  }

  const keys: (keyof typeof LOCAL_STORAGE_KEYS)[] = ['heroPhoto', 'staffPhoto', 'pastorPhoto'];
  let syncedCount = 0;
  const errors: string[] = [];

  for (const key of keys) {
    try {
      const localData = localStorage.getItem(LOCAL_STORAGE_KEYS[key]);
      if (localData && localData.startsWith('data:image/')) {
        // Upload to Firestore
        await saveChurchPhoto(key, localData, isAdmin);
        syncedCount++;
      }
    } catch (err: unknown) {
      console.error(`Failed to sync ${key} to Firestore:`, err);
      errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { syncedCount, errors };
}

/**
 * Inspect cloud status of photos
 */
export async function checkPhotosCloudStatus(): Promise<{
  heroPhotoCloud: boolean;
  staffPhotoCloud: boolean;
  pastorPhotoCloud: boolean;
}> {
  try {
    const [heroSnap, staffSnap, pastorSnap, combinedSnap] = await Promise.all([
      getDoc(doc(db, 'site_settings', 'photo_hero')),
      getDoc(doc(db, 'site_settings', 'photo_staff')),
      getDoc(doc(db, 'site_settings', 'photo_pastor')),
      getDoc(doc(db, 'site_settings', 'photos')),
    ]);

    const combined = combinedSnap.exists() ? combinedSnap.data() : {};

    return {
      heroPhotoCloud: heroSnap.exists() || !!combined.heroPhoto,
      staffPhotoCloud: staffSnap.exists() || !!combined.staffPhoto,
      pastorPhotoCloud: pastorSnap.exists() || !!combined.pastorPhoto,
    };
  } catch (err) {
    console.warn("Failed to check cloud photos status:", err);
    return { heroPhotoCloud: false, staffPhotoCloud: false, pastorPhotoCloud: false };
  }
}
