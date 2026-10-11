// =========================================================================
// VARIABLES GLOBALES DEL SISTEMA
// =========================================================================
let totalCuenta = 0;
let contadorItems = 0;
let clienteActual = null;
let listaProductosEscaneados = [];
let metodoPagoSeleccionado = "";
let cambioConfirmadoCero = false;
let metodoPagoSeleccionadoActual = "";

// Variables para el truco de mantener presionada la BARRA ESPACIADORA en Tarjeta
let temporizadorEspacio = null;
let estaManteniendoEspacio = false;

// =========================================================================
// CAPTURA DE EVENTOS E INICIALIZACIÓN
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const inputProducto = document.getElementById('input-producto');
    if (inputProducto) {
        inputProducto.focus();
    }
});

// LECTOR DE TECLADO GLOBAL
document.addEventListener('keydown', function (event) {
    if (metodoPagoSeleccionado === "TARJETA" && event.key === ' ') {
        event.preventDefault();
        if (estaManteniendoEspacio) return;
        estaManteniendoEspacio = true;

        temporizadorEspacio = setTimeout(() => {
            hacerSonidoPipLargoTarjeta();
            finalizarTransaccionVenta();
            estaManteniendoEspacio = false;
        }, 2000);
        return;
    }

    if (event.key === 'Enter') {
        const inputProducto = document.getElementById('input-producto');
        if (document.activeElement === inputProducto) {
            event.preventDefault();
            buscarProductoDirectoEnFirestore();
        }
    }
});

document.addEventListener('keyup', function (event) {
    if (event.key === ' ') {
        if (metodoPagoSeleccionado === "TARJETA") {
            clearTimeout(temporizadorEspacio);
            estaManteniendoEspacio = false;
        }
    }
});

// =========================================================================
// EFECTOS DE SONIDO (ESCÁNER Y POS SIMULADO)
// =========================================================================
function hacerSonidoPip() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
        console.warn("Sonido PIP bloqueado.", e);
    }
}

function hacerSonidoPipLargoTarjeta() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(850, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
        console.warn("Sonido PIP Tarjeta bloqueado.", e);
    }
}

function simularEscaneoManual() {
    buscarProductoDirectoEnFirestore();
}

// =========================================================================
// GESTIÓN DE PRODUCTOS (FIRESTORE)
// =========================================================================
function abrirModalNuevoProducto() {
    document.getElementById('new-prod-nombre').value = "";
    document.getElementById('new-prod-precio').value = "";
    document.getElementById('modal-nuevo-producto').classList.remove('modal-hidden');
}

function buscarProductoDirectoEnFirestore() {
    const input = document.getElementById('input-producto');
    if (!input) return;

    let textoBuscado = input.value.trim().toLowerCase();
    if (textoBuscado === "") return;

    db.collection("productos").where("codigo_busqueda", "==", textoBuscado).get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    const datos = doc.data();
                    let nombreReal = datos.nombre || doc.id;
                    let precioReal = datos.precio !== undefined ? parseFloat(datos.precio) : 0;
                    agregarProductoAlTicket(nombreReal, precioReal);
                });
            } else {
                alert(`❌ No se encontró el producto para el código: ${textoBuscado}`);
            }
        })
        .catch((error) => {
            console.error("Error al consultar Firestore: ", error);
            alert("Error de conexión con Firestore.");
        });

    input.value = "";
    input.focus();
}

function guardarProductoEnFirestore() {
    const nombreOriginal = document.getElementById('new-prod-nombre').value.trim();
    const codigoOriginal = document.getElementById('new-prod-codigo').value.trim();
    const precioTexto = document.getElementById('new-prod-precio').value.trim();

    if (!nombreOriginal || !precioTexto) return alert("⚠️ Rellene todos los campos.");

    const precioNum = parseFloat(precioTexto);
    const codigoBusquedaAuto = codigoOriginal.toLowerCase();
    const docIdAuto = codigoOriginal.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    db.collection("productos").doc(nombreOriginal).set({
        nombre: nombreOriginal,
        codigo_busqueda: codigoOriginal,
        precio: precioNum
    })
        .then(() => {
            alert(`✅ ¡Producto registrado!\n• ${nombreOriginal} - ${precioNum.toFixed(2)} Bs.`);
            cerrarModales();
        })
        .catch(() => alert("❌ Error al guardar."));
}

