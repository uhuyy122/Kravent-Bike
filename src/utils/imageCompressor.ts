/**
 * Utilitas kompresi gambar sisi klien (Client-side Image Optimization)
 * Memastikan upload foto langsung dari perangkat (HP/Kamera/Galeri)
 * dikompresi menjadi ukuran super ringan (~30 - 60 KB)
 * sehingga TIDAK membebani kapasitas memori, kuota localStorage, atau kecepatan loading web.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  savedPercentage: number;
  width: number;
  height: number;
}

/**
 * Kompres file gambar dari perangkat menjadi WebP/JPEG berukuran sangat ringan
 * @param file File objek dari input type="file"
 * @param maxWidth Lebar maksimum (default 900px, sangat tajam untuk layar smartphone/laptop)
 * @param maxHeight Tinggi maksimum (default 700px)
 * @param quality Kualitas kompresi 0.1 - 1.0 (default 0.72)
 */
export async function compressImageFile(
  file: File,
  maxWidth = 900,
  maxHeight = 700,
  quality = 0.72
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // Hitung proporsi dimensi baru dengan menjaga aspect ratio
        let targetWidth = img.width;
        let targetHeight = img.height;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        // Buat canvas untuk rendering & kompresi
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal mendapatkan konteks grafis canvas'));
          return;
        }

        // Gambar dengan smoothing berkualitas tinggi
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Ekspor ke format WebP (atau fallback JPEG jika webp tidak didukung)
        let outputType = 'image/webp';
        let dataUrl = canvas.toDataURL(outputType, quality);

        // Fallback jika browser lawas tidak menghasilkan webp
        if (!dataUrl.startsWith('data:image/webp')) {
          outputType = 'image/jpeg';
          dataUrl = canvas.toDataURL(outputType, quality);
        }

        // Hitung ukuran hasil kompresi (dalam KB)
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const compressedSizeBytes = Math.round((base64Length * 3) / 4);
        const compressedSizeKb = Math.max(1, Math.round(compressedSizeBytes / 1024));

        const savedPercentage = originalSizeKb > 0
          ? Math.max(0, Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100))
          : 0;

        resolve({
          dataUrl,
          originalSizeKb,
          compressedSizeKb,
          savedPercentage,
          width: targetWidth,
          height: targetHeight,
        });
      };

      img.onerror = () => {
        reject(new Error('Format berkas gambar tidak dapat diproses.'));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca berkas dari perangkat.'));
    };

    reader.readAsDataURL(file);
  });
}
