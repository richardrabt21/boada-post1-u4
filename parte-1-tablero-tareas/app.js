"use strict";

// Estado central de la aplicación
let tareas = [];
let filtroEstado = "todas";
let filtroPrioridad = "todas";

// Secuencia de estados posibles, en el orden en que una tarea avanza
const SECUENCIA_ESTADOS = ["pendiente", "en-progreso", "completada"];

// Obtiene el valor de un campo de texto y lo limpia
const leerCampo = (selector) => {
  const campo = document.querySelector(selector);
  const valor = campo.value.trim();
  campo.value = "";
  return valor;
};

// Referencia al contenedor del tablero
const tablero = document.querySelector("#tablero");

// Estrategia A — closure / patrón módulo.
// Se eligió esta estrategia (en vez de una variable let expuesta a nivel
// de módulo) porque el contador queda encapsulado dentro del closure: solo
// es accesible a través de la función que crearGeneradorId() devuelve.
// Ningún otro código del archivo puede leer ni reasignar el contador
// directamente, lo que evita que un error en otra parte del programa lo
// corrompa por accidente. El resto del laboratorio solo necesita conocer
// generarId(), sin importarle cómo se genera el número internamente.
function crearGeneradorId() {
  let contador = 1; // variable privada, solo visible dentro del closure
  return () => contador++;
}

const generarId = crearGeneradorId();

// Checkpoint de comprensión: se usa switch en vez de if/else-if porque
// todas las ramas comparan la misma variable (prioridad) contra valores
// discretos y conocidos de antemano ("alta", "media", "baja"), sin rangos
// ni condiciones compuestas. Es exactamente el caso de uso donde switch
// resulta más legible que una cadena de if/else-if, porque dejan a la vista
// de un vistazo todos los casos posibles y su valor de retorno.
function obtenerConfigPrioridad(prioridad) {
  switch (prioridad) {
    case "alta":
      return { clase: "prioridad-alta", etiqueta: "Alta" };
    case "media":
      return { clase: "prioridad-media", etiqueta: "Media" };
    case "baja":
      return { clase: "prioridad-baja", etiqueta: "Baja" };
    default:
      return { clase: "prioridad-media", etiqueta: "Media" };
  }
}

function crearElementoTarea({ id, titulo, descripcion, prioridad, estado }) {
  const { clase: clasePrioridad, etiqueta: etiquetaPrioridad } = obtenerConfigPrioridad(prioridad);

  const tarea = document.createElement("article");
  tarea.classList.add("tarea", `estado-${estado}`, clasePrioridad);
  tarea.dataset.id = id;

  const puedeAvanzar = estado !== "completada";

  tarea.innerHTML = `
    <span class="badge-prioridad">${etiquetaPrioridad}</span>
    <span class="badge-estado">${estado}</span>
    <h3>${titulo}</h3>
    <p>${descripcion}</p>
    <div class="acciones-tarea">
      ${puedeAvanzar
        ? `<button class="btn-avanzar" data-id="${id}" data-action="avanzar">Avanzar estado</button>`
        : ""}
      <button class="btn-eliminar" data-id="${id}" data-action="eliminar">Eliminar</button>
    </div>
  `;

  return tarea;
}

function agregarTarea() {
  const titulo = leerCampo("#input-titulo");
  const descripcion = leerCampo("#input-descripcion");
  const prioridad = document.querySelector("#select-prioridad").value;

  // Validación básica: título y descripción son obligatorios
  if (!titulo || !descripcion) {
    alert("El título y la descripción son obligatorios.");
    return;
  }

  // Crear objeto tarea y agregarlo al estado
  const nuevaTarea = { id: generarId(), titulo, descripcion, prioridad, estado: "pendiente" };
  tareas.push(nuevaTarea);

  // Crear el elemento DOM y añadirlo al tablero
  const elemento = crearElementoTarea(nuevaTarea);
  tablero.appendChild(elemento);

  actualizarStats();
}

