// Wrapper para Fuse.js (búsqueda difusa)
let fuseInstance = null;

export function initFuse(productsArray) {
  // productsArray: [{codigo,nombre,categoria,descripcion,...}, ...]
  if (!window.Fuse) {
    console.warn("Fuse.js no cargado. Instala Fuse o añade el CDN en tu HTML.");
    return null;
  }
  fuseInstance = new Fuse(productsArray, {
    keys: ["codigo","nombre","categoria","descripcion"],
    threshold: 0.35,
    ignoreLocation: true
  });
  return fuseInstance;
}

export function fuseSearch(text) {
  if (!fuseInstance || !text || text.trim().length === 0) return null;
  const res = fuseInstance.search(text.trim());
  return res.map(r => r.item);
}

export function updateFuseCollection(productsArray) {
  if (fuseInstance) fuseInstance.setCollection(productsArray);
  else initFuse(productsArray);
}

