// Resizes and re-encodes an uploaded image in the browser before it's turned
// into a base64 string, so a multi-MB camera photo doesn't get sent to the
// server (and hit nginx's/the app's upload size limits) at full size.
// Also center-crops to whichever of 16:9, 9:16, or 1:1 the photo is closest
// to, so every uploaded photo ends up one of those three consistent shapes.
const allowedRatios = [16 / 9, 9 / 16, 1];

export function compressImageFile(file: File, maxDimension = 1600, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read the selected image."));
      img.onload = () => {
        const sourceRatio = img.width / img.height;
        const targetRatio = allowedRatios.reduce((closest, ratio) =>
          Math.abs(Math.log(ratio) - Math.log(sourceRatio)) < Math.abs(Math.log(closest) - Math.log(sourceRatio)) ? ratio : closest
        );

        let cropWidth = img.width;
        let cropHeight = img.height;
        if (sourceRatio > targetRatio) cropWidth = cropHeight * targetRatio;
        else cropHeight = cropWidth / targetRatio;
        const cropX = (img.width - cropWidth) / 2;
        const cropY = (img.height - cropHeight) / 2;

        const scale = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(cropWidth * scale);
        canvas.height = Math.round(cropHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(String(reader.result)); return; }
        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
