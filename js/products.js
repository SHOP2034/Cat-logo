// products.js - CRUD, render, export (XLSX, CSV, DOC, PDF), importar XLSX
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { uploadToCloudinary, listCloudinaryImages, requestDelete } from "./cloudinary.js";
import { showLoader, hideLoader, notifyToast, openSection, setImagePreview, stockBadgeHTML } from "./ui.js";

const productsCol = collection(db, "productos");

// helpers
const downloadBlob = (blob, filename) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

function formatCurrency(n) {
  return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// cargar imágenes album
export async function cargarImagenesEnAlbum(albumElId = "image-album") {
  const albumEl = document.getElementById(albumElId);
  if (!albumEl) return;
  albumEl.innerHTML = "";
  try {
    const imgs = await listCloudinaryImages();
    imgs.forEach(img => {
      const wrapper = document.createElement("div");
      wrapper.className = "cloudinary-image";
      const url = img.secure_url || `https://res.cloudinary.com/${img.public_id.split("/")[0]}/image/upload/${img.public_id}.jpg`;

      wrapper.innerHTML = `<img src="${url}" data-publicid="${img.public_id}"><button class="delete-img-btn">🗑️</button>`;
      wrapper.querySelector("img").addEventListener("click", () => {
        document.querySelectorAll(`#${albumElId} img`).forEach(i => i.classList.remove("selected"));
        wrapper.querySelector("img").classList.add("selected");
        setImagePreview(wrapper.querySelector("img").src);
      });
      wrapper.querySelector(".delete-img-btn").addEventListener("click", async () => {
        if (!confirm("Eliminar imagen permanentemente?")) return;
        try { await requestDelete(img.public_id); wrapper.remove(); notifyToast("Imagen eliminada","success"); }
        catch(e){ console.error(e); notifyToast("Error eliminando","error"); }
      });
      albumEl.appendChild(wrapper);
    });
  } catch (err) {
    console.warn("No se pudieron listar imágenes:", err);
  }
}

// upload
export async function uploadImageAndAppend(file, categoria = "General") {
  const resp = await uploadToCloudinary(file, categoria);
  const album = document.getElementById("image-album");
  const wrapper = document.createElement("div");
  wrapper.className = "cloudinary-image";
  wrapper.innerHTML = `<img src="${resp.secure_url}" data-publicid="${resp.public_id}"><button class="delete-img-btn">🗑️</button>`;
  album.prepend(wrapper);
  wrapper.querySelector("img").classList.add("selected");
  setImagePreview(resp.secure_url);
  wrapper.querySelector(".delete-img-btn").addEventListener("click", async () => {
    if (!confirm("Eliminar imagen?")) return;
    try { await requestDelete(resp.public_id); wrapper.remove(); setImagePreview(""); notifyToast("Imagen eliminada","success"); }
    catch(e){ console.error(e); notifyToast("Error eliminando","error"); }
  });
}

// render item
function buildProductItem(prod) {
  const id = prod.id;
  const wrapper = document.createElement("div");
  wrapper.className = "list-group-item d-flex justify-content-between";
  wrapper.innerHTML = `
    <div class="d-flex align-items-center" style="gap:12px;">
      <img src="${prod.imagen}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;" alt="${prod.nombre}">
      <div style="min-width:0">
        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${prod.nombre}</div>
        <div class="small text-muted">Código: ${prod.codigo || '-'} — ${prod.categoria || '-'} — $${formatCurrency(prod.precio)}</div>
        <div class="mt-1">${stockBadgeHTML(prod.cantidad ?? 0)}</div>
        <div class="stock-controls mt-2">
          <button class="stock-btn stock-down" data-id="${id}">−1</button>
          <button class="stock-btn stock-up" data-id="${id}">+1</button>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
      <button class="btn btn-sm btn-outline-primary editar" data-id="${id}">✏️ Editar</button>
      <button class="btn btn-sm btn-outline-secondary ver" data-id="${id}">🔎 Ver</button>
      <button class="btn btn-sm btn-outline-danger eliminar" data-id="${id}">🗑️</button>
    </div>
  `;
  return wrapper;
}

// cargar categorias select (intenta storage)
function cargarCategoriasEnSelect(categoriaSeleccionada = "") {
  const select = document.getElementById("admin-categoria");
  if (!select) return;
  setTimeout(() => {
    import("./storage.js").then(({ loadSettings }) => {
      loadSettings("categorias").then(categorias => {
        if (!categorias?.length) return;
        const first = select.querySelector("option");
        const selectedValue = categoriaSeleccionada || select.value;
        select.innerHTML = "";
        if (first) select.appendChild(first);
        categorias.forEach(cat => {
          const op = document.createElement("option");
          op.value = cat;
          op.textContent = cat;
          if (cat === selectedValue) op.selected = true;
          select.appendChild(op);
        });
      });
    });
  }, 100);
}

// cargar productos
export async function cargarProductos(filterText = "") {
  const adminProductos = document.getElementById("admin-productos");
  if (!adminProductos) return;
  adminProductos.innerHTML = "";
  showLoader();
  try {
    const snap = await getDocs(productsCol);
    let productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // búsqueda (si existe)
    if (filterText && filterText.trim().length > 0) {
      try {
        const { fuseSearch, initFuse } = await import("./search.js");
        initFuse(productos);
        productos = fuseSearch(filterText) || productos;
      } catch (e) { /* ignore if search.js not present */ }
    }

    // orden
    const order = document.getElementById("global-order")?.value || "creado_desc";
    productos.sort((a,b) => {
      switch(order){
        case "creado_desc": return (b.creado?.seconds||0)-(a.creado?.seconds||0);
        case "creado_asc": return (a.creado?.seconds||0)-(b.creado?.seconds||0);
        case "precio_asc": return (a.precio||0)-(b.precio||0);
        case "precio_desc": return (b.precio||0)-(a.precio||0);
        case "stock_asc": return (a.cantidad||0)-(b.cantidad||0);
        case "stock_desc": return (b.cantidad||0)-(a.cantidad||0);
        default: return 0;
      }
    });

    productos.forEach(p => adminProductos.appendChild(buildProductItem(p)));

    // events +1/-1
    adminProductos.querySelectorAll(".stock-up").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ref = doc(db, "productos", id);
        const s = await getDoc(ref);
        const cantidad = (s.data()?.cantidad ?? 0) + 1;
        await updateDoc(ref, { cantidad });
        await cargarProductos(filterText);
      });
    });
    adminProductos.querySelectorAll(".stock-down").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ref = doc(db, "productos", id);
        const s = await getDoc(ref);
        let cantidad = s.data()?.cantidad ?? 0;
        if (cantidad > 0) cantidad--;
        await updateDoc(ref, { cantidad });
        await cargarProductos(filterText);
      });
    });

    // ver/editar/eliminar
    adminProductos.querySelectorAll(".ver").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        sessionStorage.setItem("lastViewedProduct", id);
        document.querySelector(`.editar[data-id='${id}']`)?.click();
      });
    });
    adminProductos.querySelectorAll(".editar").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ref = doc(db, "productos", id);
        const s = await getDoc(ref);
        const data = s.data() || {};
        document.getElementById("producto-id").value = id;
        document.getElementById("admin-codigo").value = data.codigo || "";
        document.getElementById("admin-categoria").value = data.categoria || "";
        document.getElementById("admin-nombre").value = data.nombre || "";
        document.getElementById("admin-precio").value = data.precio || 0;
        document.getElementById("admin-descripcion").value = data.descripcion || "";
        document.getElementById("admin-cantidad").value = data.cantidad ?? 0;
        document.getElementById("admin-en-espera").checked = !!data.enEspera;
        setImagePreview(data.imagen || "");
        cargarCategoriasEnSelect(data.categoria || "");
        openSection("add");
        document.getElementById("cancelar-edicion").classList.remove("d-none");
        document.getElementById("form-title").textContent = "Editar Producto";
      });
    });
    adminProductos.querySelectorAll(".eliminar").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Eliminar producto?")) return;
        const id = btn.dataset.id;
        await deleteDoc(doc(db, "productos", id));
        await cargarProductos(filterText);
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    hideLoader();
  }
}

