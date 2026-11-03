import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Lit un fichier sous forme de base64 Data URL (fallback robuste)
 */
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Téléverse un fichier vers Firebase Storage avec repli transparent vers Data URL
 */
export const uploadMediaFile = async (
  file: File,
  folder: string = 'announcements'
): Promise<UploadResult> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type
    });
    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (storageErr) {
    console.warn('Firebase Storage upload indisponible ou restreint, utilisation du stockage embarqué:', storageErr);
    // Repli immédiat sur Data URL pour garantir que l'utilisateur n'est jamais bloqué
    const dataUrl = await readFileAsDataURL(file);
    return {
      url: dataUrl,
      name: file.name,
      size: file.size,
      type: file.type
    };
  }
};
