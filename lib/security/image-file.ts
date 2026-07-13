const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function hasPngSignature(bytes: Uint8Array) {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}
function hasJpegSignature(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
function hasWebpSignature(bytes: Uint8Array) {
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function validateImageFile(file: File, maxBytes: number, label = "Image") {
  if (!allowedTypes.has(file.type)) throw new Error(`${label} must be PNG, JPG or WebP.`);
  if (file.size <= 0) throw new Error(`${label} is empty.`);
  if (file.size > maxBytes) throw new Error(`${label} may not exceed ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatureMatches = file.type === "image/png" ? hasPngSignature(bytes) : file.type === "image/jpeg" ? hasJpegSignature(bytes) : hasWebpSignature(bytes);
  if (!signatureMatches) throw new Error(`${label} does not contain valid ${file.type.replace("image/", "").toUpperCase()} image data.`);
}
