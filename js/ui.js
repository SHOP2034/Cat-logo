// Funciones y helpers UI: loader, drawer, secciones, mensajes, preview, resaltado
import { APP_CONFIG } from "./config.js";

export function showLoader() { 
  const loader = document.getElementById("loader");
  if (loader) loader.classList.remove("d-none"); 
}

export function hideLoader() { 
  const loader = document.getElementById("loader");
  if (loader) loader.classList.add("d-none"); 
}

export function notifyToast(title, icon = "info", timer = 2000) {
  if (window.Swal) {
    Swal.fire({ title, icon, toast: true, position: "top-end", timer, showConfirmButton: false });
  }
}

// Drawer / secciones
const appDrawer = document.getElementById("app-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const btnHamburger = document.getElementById("btn-hamburger");
const drawerClose = document.getElementById("drawer-close");
const drawerLinks = document.querySelectorAll(".drawer-link");

export function initDrawer() {
  if (btnHamburger) btnHamburger.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
  
  drawerLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      openSection(section);
      closeDrawer();
    });
  });
}

export function openDrawer() { 
  if (appDrawer) appDrawer.classList.add("open"); 
  if (drawerOverlay) drawerOverlay.classList.add("show"); 
}

export function closeDrawer() { 
  if (appDrawer) appDrawer.classList.remove("open"); 
  if (drawerOverlay) drawerOverlay.classList.remove("show"); 
}

// Secciones SIN DASHBOARD
export function openSection(name) {
  console.log(`Abriendo sección: ${name}`);
  
  const sections = {
    products: "section-products",
    add: "section-add", 
    categories: "section-categories",
    images: "section-images",
    settings: "section-settings"
  };
  
  // Ocultar todas las secciones
  Object.values(sections).forEach(sectionId => {
    const el = document.getElementById(sectionId);
    if (el) el.classList.add("d-none");
  });
  
  // Mostrar la sección solicitada
  const sectionToShow = sections[name];
  if (sectionToShow) {
    const el = document.getElementById(sectionToShow);
    if (el) {
      el.classList.remove("d-none");
      console.log(`Sección ${sectionToShow} mostrada`);
    }
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function setImagePreview(url) {
  const preview = document.getElementById("selected-image-preview");
  if (!preview) return;
  if (!url) {
    preview.src = "";
    preview.classList.add("d-none");
    return;
  }
  preview.src = url;
  preview.classList.remove("d-none");
}

export function tempHighlight(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add("highlight-temp");
  setTimeout(() => el.classList.remove("highlight-temp"), 2200);
}

export function stockBadgeHTML(cantidad) {
  let clase = "stock-green";
  if (cantidad <= APP_CONFIG.STOCK_THRESHOLD_CRITICAL) clase = "stock-red";
  else if (cantidad <= APP_CONFIG.STOCK_THRESHOLD_LOW) clase = "stock-orange";
  else if (cantidad <= APP_CONFIG.STOCK_THRESHOLD_MEDIUM) clase = "stock-yellow";
  return `<span class="stock-badge ${clase}">Stock: ${cantidad}</span>`;
}