// Registrar el evento del botón
document.querySelector("#btn-agregar").addEventListener("click", agregarTarea);

function actualizarStats() {
  // reduce: construye un objeto { estado: cantidad } a partir del array de tareas
  const conteos = tareas.reduce((acumulador, tarea) => {
    acumulador[tarea.estado] = (acumulador[tarea.estado] || 0) + 1;
    return acumulador;
  }, {});

  // for...of: recorre SECUENCIA_ESTADOS para mantener siempre el mismo orden
  const partes = [];
  for (const estado of SECUENCIA_ESTADOS) {
    const cantidad = conteos[estado] || 0;
    partes.push(`${cantidad} ${estado}`);
  }

  document.querySelector("#stats").textContent =
    `Tareas: ${partes.join(" · ")} (total ${tareas.length})`;
}

// Estado inicial del resumen (tablero vacío)
actualizarStats();

// Estrategia A — actualización dirigida (targeted update).
// Se eligió esta estrategia (en vez de reconstruir todo el tablero) porque
// es más eficiente: al avanzar el estado de una tarea, solo se localiza y
// modifica su nodo existente en el DOM, sin tocar ni volver a crear el
// resto de las tarjetas que no cambiaron. El costo es que esta función debe
// mantenerse sincronizada manualmente con la estructura HTML que genera
// crearElementoTarea (Paso 4): si esa estructura cambia, esta función
// también debe actualizarse para seguir encontrando los elementos correctos.
function actualizarEstadoEnDOM(id, nuevoEstado) {
  const elementoTarea = tablero.querySelector(`[data-id="${id}"]`);
  if (!elementoTarea) return;

  SECUENCIA_ESTADOS.forEach(estado => elementoTarea.classList.remove(`estado-${estado}`));
  elementoTarea.classList.add(`estado-${nuevoEstado}`);

  const badgeEstado = elementoTarea.querySelector(".badge-estado");
  badgeEstado.textContent = nuevoEstado;

  // Si ya no se puede avanzar más, se quita el botón "Avanzar estado"
  if (nuevoEstado === "completada") {
    const btnAvanzar = elementoTarea.querySelector(".btn-avanzar");
    if (btnAvanzar) btnAvanzar.remove();
  }
}

// Delegación: un solo listener en el tablero para ambas acciones (avanzar y eliminar)
tablero.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-action]");
  if (!boton) return;

  const id = Number(boton.dataset.id);

  if (boton.dataset.action === "eliminar") {
    tareas = tareas.filter(t => t.id !== id);
    boton.closest(".tarea").remove();
    actualizarStats();
    return;
  }

  if (boton.dataset.action === "avanzar") {
    const tarea = tareas.find(t => t.id === id);
    const indiceActual = SECUENCIA_ESTADOS.indexOf(tarea.estado);
    tarea.estado = SECUENCIA_ESTADOS[indiceActual + 1];

    actualizarEstadoEnDOM(id, tarea.estado);
    actualizarStats();
  }
});

const btnsFiltroEstado = document.querySelectorAll(".btn-filtro-estado");

btnsFiltroEstado.forEach(btn => {
  btn.addEventListener("click", () => {
    btnsFiltroEstado.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");
    filtroEstado = btn.dataset.estado;
    aplicarFiltros();
  });
});

document.querySelector("#select-filtro-prioridad").addEventListener("change", (e) => {
  filtroPrioridad = e.target.value;
  aplicarFiltros();
});

function aplicarFiltros() {
  const todasLasTareas = tablero.querySelectorAll(".tarea");

  todasLasTareas.forEach(elementoTarea => {
    const id = Number(elementoTarea.dataset.id);
    const tarea = tareas.find(t => t.id === id);

    const coincideEstado = filtroEstado === "todas" || tarea.estado === filtroEstado;
    const coincidePrioridad = filtroPrioridad === "todas" || tarea.prioridad === filtroPrioridad;

    elementoTarea.classList.toggle("oculta", !(coincideEstado && coincidePrioridad));
  });
}