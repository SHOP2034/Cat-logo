// app.js - punto de entrada (con Cloudinary, Firebase, IA key sync)
import { db, auth } from "./firebase.js";
import * as Cloud from "./cloudinary.js";
import * as UI from "./ui.js";
import * as Prod from "./products.js";
import { generarDescripcionIA } from "./ai.js";

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const form = document.getElementById("admin-form");
const fileInput = document.getElementById("cloudinary-file-input");
const uploadBtn = document.getElementById("btn-upload-cloudinary");
const searchInput = document.getElementById("search-input");
const globalOrder = document.getElementById("global-order");
const importInput = document.getElementById("import-excel-input");

let OPENAI_KEY = null;
let currentUser = null;

// utils Firestore ajustes
async function guardarOpenAIKeyToFirestore(uid, key) {
  const ref = doc(db, "ajustes", uid);
  await setDoc(ref, { openaiKey: key }, { merge: true });
}

async function cargarOpenAIKeyFromFirestore(uid) {
  const ref = doc(db, "ajustes", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().openaiKey : null;
}

// init UI
UI.initDrawer();

// file upload
uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  UI.showLoader();
  try {
    await Prod.uploadImageAndAppend(file, document.getElementById("admin-categoria").value || "General");
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Error subiendo imagen", "error");
  } finally {
    UI.hideLoader();
  }
});

// form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("producto-id").value || null;
  const codigo = document.getElementById("admin-codigo").value.trim();
  const categoria = document.getElementById("admin-categoria").value;
  const nombre = document.getElementById("admin-nombre").value.trim();
  const precio = parseFloat(document.getElementById("admin-precio").value) || 0;
  const descripcion = document.getElementById("admin-descripcion").value.trim();
  const cantidad = parseInt(document.getElementById("admin-cantidad").value) || 0;
  const enEspera = document.getElementById("admin-en-espera").checked;
  const imagen = document.querySelector("#image-album img.selected")?.src || "";

  if (!imagen) { Swal.fire("Error", "Selecciona una imagen", "error"); return; }
  if (!categoria) { Swal.fire("Error", "Selecciona una categoría", "error"); return; }

  UI.showLoader();
  try {
    await Prod.saveProduct({ id, codigo, categoria, nombre, precio, descripcion, cantidad, enEspera, imagen });
    await Prod.cargarProductos(searchInput.value);
    form.reset();
    UI.setImagePreview("");
    document.getElementById("cancelar-edicion").classList.add("d-none");
    document.getElementById("form-title").textContent = "Añadir Producto";
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "No se pudo guardar el producto", "error");
  } finally {
    UI.hideLoader();
  }
});

// cancelar edición
document.getElementById("cancelar-edicion").addEventListener("click", () => {
  form.reset();
  UI.setImagePreview("");
  document.getElementById("cancelar-edicion").classList.add("d-none");
  document.getElementById("form-title").textContent = "Añadir Producto";
});

// search debounced
let t;
searchInput.addEventListener("input", (e) => {
  clearTimeout(t);
  t = setTimeout(() => {
    Prod.cargarProductos(searchInput.value);
  }, 220);
});

// clear search
document.getElementById("search-clear").addEventListener("click", () => {
  searchInput.value = "";
  document.getElementById("search-suggestions").classList.remove("show");
  Prod.cargarProductos();
});

// order change
if (globalOrder) globalOrder.addEventListener("change", () => Prod.cargarProductos(searchInput.value));

// export listeners
document.querySelectorAll("[data-exp]").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const tipo = e.target.dataset.exp;
    await Prod.exportInventario(tipo);
  });
});

// import excel UI
if (document.getElementById("import-excel")) {
  document.getElementById("import-excel").addEventListener("click", () => importInput.click());
}
if (importInput) {
  importInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    UI.showLoader();
    try {
      await Prod.importarExcel(file);
      Swal.fire("OK", "Importación terminada", "success");
      Prod.cargarProductos();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Error importando Excel", "error");
    } finally {
      UI.hideLoader();
    }
  });
}

// Generar descripción IA (usa OPENAI_KEY cargada desde Firestore)
document.getElementById("btn-ia-descripcion").addEventListener("click", async () => {
  const nombre = document.getElementById("admin-nombre").value.trim();
  const categoria = document.getElementById("admin-categoria").value.trim();
  if (!nombre) { Swal.fire("Error", "Ingresá un nombre antes de generar la descripción", "error"); return; }

  if (!OPENAI_KEY) {
    Swal.fire("Sin API Key", "Configurá tu API Key de OpenAI en Ajustes", "warning");
    return;
  }

  Swal.fire({ title: "Generando descripción...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const texto = await generarDescripcionIA(OPENAI_KEY, nombre, categoria);
    document.getElementById("admin-descripcion").value = texto;
    Swal.close();
    Swal.fire("Listo", "Descripción generada", "success");
  } catch (err) {
    Swal.close();
    console.error(err);
    Swal.fire("Error", err.message || "No se pudo generar descripción", "error");
  }
});

// Guardar API Key (sincroniza con Firestore para multi-device)
document.getElementById("guardar-openai").addEventListener("click", async () => {
  const key = document.getElementById("openai-key").value.trim();
  if (!key || !key.startsWith("sk-")) { Swal.fire("Error", "API Key inválida", "error"); return; }
  if (!currentUser) { Swal.fire("Error", "Debes iniciar sesión para guardar la API Key", "error"); return; }

  try {
    await guardarOpenAIKeyToFirestore(currentUser.uid, key);
    OPENAI_KEY = key;
    Swal.fire("Guardado", "API Key guardada y sincronizada", "success");
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "No se pudo guardar la API Key", "error");
  }
});

// Auth state
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    document.querySelector("main").style.display = "block";
    Prod.cargarImagenesEnAlbum();
    Prod.cargarProductos();

    // cargar openai key si existe
    try {
      const key = await cargarOpenAIKeyFromFirestore(user.uid);
      OPENAI_KEY = key || null;
      if (key) document.getElementById("openai-key").value = key;
    } catch (err) {
      console.warn("No se pudo cargar OpenAI key:", err);
    }

  } else {
    document.querySelector("main").style.display = "none";
  }
});

// Mobile enhancements
function initMobileEnhancements() {
  const header = document.querySelector(".app-header");
  const searchInputEl = document.getElementById("search-input");
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    if (window.innerWidth <= 768) {
      if (window.scrollY > lastScrollY && window.scrollY > 100) header.style.transform = "translateY(-100%)";
      else header.style.transform = "translateY(0)";
      lastScrollY = window.scrollY;
    }
  });
  if (searchInputEl) {
    searchInputEl.addEventListener("focus", () => { if (window.innerWidth <= 768) header.classList.add("header-expanded"); });
    searchInputEl.addEventListener("blur", () => header.classList.remove("header-expanded"));
  }
  document.addEventListener('touchstart', function(){}, {passive:true});
}
document.addEventListener("DOMContentLoaded", initMobileEnhancements);