// =========================================================================
// GESTIÓN DE CLIENTES FARMACLUB (FIRESTORE)
// =========================================================================
function abrirModalNuevoCliente() {
    document.getElementById('new-cli-nombre').value = "";
    document.getElementById('new-cli-fecha').value = "";
    document.getElementById('new-cli-nit').value = "";
    document.getElementById('modal-nuevo-cliente').classList.remove('modal-hidden');
}

function guardarClienteEnFirestore() {
    const nombre = document.getElementById('new-cli-nombre').value.trim();
    const fecha = document.getElementById('new-cli-fecha').value;
    const nit = document.getElementById('new-cli-nit').value.trim();

    if (!nombre || !fecha || !nit) return alert("⚠️ Rellene todos los campos.");

    db.collection("clientes_farmaclub").doc(nit).set({
        nombre: nombre,
        fecha_nacimiento: fecha,
        nit: nit
    })
        .then(() => {
            alert(`✅ ¡Cliente "${nombre}" registrado con éxito!`);
            cerrarModales();
        })
        .catch(() => alert("❌ Error al registrar."));
}

function buscarOVerificarCliente() {
    const nitIngresado = document.getElementById('codigo-cliente-pos').value.trim();
    if (nitIngresado === "") return alert("Ingrese carnet o NIT.");

    const contenedor = document.getElementById('contenedor-busqueda-pos');
    contenedor.innerHTML = `<div class="msg-buscando">⏳ Buscando en Firestore...</div>`;

    db.collection("clientes_farmaclub").doc(nitIngresado).get()
        .then((doc) => {
            if (doc.exists) {
                const cliente = doc.data();
                clienteActual = { nombre: cliente.nombre, nit: cliente.nit };
                contenedor.innerHTML = `
                <div class="card-cliente-encontrado" onclick="abrirModalPago()">
                    <div class="card-cliente-label">✓ Cliente Encontrado (Clic para continuar)</div>
                    <div class="card-cliente-name">${cliente.nombre}</div>
                    <div class="card-cliente-sub">NIT: ${cliente.nit}</div>
                </div>
            `;
            } else {
                contenedor.innerHTML = `<div class="msg-no-encontrado">❌ NIT/CI "${nitIngresado}" no registrado.</div>`;
                clienteActual = null;
            }
        })
        .catch(() => {
            contenedor.innerHTML = `<div class="msg-no-encontrado">❌ Error de conexión.</div>`;
        });
}

// =========================================================================
// LÓGICA DEL TICKET DE COMPRA (INTERFAZ)
// =========================================================================
function agregarProductoAlTicket(nombre, precio) {
    hacerSonidoPip();
    const idUnico = Date.now();
    listaProductosEscaneados.push({ id: idUnico, nombre: nombre, precioBase: precio, cantidad: 1 });

    const lista = document.getElementById('lista-ticket');
    if (lista) {
        const li = document.createElement('li');
        li.className = 'receipt-item';
        li.id = `item-${idUnico}`;
        li.innerHTML = `
            <span class="item-info">${nombre}</span>
            <div class="quantity-controls">
                <button class="btn-qty" onclick="cambiarCantidad(${idUnico}, -1)">▼</button>
                <span class="qty-number" id="qty-${idUnico}">1</span>
                <button class="btn-qty" onclick="cambiarCantidad(${idUnico}, 1)">▲</button>
            </div>
            <b class="item-price" id="price-${idUnico}">${precio.toFixed(2)} Bs.</b>
        `;
        lista.appendChild(li);
        lista.scrollTop = lista.scrollHeight;
    }
    recalcularTotalGeneral();
}

function cambiarCantidad(id, cambio) {
    const producto = listaProductosEscaneados.find(p => p.id === id);
    if (!producto) return;
    producto.cantidad += cambio;

    if (producto.cantidad <= 0) {
        listaProductosEscaneados = listaProductosEscaneados.filter(p => p.id !== id);
        const elemento = document.getElementById(`item-${id}`);
        if (elemento) elemento.remove();
    } else {
        const qtyElem = document.getElementById('qty-' + id);
        const priceElem = document.getElementById('price-' + id);
        if (qtyElem) qtyElem.innerText = producto.cantidad;
        if (priceElem) priceElem.innerText = `${(producto.precioBase * producto.cantidad).toFixed(2)} Bs.`;
    }
    recalcularTotalGeneral();
}

