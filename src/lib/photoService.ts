import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface ChurchPhotos {
  heroPhoto?: string | null;
  staffPhoto?: string | null;
  pastorPhoto?: string | null;
}

const LOCAL_STORAGE_KEYS = {
  heroPhoto: 'church_hero_landing_photo',
  staffPhoto: 'church_custom_staff_photo',
  pastorPhoto: 'pastor_custom_photo',
} as const;

export function getInitialChurchPhotos(): ChurchPhotos {
  return {
    heroPhoto: localStorage.getItem(LOCAL_STORAGE_KEYS.heroPhoto),
    staffPhoto: localStorage.getItem(LOCAL_STORAGE_KEYS.staffPhoto),
    pastorPhoto: localStorage.getItem(LOCAL_STORAGE_KEYS.pastorPhoto),
  };
}

export function subscribeToChurchPhotos(callback: (photos: ChurchPhotos) => void): () => void {
  const photoDocRef = doc(db, 'site_settings', 'photos');

  const unsubscribe = onSnapshot(
    photoDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const photos: ChurchPhotos = {
          heroPhoto: data.heroPhoto || null,
          staffPhoto: data.staffPhoto || null,
          pastorPhoto: data.pastorPhoto || null,
        };

        // Sync to localStorage
        if (photos.heroPhoto) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.heroPhoto, photos.heroPhoto);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.heroPhoto);
        }

        if (photos.staffPhoto) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.staffPhoto, photos.staffPhoto);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.staffPhoto);
        }

        if (photos.pastorPhoto) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.pastorPhoto, photos.pastorPhoto);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.pastorPhoto);
        }

        callback(photos);
      } else {
        // Document does not exist yet; use localStorage values if any
        callback(getInitialChurchPhotos());
      }
    },
    (error) => {
      console.warn("Failed to listen to church photos from Firestore:", error);
      callback(getInitialChurchPhotos());
    }
  );

  return unsubscribe;
}

export function compressAndProcessImage(file: File, maxDimension = 1400, quality = 0.85): Promise<string> {
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
        // If PNG transparency is needed or standard image:
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function saveChurchPhoto(
  key: keyof typeof LOCAL_STORAGE_KEYS,
  dataUrl: string,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) {
    throw new Error("사진 변경은 교회 관리자 권한이 필요합니다.");
  }

  // Update localStorage immediately for fast UI feedback
  localStorage.setItem(LOCAL_STORAGE_KEYS[key], dataUrl);

  try {
    const photoDocRef = doc(db, 'site_settings', 'photos');
    await setDoc(
      photoDocRef,
      {
        [key]: dataUrl,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.email || 'admin',
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to save photo to Firestore:", err);
  }
}

export async function resetChurchPhoto(
  key: keyof typeof LOCAL_STORAGE_KEYS,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) {
    throw new Error("사진 변경은 교회 관리자 권한이 필요합니다.");
  }

  localStorage.removeItem(LOCAL_STORAGE_KEYS[key]);

  try {
    const photoDocRef = doc(db, 'site_settings', 'photos');
    await setDoc(
      photoDocRef,
      {
        [key]: deleteField(),
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.email || 'admin',
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to reset photo in Firestore:", err);
  }
}
