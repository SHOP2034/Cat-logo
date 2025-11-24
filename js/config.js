// CONFIG (valores que deberás completar)
// No pongas secretos del API en el frontend salvo el upload preset (unsigned).
export const APP_CONFIG = {
  // Cloudinary: completa cuando tengas valores
  CLOUDINARY_CLOUD_NAME: "tu-cloud-name",       // <-- tu cloud name
  CLOUDINARY_UPLOAD_PRESET: "tu-upload-preset",    // <-- upload preset (unsigned)
  CLOUDINARY_DELETE_ENDPOINT: "tu-endpoint-delete",  // <-- worker URL (opcional, para eliminar)

  // Opciones UI / thresholds
  STOCK_THRESHOLD_CRITICAL: 5,
  STOCK_THRESHOLD_LOW: 10,
  STOCK_THRESHOLD_MEDIUM: 15
};