function recalcularTotalGeneral() {
    totalCuenta = listaProductosEscaneados.reduce((suma, p) => suma + (p.precioBase * p.cantidad), 0);
    const txtTotal = document.getElementById('txt-total');
    if (txtTotal) txtTotal.innerText = `${totalCuenta.toFixed(2)} Bs.`;
}

// =========================================================================
// PASARELA DE CONTROL DE PAGOS Y VUELTO (EFECTIVO / DIGITAL)
// =========================================================================
function verificarFarmaclub() {
    if (totalCuenta === 0) return alert("El ticket está vacío. Escanea productos primero.");
    clienteActual = null;
    if (document.getElementById('contenedor-busqueda-pos')) document.getElementById('contenedor-busqueda-pos').innerHTML = "";
    if (document.getElementById('codigo-cliente-pos')) document.getElementById('codigo-cliente-pos').value = "";
    document.getElementById('modal-farmaclub').classList.remove('modal-hidden');
}

function solicitarCodigo() {
    document.getElementById('modal-farmaclub').classList.add('modal-hidden');
    document.getElementById('modal-input-codigo').classList.remove('modal-hidden');
    document.getElementById('codigo-cliente-pos').focus();
}

function volverAPregunta() {
    document.getElementById('modal-input-codigo').classList.add('modal-hidden');
    document.getElementById('modal-farmaclub').classList.remove('modal-hidden');
}

function abrirModalPago() {
    document.getElementById('modal-farmaclub').classList.add('modal-hidden');
    document.getElementById('modal-input-codigo').classList.add('modal-hidden');

    const infoLabel = document.getElementById('info-cliente-pago');
    if (infoLabel) {
        infoLabel.innerText = clienteActual ? `👤 CLIENTE: ${clienteActual.nombre} (NIT: ${clienteActual.nit})` : `👤 CLIENTE: Sin registrar en Farmaclub`;
    }

    document.getElementById('bloque-detalle-efectivo').classList.add('modal-hidden');
    document.getElementById('bloque-detalle-electronico').classList.add('modal-hidden');
    document.getElementById('bloque-metodos-pago').classList.remove('modal-hidden');
    document.getElementById('modal-pago').classList.remove('modal-hidden');
}

function seleccionarMetodo(metodo) {
    metodoPagoSeleccionado = metodo;
    cambioConfirmadoCero = false;

    document.getElementById('bloque-metodos-pago').classList.add('modal-hidden');

    if (metodo === "EFECTIVO") {
        document.getElementById('pago-txt-total').innerText = `${totalCuenta.toFixed(2)} Bs.`;
        document.getElementById('pago-monto-recibido').value = "";
        document.getElementById('pago-txt-cambio').innerText = "0.00 Bs.";
        document.getElementById('pago-txt-cambio').style.color = "#b45309";

        const btnFinalizar = document.getElementById('btn-finalizar-efectivo');
        btnFinalizar.disabled = true;
        btnFinalizar.style.backgroundColor = "#9ca3af";
        btnFinalizar.style.cursor = "not-allowed";
        btnFinalizar.innerText = "🔒 Finalizar";

        document.getElementById('bloque-detalle-efectivo').classList.remove('modal-hidden');
        setTimeout(() => document.getElementById('pago-monto-recibido').focus(), 100);
    } else {
        document.getElementById('pago-txt-metodo-digital').innerText = metodo;
        document.getElementById('pago-txt-total-digital').innerText = `${totalCuenta.toFixed(2)} Bs.`;

        if (metodo === "TARJETA") {
            document.getElementById('qr-pago').style.display = "none";
            document.getElementById('pago-txt-metodo-digital').innerHTML = "TARJETA <br><small style='color:#dc2626; font-weight:bold; display:block; margin-top:5px;'>⌨️ ¡Mantén presionada la BARRA ESPACIADORA por 2 segundos para cobrar!</small>";
        }
        document.getElementById('bloque-detalle-electronico').classList.remove('modal-hidden');
    }
    if (metodo === "QR") {
        document.getElementById('qr-pago').style.display = "block";
        document.getElementById('bloque-detalle-qr').classList.remove('modal-hidden');
    }
}

