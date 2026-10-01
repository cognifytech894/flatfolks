// Decodes any image file the browser can read (JPG, PNG, WebP, GIF, AVIF, BMP,
// SVG, ...). iPhone HEIC/HEIF photos only decode natively in Safari, so for
// those the heic2any converter is loaded on demand (it's large, so it's never
// part of the normal bundle) and turns them into a JPEG first.
function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

export async function loadImageFile(file: File): Promise<HTMLImageElement> {
  try {
    return await decode(file);
  } catch {
    if (isHeic(file)) {
      try {
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        return await decode(Array.isArray(converted) ? converted[0] : converted);
      } catch { /* fall through to the generic message */ }
    }
    throw new Error("This photo format can't be opened. Please choose a JPG, PNG, WebP or HEIC image.");
  }
}

// Frees the object URL created by loadImageFile once the image is no longer shown.
export function releaseImage(img: HTMLImageElement) {
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
}