// save product
export async function saveProduct(payload) {
  if (payload.id) {
    const ref = doc(db, "productos", payload.id);
    await updateDoc(ref, {
      codigo: payload.codigo,
      categoria: payload.categoria,
      nombre: payload.nombre,
      precio: payload.precio,
      descripcion: payload.descripcion,
      cantidad: payload.cantidad,
      enEspera: payload.enEspera,
      imagen: payload.imagen
    });
    return payload.id;
  } else {
    const res = await addDoc(productsCol, {
      codigo: payload.codigo,
      categoria: payload.categoria,
      nombre: payload.nombre,
      precio: payload.precio,
      descripcion: payload.descripcion,
      cantidad: payload.cantidad,
      enEspera: payload.enEspera,
      imagen: payload.imagen,
      creado: serverTimestamp()
    });
    return res.id;
  }
}

// EXPORT: xlsx / csv / doc / pdf
export async function exportInventario(tipo = "xlsx", options = {}) {
  const snap = await getDocs(productsCol);
  let productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // filters
  if (options.onlyCategory) productos = productos.filter(p => p.categoria === options.onlyCategory);
  if (options.onlyNoStock) productos = productos.filter(p => !p.cantidad || p.cantidad === 0);

  const data = productos.map(p => ({
    Código: p.codigo || "",
    Nombre: p.nombre || "",
    Categoría: p.categoria || "",
    Precio: Number(p.precio || 0),
    Stock: Number(p.cantidad || 0),
    En_Espera: p.enEspera ? "Sí" : "No"
  }));

  if (!data.length) { alert("No hay productos para exportar."); return; }

  // XLSX
  if (tipo === "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `Inventario_${new Date().toISOString().slice(0,10)}.xlsx`);
    return;
  }

  // CSV
  if (tipo === "csv") {
    const header = Object.keys(data[0]);
    let csv = header.join(",") + "\n";
    data.forEach(row => {
      const vals = header.map(k => `"${String(row[k] ?? "").replace(/"/g,'""')}"`);
      csv += vals.join(",") + "\n";
    });
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `Inventario_${new Date().toISOString().slice(0,10)}.csv`);
    return;
  }

  // DOC (HTML -> .doc)
  if (tipo === "doc") {
    const html = `
      <html><head><meta charset="utf-8"><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#2b2b2b}h1{background:#eaf4ff;padding:10px;color:#1f6fb2}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}
      th{background:#f0f8ff;color:#0b3d91}
      </style></head><body>
      <h1>Inventario - LimpiArte</h1>
      <p>Exportado: ${new Date().toLocaleString()}</p>
      <table><thead><tr>${Object.keys(data[0]).map(h=>`<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${data.map(r=>`<tr>${Object.values(r).map(v=>`<td>${String(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      </body></html>
    `;
    downloadBlob(new Blob([html], { type: "application/msword" }), `Inventario_${new Date().toISOString().slice(0,10)}.doc`);
    return;
  }

  // PDF
  if (tipo === "pdf") {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p","pt","a4");
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(246,250,255);
    pdf.rect(0,0,pageWidth,72,"F");
    pdf.setFontSize(18); pdf.setTextColor(44,62,80);
    pdf.text("Inventario - LimpiArte", 40, 44);
    pdf.setFontSize(10); pdf.setTextColor(100);
    pdf.text(`Exportado: ${new Date().toLocaleString()}`, 40, 60);

    const head = [Object.keys(data[0])];
    const body = data.map(r => Object.values(r));

    pdf.autoTable({
      startY: 90,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor:[240,247,255], textColor:[14,56,112] },
      styles: { fontSize:10, cellPadding:6 },
      margin: { left:40, right:40 },
      didDrawPage: function () {
        pdf.setFontSize(9); pdf.setTextColor(140);
        const page = pdf.internal.getCurrentPageInfo().pageNumber;
        const total = pdf.internal.getNumberOfPages();
        pdf.text(`Página ${page} / ${total}`, pageWidth - 80, pdf.internal.pageSize.getHeight() - 20);
      }
    });

    pdf.save(`Inventario_${new Date().toISOString().slice(0,10)}.pdf`);
    return;
  }
}

// compat exportCSV
export async function exportCSV() { return exportInventario("csv"); }

// importar Excel
export async function importarExcel(file, opts = { skipDuplicatesByCode: true }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = e.target.result;
        const workbook = XLSX.read(raw, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        // existing codes
        let existing = {};
        if (opts.skipDuplicatesByCode) {
          const snap = await getDocs(productsCol);
          snap.docs.forEach(d => { const dd = d.data(); if (dd.codigo) existing[dd.codigo] = true; });
        }

        for (const row of rows) {
          const codigo = row.Código || row.Code || row.codigo || "";
          if (opts.skipDuplicatesByCode && codigo && existing[codigo]) continue;
          await addDoc(productsCol, {
            codigo: codigo || "",
            nombre: row.Nombre || row.name || "",
            categoria: row.Categoría || row.Categoria || row.category || "General",
            precio: Number(row.Precio || row.Price || 0),
            cantidad: Number(row.Stock || row.Stock || 0),
            enEspera: String(row.En_Espera || "").toLowerCase().startsWith("s"),
            imagen: row.Imagen || "",
            creado: serverTimestamp()
          });
        }

        resolve();
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}