function calcularCambioVuelto() {
    if (cambioConfirmadoCero) return;

    const recibidoTexto = document.getElementById('pago-monto-recibido').value.trim();
    const txtCambio = document.getElementById('pago-txt-cambio');
    const btnFinalizar = document.getElementById('btn-finalizar-efectivo');

    if (recibidoTexto === "") {
        txtCambio.innerText = "0.00 Bs.";
        return;
    }

    const recibido = parseFloat(recibidoTexto);
    const vuelto = recibido - totalCuenta;

    if (vuelto < 0) {
        txtCambio.innerText = "Dinero insuficiente";
        btnFinalizar.disabled = true;
        btnFinalizar.style.backgroundColor = "#9ca3af";
        btnFinalizar.style.cursor = "not-allowed";
        btnFinalizar.innerText = "🔒 Falta Dinero";
    } else {
        txtCambio.innerText = `${vuelto.toFixed(2)} Bs.`;
        btnFinalizar.disabled = false;
        btnFinalizar.style.backgroundColor = "#10b981";
        btnFinalizar.style.cursor = "pointer";
        btnFinalizar.innerText = "✓ Finalizar Venta";
    }
}

function marcarCambioComoHecho() {
    const recibidoTexto = document.getElementById('pago-monto-recibido').value.trim();
    if (recibidoTexto === "" || parseFloat(recibidoTexto) < totalCuenta) {
        return alert("⚠️ Ingresa un monto válido primero.");
    }

    cambioConfirmadoCero = true;
    const txtCambio = document.getElementById('pago-txt-cambio');
    txtCambio.innerText = "0.00 Bs. (Entregado)";
    txtCambio.style.color = "#059669";

    const btnFinalizar = document.getElementById('btn-finalizar-efectivo');
    btnFinalizar.disabled = false;
    btnFinalizar.style.backgroundColor = "#10b981";
    btnFinalizar.style.cursor = "pointer";
    btnFinalizar.innerText = "🚀 Finalizar Venta";
}

function cancelarMetodoSeleccionado() {
    metodoPagoSeleccionado = "";
    document.getElementById('bloque-detalle-efectivo').classList.add('modal-hidden');
    document.getElementById('bloque-detalle-electronico').classList.add('modal-hidden');
    document.getElementById('bloque-metodos-pago').classList.remove('modal-hidden');
}

