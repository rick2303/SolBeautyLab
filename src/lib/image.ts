"use client";

/**
 * Reduce una imagen a máx. `maxDim` px por lado y la re-comprime como JPEG.
 * Sirve para comprobantes de depósito: mantiene el archivo pequeño (rápido de
 * subir, cabe en el límite de las server actions y no llena el storage).
 * Si el archivo no es imagen o algo falla, devuelve el original sin tocarlo.
 */
export async function downscaleImage(
  file: File,
  maxDim = 1400,
  quality = 0.82
): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Igual que downscaleImage pero devuelve un data URL (para pasarlo a una server action). */
export async function downscaleToDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.82
): Promise<string> {
  const blob = await downscaleImage(file, maxDim, quality);
  return readAsDataUrl(blob);
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("image load failed"));
    i.src = src;
  });
}
