import { loadSettings, saveSettings } from './storage.js';
import { db } from "./firebase.js";
import { collection, getDocs, updateDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export class CategoriesManager {
  constructor() {
    this.listElement = document.getElementById('lista-categorias');
    this.inputNueva = document.getElementById('categoria-nueva');
    this.btnAgregar = document.getElementById('categoria-agregar');
    this.categorias = [];
    this.init();
  }

  async init() {
    this.categorias = (await loadSettings('categorias')) || [];
    this.render();
    this.btnAgregar.addEventListener('click', () => this.agregar());
    
    // Permitir agregar con Enter
    this.inputNueva.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.agregar();
      }
    });
  }

  guardar() {
    saveSettings('categorias', this.categorias);
    this.actualizarSelectCategorias();
  }

  async agregar() {
    const texto = this.inputNueva.value.trim();
    if (!texto) {
      this.mostrarAlerta('Por favor ingresa un nombre para la categoría', 'warning');
      return;
    }
    
    if (this.categorias.includes(texto)) {
      this.mostrarAlerta('Esta categoría ya existe', 'warning');
      return;
    }

    this.categorias.push(texto);
    this.inputNueva.value = '';
    this.guardar();
    this.render();
    this.mostrarAlerta(`Categoría "${texto}" agregada correctamente`, 'success');
  }

  async eliminar(index) {
    const categoria = this.categorias[index];
    
    // Verificar si hay productos usando esta categoría
    const productosConCategoria = await this.contarProductosPorCategoria(categoria);
    
    let mensaje = `¿Estás seguro de que quieres eliminar la categoría "${categoria}"?`;
    if (productosConCategoria > 0) {
      mensaje += `\n\n⚠️ ADVERTENCIA: Hay ${productosConCategoria} producto(s) usando esta categoría. Si eliminas esta categoría, esos productos quedarán sin categoría asignada.`;
    }
    
    const confirmacion = await this.mostrarConfirmacion('Eliminar categoría', mensaje);
    if (!confirmacion) return;

    this.categorias.splice(index, 1);
    this.guardar();
    this.render();
    this.mostrarAlerta(`Categoría "${categoria}" eliminada correctamente`, 'success');
  }

  async editar(index) {
    const categoriaActual = this.categorias[index];
    const { value: nuevaCategoria } = await Swal.fire({
      title: 'Editar categoría',
      input: 'text',
      inputLabel: 'Nuevo nombre de la categoría',
      inputValue: categoriaActual,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'El nombre de la categoría no puede estar vacío';
        }
        if (value !== categoriaActual && this.categorias.includes(value)) {
          return 'Ya existe una categoría con ese nombre';
        }
      }
    });

    if (nuevaCategoria && nuevaCategoria !== categoriaActual) {
      // Verificar si hay productos usando esta categoría
      const productosConCategoria = await this.contarProductosPorCategoria(categoriaActual);
      
      if (productosConCategoria > 0) {
        const confirmacion = await this.mostrarConfirmacion(
          'Actualizar productos', 
          `Hay ${productosConCategoria} producto(s) usando la categoría "${categoriaActual}". ¿Quieres actualizar estos productos para que usen la nueva categoría "${nuevaCategoria}"?`
        );
        
        if (confirmacion) {
          await this.actualizarProductosCategoria(categoriaActual, nuevaCategoria);
        }
      }

      this.categorias[index] = nuevaCategoria;
      this.guardar();
      this.render();
      this.mostrarAlerta(`Categoría actualizada correctamente`, 'success');
    }
  }

  // Contar productos por categoría
  async contarProductosPorCategoria(categoria) {
    try {
      const q = query(collection(db, "productos"), where("categoria", "==", categoria));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error contando productos:', error);
      return 0;
    }
  }

  // Actualizar productos cuando se cambia una categoría
  async actualizarProductosCategoria(categoriaVieja, categoriaNueva) {
    try {
      const q = query(collection(db, "productos"), where("categoria", "==", categoriaVieja));
      const querySnapshot = await getDocs(q);
      
      const updates = [];
      querySnapshot.forEach((document) => {
        updates.push(updateDoc(doc(db, "productos", document.id), {
          categoria: categoriaNueva
        }));
      });

      await Promise.all(updates);
      console.log(`Actualizados ${updates.length} productos de "${categoriaVieja}" a "${categoriaNueva}"`);
    } catch (error) {
      console.error('Error actualizando productos:', error);
      throw error;
    }
  }

  render() {
    this.listElement.innerHTML = '';
    
    if (this.categorias.length === 0) {
      this.listElement.innerHTML = `
        <li class="list-group-item text-center text-muted">
          No hay categorías creadas. Agrega una categoría nueva.
        </li>
      `;
      return;
    }

    this.categorias.forEach((cat, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      
      // Contenido principal
      const contenido = document.createElement('div');
      contenido.className = 'd-flex align-items-center justify-content-between w-100';
      
      // Nombre de la categoría
      const nombreSpan = document.createElement('span');
      nombreSpan.className = 'categoria-nombre';
      nombreSpan.textContent = cat;
      nombreSpan.style.fontWeight = '500';
      
      // Contador de productos (se cargará después)
      const contadorSpan = document.createElement('span');
      contadorSpan.className = 'badge bg-secondary ms-2 producto-contador';
      contadorSpan.textContent = '...';
      contadorSpan.title = 'Cargando cantidad de productos...';
      
      // Botones
      const botonesDiv = document.createElement('div');
      botonesDiv.className = 'd-flex gap-2';
      
      // Botón editar
      const btnEditar = document.createElement('button');
      btnEditar.className = 'btn btn-sm btn-outline-primary';
      btnEditar.innerHTML = '✏️ Editar';
      btnEditar.title = 'Editar categoría';
      btnEditar.addEventListener('click', () => this.editar(index));
      
      // Botón eliminar
      const btnEliminar = document.createElement('button');
      btnEliminar.className = 'btn btn-sm btn-outline-danger';
      btnEliminar.innerHTML = '🗑️ Eliminar';
      btnEliminar.title = 'Eliminar categoría';
      btnEliminar.addEventListener('click', () => this.eliminar(index));
      
      // Ensamblar
      const nombreContainer = document.createElement('div');
      nombreContainer.className = 'd-flex align-items-center';
      nombreContainer.appendChild(nombreSpan);
      nombreContainer.appendChild(contadorSpan);
      
      botonesDiv.appendChild(btnEditar);
      botonesDiv.appendChild(btnEliminar);
      
      contenido.appendChild(nombreContainer);
      contenido.appendChild(botonesDiv);
      
      li.appendChild(contenido);
      this.listElement.appendChild(li);
      
      // Cargar contador de productos después de renderizar
      this.cargarContadorProductos(cat, contadorSpan);
    });
  }

  // Cargar contador de productos para cada categoría
  async cargarContadorProductos(categoria, elemento) {
    try {
      const cantidad = await this.contarProductosPorCategoria(categoria);
      elemento.textContent = cantidad;
      
      // Cambiar color según la cantidad
      if (cantidad === 0) {
        elemento.className = 'badge bg-light text-dark ms-2 producto-contador';
        elemento.title = 'No hay productos en esta categoría';
      } else if (cantidad <= 5) {
        elemento.className = 'badge bg-warning ms-2 producto-contador';
        elemento.title = `${cantidad} producto(s) en esta categoría`;
      } else {
        elemento.className = 'badge bg-success ms-2 producto-contador';
        elemento.title = `${cantidad} producto(s) en esta categoría`;
      }
    } catch (error) {
      elemento.textContent = '?';
      elemento.className = 'badge bg-danger ms-2 producto-contador';
      elemento.title = 'Error al cargar';
    }
  }

  // Actualizar el select de categorías en el formulario
  actualizarSelectCategorias() {
    const select = document.getElementById('admin-categoria');
    if (!select) return;
    
    const valorActual = select.value;
    
    // Limpiar opciones excepto la primera
    const primeraOpcion = select.querySelector('option');
    select.innerHTML = '';
    if (primeraOpcion) select.appendChild(primeraOpcion);
    
    // Agregar categorías ordenadas alfabéticamente
    this.categorias.sort().forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
    
    // Restaurar valor si existe
    if (valorActual && this.categorias.includes(valorActual)) {
      select.value = valorActual;
    }
  }

  // Helper para mostrar alertas
  mostrarAlerta(mensaje, tipo = 'info') {
    if (window.Swal) {
      Swal.fire({
        title: mensaje,
        icon: tipo,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    } else {
      alert(mensaje);
    }
  }

  // Helper para mostrar confirmaciones
  async mostrarConfirmacion(titulo, mensaje) {
    if (window.Swal) {
      const result = await Swal.fire({
        title: titulo,
        text: mensaje,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      return result.isConfirmed;
    } else {
      return confirm(mensaje);
    }
  }

  // Obtener categorías para uso externo
  getCategorias() {
    return this.categorias;
  }
}