// Procesa la información y dibuja la hoja de factura térmica
function finalizarTransaccionVenta() {
    // 1. Inyectar Fecha y Hora Actual Real
    const ahora = new Date();
    document.getElementById('factura-txt-fecha-hora').innerText = `Fecha: ${ahora.toLocaleDateString()} | Hora: ${ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('factura-txt-nro-transaccion').innerText = `Nro. Transacción: #AM-${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Inyectar Datos de Cliente Farmaclub
    const contenedorCliente = document.getElementById('factura-bloque-cliente');
    if (clienteActual) {
        contenedorCliente.innerHTML = `
            <p><b>CLIENTE:</b> ${clienteActual.nombre.toUpperCase()}</p>
            <p><b>NIT/CARNET:</b> ${clienteActual.nit}</p>
            <p style="color: black; font-weight:bold;">¡Socio Farmaclub Activo!</p>
        `;
    } else {
        contenedorCliente.innerHTML = `
            <p><b>CLIENTE:</b> SIN REGISTRAR (S/N)</p>
            <p><b>NIT/CARNET:</b> 0</p>
        `;
    }

    // 3. Inyectar Tabla de Artículos Escaneados
    const cuerpoTabla = document.getElementById('factura-cuerpo-productos');
    cuerpoTabla.innerHTML = "";

    listaProductosEscaneados.forEach(prod => {
        const totalFila = prod.precioBase * prod.cantidad;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left;">${prod.nombre.toUpperCase()}</td>
            <td style="text-align: center;">${prod.cantidad}</td>
            <td style="text-align: right;">${totalFila.toFixed(2)} Bs.</td>
        `;
        cuerpoTabla.appendChild(tr);
    });

    // 4. Inyectar Totales, Métodos y Vuelto
    document.getElementById('factura-total-final').innerText = `${totalCuenta.toFixed(2)} Bs.`;
    document.getElementById('factura-txt-metodo').innerText = metodoPagoSeleccionado;

    const rowRecibido = document.getElementById('factura-row-recibido');
    const rowCambio = document.getElementById('factura-row-cambio');

    if (metodoPagoSeleccionado === "EFECTIVO") {
        const montoRecibido = parseFloat(document.getElementById('pago-monto-recibido').value || totalCuenta);
        const vueltoEntregado = montoRecibido - totalCuenta;

        document.getElementById('factura-txt-recibido').innerText = `${montoRecibido.toFixed(2)} Bs.`;
        document.getElementById('factura-txt-cambio-entregado').innerText = `${vueltoEntregado.toFixed(2)} Bs.`;

        rowRecibido.style.display = "flex";
        rowCambio.style.display = "flex";
    } else {
        rowRecibido.style.display = "none";
        rowCambio.style.display = "none";
    }

    // 5. Mostrar la factura térmica
    document.getElementById('modal-pago').classList.add('modal-hidden');
    document.getElementById('modal-factura-termica').classList.remove('modal-hidden');
}

function imprimirTicketTermicoReal() {
    window.print();
}

function limpiarYIniciarNuevaVentaTotal() {
    document.getElementById('modal-factura-termica').classList.add('modal-hidden');

    document.getElementById('lista-ticket').innerHTML = "";
    listaProductosEscaneados = [];
    totalCuenta = 0;
    contadorItems = 0;
    clienteActual = null;
    metodoPagoSeleccionado = "";
    cambioConfirmadoCero = false;

    document.getElementById('txt-total').innerText = "0.00 Bs.";

    const inputProducto = document.getElementById('input-producto');
    if (inputProducto) inputProducto.focus();
}

function cerrarModales() {
    metodoPagoSeleccionado = "";
    document.getElementById('modal-farmaclub').classList.add('modal-hidden');
    document.getElementById('modal-input-codigo').classList.add('modal-hidden');
    document.getElementById('modal-pago').classList.add('modal-hidden');
    document.getElementById('modal-nuevo-producto').classList.add('modal-hidden');
    document.getElementById('modal-nuevo-cliente').classList.add('modal-hidden');

    document.getElementById('bloque-detalle-efectivo').classList.add('modal-hidden');
    document.getElementById('bloque-detalle-electronico').classList.add('modal-hidden');
    document.getElementById('bloque-metodos-pago').classList.remove('modal-hidden');

    const inputProducto = document.getElementById('input-producto');
    if (inputProducto) inputProducto.focus();
}

let html5QrcodeScanner = null;

// Abre el modal y activa la cámara
function abrirEscanerCamara() {
    document.getElementById("modal-escaner-camara").classList.remove("modal-hidden");

    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("reader");
    }

    const config = {
        fps: 60,
        qrbox: { width: 280, height: 130 },
        // Especificamos explícitamente CODE_128 entre los formatos permitidos
        formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.ITF
        ],
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        alEscanearCodigoValido,
        alDarErrorEscaneo
    ).catch(err => {
        alert("Error al acceder a la cámara: " + err);
        cerrarEscanerCamara();
    });
}

let ultimoCodigoEscaneado = "";
let tiempoUltimoEscaneo = 0;
const TIEMPO_ESPERA_ENTRE_ESCANEOS = 1500; // 1.5 segundos de pausa entre lecturas

function alEscanearCodigoValido(codigoDetectado) {
    const ahora = Date.now();

    // Si es el mismo código y no han pasado 1.5 segundos, ignoramos la lectura
    if (codigoDetectado === ultimoCodigoEscaneado && (ahora - tiempoUltimoEscaneo) < TIEMPO_ESPERA_ENTRE_ESCANEOS) {
        return;
    }

    // Registramos el nuevo tiempo y código leído
    ultimoCodigoEscaneado = codigoDetectado;
    tiempoUltimoEscaneo = ahora;

    // 1. Cargar el código en el input
    const input = document.getElementById("input-producto");
    if (input) {
        input.value = codigoDetectado;
    }

    // 3. Agregar el producto al ticket
    if (typeof procesarEntradaProducto === "function") {
        procesarEntradaProducto(codigoDetectado);
    } else if (typeof simularEscaneoManual === "function") {
        simularEscaneoManual();
    }

    // NOTA: Se eliminó cerrarEscanerCamara() para permitir escaneo fluido
}

function alDarErrorEscaneo(errorMessage) {
    // Ignorar errores continuos de búsqueda de frame por frame
}

// Detiene la cámara y oculta el modal
function cerrarEscanerCamara() {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById("modal-escaner-camara").classList.add("modal-hidden");
        }).catch(err => console.error(err));
    } else {
        document.getElementById("modal-escaner-camara").classList.add("modal-hidden");
    }
}


let temporizadorControlTarjeta = null;
let estaManteniendoControlTarjeta = false;

// =========================================================================
// CAPTURA DE EVENTOS E INICIALIZACIÓN
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const inputProducto = document.getElementById('input-producto');
    if (inputProducto) {
        inputProducto.focus();
    }
});

// LECTOR DE TECLADO GLOBAL
document.addEventListener('keydown', function (event) {
    const modalPago = document.getElementById("modal-pago");
    const estaModalPagoVisible = modalPago && !modalPago.classList.contains("modal-hidden");

    // 1. BARRA ESPACIADORA (MANTENER 2s PARA COBRAR CON TARJETA)
    if (metodoPagoSeleccionado === "TARJETA" && event.key === ' ') {
        event.preventDefault();
        if (estaManteniendoEspacio) return;
        estaManteniendoEspacio = true;

        temporizadorEspacio = setTimeout(() => {
            hacerSonidoPipLargoTarjeta();
            finalizarTransaccionVenta();
            estaManteniendoEspacio = false;
        }, 2000);
        return;
    }

    // 2. TECLA CONTROL (MANTENER 2s PARA ERROR DE FONDOS INSUFICIENTES)
    if (metodoPagoSeleccionado === "TARJETA" && estaModalPagoVisible && event.key === 'Control') {
        event.preventDefault();
        if (estaManteniendoControlTarjeta) return;
        estaManteniendoControlTarjeta = true;

        temporizadorControlTarjeta = setTimeout(() => {
            reproducirSonidoError();
            alert("❌ ERROR DE TRANSACCIÓN: Fondos insuficientes en la tarjeta.");
            estaManteniendoControlTarjeta = false;
        }, 2000);
        return;
    }

    // BÚSQUEDA NORMAL DE PRODUCTOS CON ENTER
    if (event.key === 'Enter') {
        const inputProducto = document.getElementById('input-producto');
        if (document.activeElement === inputProducto) {
            event.preventDefault();
            buscarProductoDirectoEnFirestore();
        }
    }
});

document.addEventListener('keyup', function (event) {
    // Cancelar temporizador de espacio si se suelta antes de los 2s
    if (event.key === ' ' && metodoPagoSeleccionado === "TARJETA") {
        clearTimeout(temporizadorEspacio);
        estaManteniendoEspacio = false;
    }

    // Cancelar temporizador de Control si se suelta antes de los 2s
    if (event.key === 'Control' && metodoPagoSeleccionado === "TARJETA") {
        clearTimeout(temporizadorControlTarjeta);
        estaManteniendoControlTarjeta = false;
    }
});

// FUNCIÓN PARA SONIDO DE ERROR / RECHAZO (DOS PITIDOS MÁS FUERTES: PIP-PIP)
function reproducirSonidoError() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const frecuenciaError = 350; // Tono grave
        const duracionPip = 0.1;     // Ligeramente más largo para hacerse notar
        const pausaEntrePips = 0.08;
        const volumenAlto = 0.5;      // Subido de 0.15 a 0.5 para mayor potencia

        // Primer PIP
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle'; // Onda más audible que la sinoidal
        osc1.frequency.setValueAtTime(frecuenciaError, audioCtx.currentTime);
        gain1.gain.setValueAtTime(volumenAlto, audioCtx.currentTime);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);

        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + duracionPip);

        // Segundo PIP
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        const tiempoSegundoPip = audioCtx.currentTime + duracionPip + pausaEntrePips;

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(frecuenciaError, tiempoSegundoPip);
        gain2.gain.setValueAtTime(volumenAlto, tiempoSegundoPip);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.start(tiempoSegundoPip);
        osc2.stop(tiempoSegundoPip + duracionPip);

    } catch (e) {
        console.warn("Sonido de error bloqueado.", e);
    }
}