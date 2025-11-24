// storage.js

// Guardar ajustes o datos en localStorage 
export function saveSettings(key, data) { 
  try { 
    localStorage.setItem(key, JSON.stringify(data)); 
  } catch (err) { 
    console.error('Error guardando datos en storage:', err); 
  } 
}

// Cargar ajustes o datos desde localStorage 
export async function loadSettings(key) { 
  try { 
    const raw = localStorage.getItem(key); 
    return raw ? JSON.parse(raw) : null; 
  } catch (err) { 
    console.error('Error cargando datos desde storage:', err); 
    return null; 
  } 
}