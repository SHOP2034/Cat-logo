// Funciones relacionadas con Cloudinary: compresión, subir, listar (JSON) y auxiliar delete call (frontend -> worker)
// IMPORTANTE: completar los valores en config.js (CLOUDINARY_*). Esta capa solo usa esos valores.

import { APP_CONFIG } from "./config.js";

// compressImage: usa canvas para reducir peso y tamaño
export function compressImage(file, quality = 0.75, maxWidth = 900) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", quality);
    };
    img.onerror = () => resolve(file); // fallback: devolver original
    img.src = URL.createObjectURL(file);
  });
}

// uploadToCloudinary: sube imagen comprimida a carpeta por categoría
export async function uploadToCloudinary(file, categoria = "General") {
  if (!APP_CONFIG.CLOUDINARY_CLOUD_NAME || !APP_CONFIG.CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary no configurado. Completa CLOUDINARY_* en config.js");
  }

  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("file", compressed);
  fd.append("upload_preset", APP_CONFIG.CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder", `limpiarte/${categoria}`);

  const url = `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const resp = await fetch(url, { method: "POST", body: fd });
  if (!resp.ok) throw new Error("Error subiendo a Cloudinary");
  return resp.json(); // contiene secure_url y public_id
}

// listarImagenesCloudinary: usa el JSON público generado por Cloudinary (image/list/<tag>.json)
export async function listCloudinaryImages(tag = "limpiarte") {
  if (!APP_CONFIG.CLOUDINARY_CLOUD_NAME) return [];
  const url = `https://res.cloudinary.com/${APP_CONFIG.CLOUDINARY_CLOUD_NAME}/image/list/${tag}.json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.resources || [];
}

// requestDelete: llama al endpoint backend (Cloudflare Worker) para eliminar public_id
export async function requestDelete(public_id) {
  if (!APP_CONFIG.CLOUDINARY_DELETE_ENDPOINT) {
    throw new Error("DELETE endpoint no configurado en config.js");
  }
  const res = await fetch(APP_CONFIG.CLOUDINARY_DELETE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_id })
  });
  if (!res.ok) throw new Error("Error borrando en Cloudinary via backend");
  return res.json();
}

