// ============================================================
//  SaludConnect – Entrega 2
//  Conceptos: arrays, objetos, localStorage, DOM dinámico
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. ESTADO DE LA APLICACIÓN ──────────────────────────
    // Toda la información vive en un array de objetos.
    // Cada cita es un objeto con propiedades claras.
    // Si hay datos guardados en localStorage los recuperamos;
    // si no, arrancamos con las citas de ejemplo del HTML.

    const ESTADO_INICIAL = [
        {
            id: generarId(),
            paciente: 'Esteban Tapia',
            especialidad: 'Urgencias',
            hora: '08:00',
            urgente: true,
            columna: 'pendientes'   // 'pendientes' | 'consulta' | 'completadas'
        },
        {
            id: generarId(),
            paciente: 'Elena Nito',
            especialidad: 'Consulta General',
            hora: '08:30',
            urgente: false,
            columna: 'consulta'
        }
    ];

    // Intentamos cargar desde localStorage; si no existe usamos el estado inicial
    let citas = cargarCitas();

    // ── 2. REFERENCIAS AL DOM ────────────────────────────────
    const btnNuevaCita  = document.getElementById('btnNuevaCita');
    const btnCancelar   = document.getElementById('btnCancelar');
    const modal         = document.getElementById('modalCita');
    const formulario    = document.getElementById('formCita');

    const inputPaciente     = document.getElementById('inputPaciente');
    const selectEspecialidad = document.getElementById('selectEspecialidad');
    const inputHora         = document.getElementById('inputHora');
    const checkUrgente      = document.getElementById('checkUrgente');

    const panelPendientes   = document.getElementById('panelPendientes');
    const panelConsulta     = document.getElementById('panelConsulta');
    const panelCompletadas  = document.getElementById('panelCompletadas');

    // Stats
    const statPendientes  = document.getElementById('statPendientes');
    const statConsulta    = document.getElementById('statConsulta');
    const statCompletadas = document.getElementById('statCompletadas');

    // ── 3. FUNCIONES PURAS (sin tocar el DOM) ───────────────

    /** Genera un ID único sencillo basado en timestamp + número aleatorio */
    function generarId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    /** Guarda el array de citas en localStorage como JSON */
    function guardarCitas() {
        localStorage.setItem('saludconnect_citas', JSON.stringify(citas));
    }

    /** Carga las citas desde localStorage; si no hay nada devuelve el estado inicial */
    function cargarCitas() {
        const datos = localStorage.getItem('saludconnect_citas');
        return datos ? JSON.parse(datos) : ESTADO_INICIAL;
    }

    /** Filtra las citas por columna */
    function citasPorColumna(columna) {
        return citas.filter(c => c.columna === columna);
    }

    // ── 4. FUNCIÓN QUE CREA UNA TARJETA EN EL DOM ───────────
    // Recibe un objeto cita y devuelve un elemento <article>.
    // Toda la lógica de botones queda encapsulada aquí.

    function crearTarjeta(cita) {
        const article = document.createElement('article');
        article.className = `card${cita.urgente ? ' card--urgent' : ''}`;
        article.dataset.id = cita.id;   // guardamos el id en el DOM para recuperarlo

        article.innerHTML = `
            <div class="card__header">
                <span class="card__tag">${cita.urgente ? '🔴 🚑Urgente' : cita.especialidad}</span>
                <span class="card__time">${cita.hora}</span>
            </div>
            <h3 class="card__patient">${cita.paciente}</h3>
            <p class="card__desc">${cita.especialidad}</p>
            <div class="card__footer">
                ${botonesSegunColumna(cita.columna)}
            </div>
        `;

        // Delegamos eventos a los botones recién creados
        const btnAvanzar  = article.querySelector('.btn--avanzar');
        const btnEliminar = article.querySelector('.btn--eliminar');

        if (btnAvanzar)  btnAvanzar.addEventListener('click',  () => avanzarCita(cita.id));
        if (btnEliminar) btnEliminar.addEventListener('click', () => eliminarCita(cita.id));

        return article;
    }

    /** Devuelve el HTML de los botones según en qué columna esté la cita */
    function botonesSegunColumna(columna) {
        if (columna === 'pendientes') {
            return `
                <button class="btn btn--action btn--avanzar">▶ Iniciar consulta</button>
                <button class="btn btn--danger btn--eliminar">✕</button>
            `;
        }
        if (columna === 'consulta') {
            return `
                <button class="btn btn--success btn--avanzar">✔ Finalizar</button>
                <button class="btn btn--danger btn--eliminar">✕</button>
            `;
        }
        // completadas: solo eliminar
        return `<button class="btn btn--danger btn--eliminar">✕ Eliminar</button>`;
    }

    // ── 5. RENDERIZADO COMPLETO DEL TABLERO ──────────────────
    // Limpia los tres paneles y los vuelve a dibujar desde el array.
    // Este patrón "borrar y redibujar" es simple y fiable para nivel intermedio.

    function renderizarTablero() {
        // Limpiar paneles
        panelPendientes.innerHTML  = '';
        panelConsulta.innerHTML    = '';
        panelCompletadas.innerHTML = '';

        // Insertar tarjetas en cada panel
        citasPorColumna('pendientes').forEach(c => {
            panelPendientes.appendChild(crearTarjeta(c));
        });

        citasPorColumna('consulta').forEach(c => {
            panelConsulta.appendChild(crearTarjeta(c));
        });

        citasPorColumna('completadas').forEach(c => {
            panelCompletadas.appendChild(crearTarjeta(c));
        });

        // Actualizar stats después de renderizar
        actualizarStats();
    }

    // ── 6. ACTUALIZAR CONTADORES ─────────────────────────────
    // Lee el array y cuenta citas por columna. Nunca cuenta el DOM.

    function actualizarStats() {
        statPendientes.textContent  = citasPorColumna('pendientes').length;
        statConsulta.textContent    = citasPorColumna('consulta').length;
        statCompletadas.textContent = citasPorColumna('completadas').length;
    }

    // ── 7. ACCIONES SOBRE CITAS ──────────────────────────────

    /**
     * Avanza una cita a la siguiente columna:
     * pendientes → consulta → completadas
     */
    function avanzarCita(id) {
        const mapa = {
            pendientes: 'consulta',
            consulta:   'completadas'
        };

        // Encontramos el índice del objeto en el array
        const indice = citas.findIndex(c => c.id === id);
        if (indice === -1) return;

        const columnaActual   = citas[indice].columna;
        const columnaSiguiente = mapa[columnaActual];

        if (!columnaSiguiente) return; // ya está en completadas

        // Mutamos solo la propiedad que cambia
        citas[indice].columna = columnaSiguiente;

        guardarCitas();     // persistimos en localStorage
        renderizarTablero(); // actualizamos la vista
    }

    /** Elimina una cita del array usando su id */
    function eliminarCita(id) {
        // filter devuelve un nuevo array sin el elemento eliminado
        citas = citas.filter(c => c.id !== id);

        guardarCitas();
        renderizarTablero();
    }

    // ── 8. AGREGAR NUEVA CITA DESDE EL FORMULARIO ───────────

    formulario.addEventListener('submit', (e) => {
        e.preventDefault(); // evitar recarga de página

        const nuevaCita = {
            id:           generarId(),
            paciente:     inputPaciente.value.trim(),
            especialidad: selectEspecialidad.value,
            hora:         inputHora.value || '--:--',
            urgente:      checkUrgente.checked,
            columna:      'pendientes'  // toda cita nueva empieza aquí
        };

        // Validación mínima
        if (!nuevaCita.paciente) {
            inputPaciente.focus();
            inputPaciente.style.borderColor = 'var(--urgent)';
            return;
        }

        inputPaciente.style.borderColor = '';

        citas.push(nuevaCita);  // añadimos al array
        guardarCitas();
        renderizarTablero();
        cerrarModal();
        formulario.reset();     // limpiamos el formulario
    });

    // ── 9. CONTROL DEL MODAL ─────────────────────────────────

    function abrirModal() {
        modal.classList.add('modal--show');
        inputPaciente.focus();
    }

    function cerrarModal() {
        modal.classList.remove('modal--show');
        formulario.reset();
        inputPaciente.style.borderColor = '';
    }

    btnNuevaCita.addEventListener('click', abrirModal);
    btnCancelar.addEventListener('click',  cerrarModal);

    // Cerrar al hacer clic en el fondo oscuro
    window.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });

    // Cerrar con tecla Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal();
    });

    // ── 10. ARRANQUE ─────────────────────────────────────────
    renderizarTablero();
    console.log('SaludConnect Entrega 2 – Estado cargado:', citas);
});
