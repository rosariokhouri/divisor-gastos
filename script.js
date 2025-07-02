import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Variables Globales ---
let app;
let db;
let auth;
let userId;
let currentMode = 'general'; // 'general' o 'travel'
let exchangeRate = 1; // Valor inicial, se actualizará con la API
let editingExpenseId = null; // Para almacenar el ID del gasto que se está editando

// Datos de la aplicación (se cargarán desde Firebase)
let generalParticipants = [];
let generalExpenses = [];
let travelParticipants = [];
let travelExpenses = [];

// Elementos del DOM
const travelModeBtn = document.getElementById('travelModeBtn');
const generalModeBtn = document.getElementById('generalModeBtn');
const travelSection = document.getElementById('travelSection');
const generalSection = document.getElementById('generalSection');
const exchangeRateContainer = document.getElementById('exchangeRateContainer'); // Contenedor para mostrar/ocultar
const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');

// Modal
const modal = document.getElementById('myModal');
const modalMessage = document.getElementById('modalMessage');
const modalOkButton = document.getElementById('modalOkButton');
const closeButton = document.querySelector('.close-button');

// --- Funciones de Utilidad ---

/**
 * Muestra un modal con un mensaje.
 * @param {string} message - El mensaje a mostrar.
 */
function showModal(message) {
    modalMessage.textContent = message;
    modal.style.display = 'flex'; // Usar flex para centrar
}

/**
 * Oculta el modal.
 */
function hideModal() {
    modal.style.display = 'none';
}

// --- Inicialización de Firebase ---

/**
 * Inicializa Firebase y autentica al usuario.
 */
async function initializeFirebase() {
    try {
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is empty. Cannot initialize Firebase.");
            showModal("Error: Firebase no está configurado correctamente.");
            return;
        }
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Intenta iniciar sesión con el token personalizado si está disponible
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            // Si no hay token, inicia sesión anónimamente
            await signInAnonymously(auth);
        }

        // Listener para el estado de autenticación
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Firebase inicializado y usuario autenticado:", userId);
                // Una vez autenticado, configurar los listeners de Firestore
                setupFirestoreListeners();
            } else {
                console.log("No hay usuario autenticado.");
                userId = null;
                // Limpiar datos si no hay usuario
                generalParticipants = [];
                generalExpenses = [];
                travelParticipants = [];
                travelExpenses = [];
                updateUI(); // Actualizar UI para reflejar datos vacíos
            }
        });
    } catch (error) {
        console.error("Error al inicializar Firebase o autenticar:", error);
        showModal(`Error al iniciar Firebase: ${error.message}`);
    }
}

/**
 * Configura los listeners de Firestore para cada colección.
 */
function setupFirestoreListeners() {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    if (!userId) {
        console.warn("No userId available for Firestore listeners.");
        return;
    }

    // Listener para participantes generales
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/generalParticipants`), (snapshot) => {
        generalParticipants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderParticipants('general');
        updateSummary('general');
    }, (error) => {
        console.error("Error fetching general participants:", error);
        showModal(`Error al cargar participantes generales: ${error.message}`);
    });

    // Listener para gastos generales
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/generalExpenses`), (snapshot) => {
        generalExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses('general');
        updateSummary('general');
    }, (error) => {
        console.error("Error fetching general expenses:", error);
        showModal(`Error al cargar gastos generales: ${error.message}`);
    });

    // Listener para participantes de viaje
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/travelParticipants`), (snapshot) => {
        travelParticipants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderParticipants('travel');
        updateSummary('travel');
    }, (error) => {
        console.error("Error fetching travel participants:", error);
        showModal(`Error al cargar participantes de viaje: ${error.message}`);
    });

    // Listener para gastos de viaje
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/travelExpenses`), (snapshot) => {
        travelExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses('travel');
        updateSummary('travel');
    }, (error) => {
        console.error("Error fetching travel expenses:", error);
        showModal(`Error al cargar gastos de viaje: ${error.message}`);
    });
}

// --- Gestión de Participantes ---

/**
 * Añade un participante a la lista activa.
 * @param {string} mode - 'general' o 'travel'.
 * @param {string} name - Nombre del participante.
 */
async function addParticipant(mode, name) {
    if (!userId) {
        showModal("Error: Usuario no autenticado. Por favor, recarga la página.");
        return;
    }
    if (!name.trim()) {
        showModal("El nombre del participante no puede estar vacío.");
        return;
    }
    const participantsRef = collection(db, `artifacts/${appId}/users/${userId}/${mode}Participants`);
    try {
        await addDoc(participantsRef, { name: name.trim() });
        document.getElementById(`${mode}ParticipantName`).value = ''; // Limpiar input
    } catch (e) {
        console.error("Error añadiendo participante:", e);
        showModal(`Error al añadir participante: ${e.message}`);
    }
}

/**
 * Elimina un participante de la lista activa.
 * @param {string} mode - 'general' o 'travel'.
 * @param {string} id - ID del participante a eliminar.
 */
async function deleteParticipant(mode, id) {
    if (!userId) {
        showModal("Error: Usuario no autenticado. Por favor, recarga la página.");
        return;
    }
    const participantDocRef = doc(db, `artifacts/${appId}/users/${userId}/${mode}Participants`, id);
    try {
        await deleteDoc(participantDocRef);
    } catch (e) {
        console.error("Error eliminando participante:", e);
        showModal(`Error al eliminar participante: ${e.message}`);
    }
}

/**
 * Renderiza la lista de participantes y actualiza los selectores y checkboxes.
 * @param {string} mode - 'general' o 'travel'.
 */
function renderParticipants(mode) {
    const participantsList = document.getElementById(`${mode}ParticipantsList`);
    const payerSelect = document.getElementById(`${mode}ExpensePayer`);
    const involvedCheckboxes = document.getElementById(`${mode}InvolvedParticipantsCheckboxes`);

    const participants = mode === 'general' ? generalParticipants : travelParticipants;

    // Limpiar listas anteriores
    participantsList.innerHTML = '';
    payerSelect.innerHTML = '<option value="">Selecciona un participante</option>';
    involvedCheckboxes.innerHTML = '';

    if (participants.length === 0) {
        return;
    }

    participants.forEach(p => {
        // Renderizar en la lista de participantes
        const participantTag = document.createElement('span');
        participantTag.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2';
        participantTag.innerHTML = `${p.name} <button class="text-blue-600 hover:text-blue-800 font-bold" onclick="deleteParticipant('${mode}', '${p.id}')">&times;</button>`;
        participantsList.appendChild(participantTag);

        // Rellenar selector de "Quién Pagó"
        const payerOption = document.createElement('option');
        payerOption.value = p.name;
        payerOption.textContent = p.name;
        payerSelect.appendChild(payerOption);

        // Rellenar checkboxes de "Quiénes Participan"
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'flex items-center';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="${mode}-${p.id}-checkbox" name="${mode}Involved" value="${p.name}" class="form-checkbox h-5 w-5 text-blue-600 rounded">
            <label for="${mode}-${p.id}-checkbox" class="ml-2 text-gray-700">${p.name}</label>
        `;
        involvedCheckboxes.appendChild(checkboxDiv);
    });

    // Añadir el checkbox "Seleccionar todos" solo para el modo general
    if (mode === 'general') {
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'flex items-center mt-2';
        selectAllDiv.innerHTML = `
            <input type="checkbox" id="generalSelectAllParticipants" class="form-checkbox h-5 w-5 text-blue-600 rounded">
            <label for="generalSelectAllParticipants" class="ml-2 text-gray-700 font-semibold">Seleccionar todos</label>
        `;
        involvedCheckboxes.prepend(selectAllDiv); // Añadir al principio

        document.getElementById('generalSelectAllParticipants').addEventListener('change', (event) => {
            const isChecked = event.target.checked;
            document.querySelectorAll('#generalInvolvedParticipantsCheckboxes input[name="generalInvolved"]').forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });
    }
}

// --- Gestión de Gastos ---

/**
 * Añade un nuevo gasto a la lista activa.
 * @param {string} mode - 'general' o 'travel'.
 * @param {Object} expenseData - Datos del gasto.
 */
async function addExpense(mode, expenseData) {
    if (!userId) {
        showModal("Error: Usuario no autenticado. Por favor, recarga la página.");
        return;
    }
    const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/${mode}Expenses`);
    try {
        if (editingExpenseId) {
            // Si estamos editando, actualizamos el documento existente
            const expenseDocRef = doc(db, `artifacts/${appId}/users/${userId}/${mode}Expenses`, editingExpenseId);
            await updateDoc(expenseDocRef, expenseData);
            editingExpenseId = null; // Resetear el ID de edición
            document.getElementById(`${mode}AddExpenseBtn`).textContent = 'Añadir Gasto'; // Restaurar texto del botón
        } else {
            // Si no estamos editando, añadimos un nuevo documento
            await addDoc(expensesRef, expenseData);
        }
        document.getElementById(`${mode}ExpenseForm`).reset(); // Limpiar formulario
        // Desmarcar todos los checkboxes después de añadir/editar el gasto
        document.querySelectorAll(`#${mode}InvolvedParticipantsCheckboxes input[name="${mode}Involved"]`).forEach(cb => {
            cb.checked = false;
        });
        // Desmarcar el checkbox "Seleccionar todos" si existe
        const selectAllCheckbox = document.getElementById(`${mode}SelectAllParticipants`);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    } catch (e) {
        console.error("Error añadiendo/editando gasto:", e);
        showModal(`Error al añadir/editar gasto: ${e.message}`);
    }
}

/**
 * Carga los datos de un gasto en el formulario para su edición.
 * @param {string} mode - 'general' o 'travel'.
 * @param {string} id - ID del gasto a editar.
 */
function editExpense(mode, id) {
    const expenses = mode === 'general' ? generalExpenses : travelExpenses;
    const expenseToEdit = expenses.find(exp => exp.id === id);

    if (expenseToEdit) {
        editingExpenseId = id;
        document.getElementById(`${mode}AddExpenseBtn`).textContent = 'Guardar Cambios';

        // Cargar los datos en el formulario
        document.getElementById(`${mode}ExpenseItem`).value = expenseToEdit.item;
        document.getElementById(`${mode}ExpensePrice`).value = expenseToEdit.price;
        document.getElementById(`${mode}ExpensePayer`).value = expenseToEdit.payer;

        // Desmarcar todos los checkboxes primero
        document.querySelectorAll(`#${mode}InvolvedParticipantsCheckboxes input[name="${mode}Involved"]`).forEach(cb => {
            cb.checked = false;
        });
        // Marcar los checkboxes de los participantes involucrados
        expenseToEdit.involvedParticipants.forEach(participantName => {
            const checkbox = document.querySelector(`#${mode}InvolvedParticipantsCheckboxes input[value="${participantName}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        // Para el modo viaje, seleccionar la moneda
        if (mode === 'travel') {
            document.querySelector(`input[name="travelCurrency"][value="${expenseToEdit.currency}"]`).checked = true;
            document.getElementById('travelExpenseDate').value = expenseToEdit.date; // Cargar fecha también
        }
    }
}


/**
 * Elimina un gasto de la lista activa.
 * @param {string} mode - 'general' o 'travel'.
 * @param {string} id - ID del gasto a eliminar.
 */
async function deleteExpense(mode, id) {
    if (!userId) {
        showModal("Error: Usuario no autenticado. Por favor, recarga la página.");
        return;
    }
    const expenseDocRef = doc(db, `artifacts/${appId}/users/${userId}/${mode}Expenses`, id);
    try {
        await deleteDoc(expenseDocRef);
    } catch (e) {
        console.error("Error eliminando gasto:", e);
        showModal(`Error al eliminar gasto: ${e.message}`);
    }
}

/**
 * Renderiza la lista de gastos en la tabla.
 * @param {string} mode - 'general' o 'travel'.
 */
function renderExpenses(mode) {
    const expensesTableBody = document.getElementById(`${mode}ExpensesTableBody`);
    const noExpensesMessage = document.getElementById(`${mode}NoExpensesMessage`);
    const expensesTableHeader = document.getElementById(`${mode}ExpensesTableHeader`);


    const expenses = mode === 'general' ? generalExpenses : travelExpenses;

    expensesTableBody.innerHTML = ''; // Limpiar tabla

    if (expenses.length === 0) {
        noExpensesMessage.classList.remove('hidden');
        return;
    } else {
        noExpensesMessage.classList.add('hidden');
    }

    // Actualizar encabezado de la tabla según el modo
    if (mode === 'general') {
        expensesTableHeader.innerHTML = `
            <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ítem</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagó</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participan</th>
                <th scope="col" class="relative px-6 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
        `;
    } else { // travel mode
        expensesTableHeader.innerHTML = `
            <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ítem</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagó</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participan</th>
                <th scope="col" class="relative px-6 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
        `;
    }


    expenses.forEach(expense => {
        const row = expensesTableBody.insertRow();
        row.className = 'hover:bg-gray-50 cursor-pointer'; // Añadir cursor-pointer
        row.onclick = () => editExpense(mode, expense.id); // Añadir evento de clic para editar

        // Determinar qué columnas mostrar
        let cells = '';
        if (mode === 'travel') { // Solo mostrar fecha en modo viaje
            cells += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.date}</td>`;
        }

        cells += `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.item}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${parseFloat(expense.price).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.currency}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.payer}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.involvedParticipants.join(', ')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="event.stopPropagation(); deleteExpense('${mode}', '${expense.id}')" class="text-red-600 hover:text-red-900 transition duration-150 ease-in-out">Eliminar</button>
            </td>
        `;
        row.innerHTML = cells;
    });
}

// --- Lógica de Cálculo de Saldos (MEJORADA) ---

/**
 * Calcula los saldos de gastos entre los participantes, neteando las deudas directas.
 * @param {Array<Object>} expenses - Lista de gastos.
 * @param {Array<Object>} participants - Lista de participantes.
 * @param {number} exchangeRate - Tipo de cambio USD a ARS.
 * @returns {Object} - Objeto con totalExpenses, averageExpense y balanceList.
 */
function calculateBalances(expenses, participants, exchangeRate) {
    // Mapa para almacenar las deudas directas entre cada par de personas
    // directDebts.get(deudor).get(acreedor) = cantidad_adeudada
    const directDebts = new Map();
    participants.forEach(p => {
        directDebts.set(p.name, new Map());
    });

    let totalExpenses = 0;

    // 1. Calcular las deudas iniciales por cada gasto
    expenses.forEach(expense => {
        const payer = expense.payer;
        const involvedParticipants = expense.involvedParticipants;
        let price = parseFloat(expense.price);

        // Convertir USD a ARS si es necesario
        if (expense.currency === 'USD' && exchangeRate) {
            price *= exchangeRate;
        }
        totalExpenses += price;

        const sharePerPerson = price / involvedParticipants.length;

        involvedParticipants.forEach(participant => {
            if (participant !== payer) {
                // El participante debe al pagador
                const currentDebt = directDebts.get(participant).get(payer) || 0;
                directDebts.get(participant).set(payer, currentDebt + sharePerPerson);
            }
        });
    });

    // 2. Neteo de deudas entre pares de personas
    const finalBalances = [];
    const processedPairs = new Set(); // Para evitar procesar A-B y luego B-A

    participants.forEach(p1 => {
        participants.forEach(p2 => {
            if (p1.name === p2.name) return; // No se deben a sí mismos

            // Crear una clave única para el par, independientemente del orden
            const pairKey = [p1.name, p2.name].sort().join('_');

            if (processedPairs.has(pairKey)) {
                return; // Ya procesado este par
            }

            let p1OwesP2 = directDebts.get(p1.name)?.get(p2.name) || 0;
            let p2OwesP1 = directDebts.get(p2.name)?.get(p1.name) || 0;

            if (p1OwesP2 > p2OwesP1) {
                const netAmount = p1OwesP2 - p2OwesP1;
                if (netAmount > 0.01) { // Solo añadir si la deuda es significativa
                    finalBalances.push(`${p1.name} debe ARS ${netAmount.toFixed(2)} a ${p2.name}.`);
                }
            } else if (p2OwesP1 > p1OwesP2) {
                const netAmount = p2OwesP1 - p1OwesP2;
                if (netAmount > 0.01) { // Solo añadir si la deuda es significativa
                    finalBalances.push(`${p2.name} debe ARS ${netAmount.toFixed(2)} a ${p1.name}.`);
                }
            }
            processedPairs.add(pairKey);
        });
    });

    const averageExpense = participants.length > 0 ? totalExpenses / participants.length : 0;

    return {
        totalExpenses: totalExpenses,
        averageExpense: averageExpense,
        balanceList: finalBalances
    };
}


/**
 * Actualiza la sección de resumen de saldos.
 * @param {string} mode - 'general' o 'travel'.
 */
function updateSummary(mode) {
    const totalExpensesSpan = document.getElementById(`${mode}TotalExpenses`);
    const averageExpenseSpan = document.getElementById(`${mode}AverageExpense`);
    const balanceListUl = document.getElementById(`${mode}BalanceList`);
    const noBalancesMessage = document.getElementById(`${mode}NoBalancesMessage`);

    const expenses = mode === 'general' ? generalExpenses : travelExpenses;
    const participants = mode === 'general' ? generalParticipants : travelParticipants;

    const { totalExpenses, averageExpense, balanceList } = calculateBalances(expenses, participants, exchangeRate);

    totalExpensesSpan.textContent = `ARS ${totalExpenses.toFixed(2)}`;
    averageExpenseSpan.textContent = `ARS ${averageExpense.toFixed(2)}`;

    balanceListUl.innerHTML = ''; // Limpiar lista

    if (balanceList.length === 0) {
        noBalancesMessage.classList.remove('hidden');
    } else {
        noBalancesMessage.classList.add('hidden');
        balanceList.forEach(balance => {
            const li = document.createElement('li');
            li.textContent = balance;
            balanceListUl.appendChild(li);
        });
    }
}

// --- Funciones de Interfaz de Usuario ---

/**
 * Cambia el modo de la aplicación entre "Gastos de Viaje" y "Gastos Generales".
 * @param {string} mode - 'general' o 'travel'.
 */
function switchMode(mode) {
    currentMode = mode;
    if (mode === 'travel') {
        travelSection.classList.remove('hidden');
        generalSection.classList.add('hidden');
        travelModeBtn.classList.add('active');
        generalModeBtn.classList.remove('active');
        exchangeRateContainer.classList.remove('hidden'); // Mostrar tipo de cambio
        fetchExchangeRate(); // Cargar tipo de cambio al cambiar a modo viaje
    } else {
        travelSection.classList.add('hidden');
        generalSection.classList.remove('hidden');
        travelModeBtn.classList.remove('active');
        generalModeBtn.classList.add('active');
        exchangeRateContainer.classList.add('hidden'); // Ocultar tipo de cambio
    }
    updateUI(); // Actualizar la UI para el nuevo modo
}

/**
 * Actualiza toda la interfaz de usuario.
 */
function updateUI() {
    renderParticipants(currentMode);
    renderExpenses(currentMode);
    updateSummary(currentMode);
}

/**
 * Obtiene el tipo de cambio USD a ARS desde una API externa.
 */
async function fetchExchangeRate() {
    exchangeRateDisplay.textContent = 'Cargando...';
    const apiKey = '44426f5c88d04ec487673e15502bdfb2'; // Clave API proporcionada por el usuario
    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.result === 'success' && data.conversion_rates && data.conversion_rates.ARS) {
            exchangeRate = data.conversion_rates.ARS;
            exchangeRateDisplay.textContent = `ARS ${exchangeRate.toFixed(2)}`;
            updateSummary('travel'); // Recalcular saldos de viaje con el nuevo tipo de cambio
        } else {
            throw new Error("Datos de tipo de cambio no válidos.");
        }
    } catch (error) {
        console.error("Error fetching exchange rate:", error);
        exchangeRateDisplay.textContent = 'Error al cargar';
        showModal("Error al cargar el tipo de cambio. Usando valor predeterminado.");
        exchangeRate = 1000; // Valor predeterminado en caso de error
        updateSummary('travel'); // Recalcular saldos de viaje con el valor predeterminado
    }
}

// --- Event Listeners ---

window.onload = () => {
    initializeFirebase(); // Inicializa Firebase al cargar la página
    switchMode('general'); // Inicia en modo "Gastos Generales" por defecto

    // Event listeners para los botones de modo
    travelModeBtn.addEventListener('click', () => switchMode('travel'));
    generalModeBtn.addEventListener('click', () => switchMode('general'));

    // Event listeners para añadir participantes
    document.getElementById('addGeneralParticipantBtn').addEventListener('click', () => {
        const name = document.getElementById('generalParticipantName').value;
        addParticipant('general', name);
    });
    document.getElementById('addTravelParticipantBtn').addEventListener('click', () => {
        const name = document.getElementById('travelParticipantName').value;
        addParticipant('travel', name);
    });

    // Event listeners para añadir gastos
    document.getElementById('generalExpenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            item: document.getElementById('generalExpenseItem').value,
            price: parseFloat(document.getElementById('generalExpensePrice').value),
            currency: 'ARS', // Fijo para gastos generales
            payer: document.getElementById('generalExpensePayer').value,
            involvedParticipants: Array.from(document.querySelectorAll('#generalInvolvedParticipantsCheckboxes input[name="generalInvolved"]:checked')).map(cb => cb.value)
        };
        if (expenseData.involvedParticipants.length === 0) {
            showModal("Debes seleccionar al menos un participante para este gasto.");
            return;
        }
        if (!expenseData.payer) {
            showModal("Debes seleccionar quién pagó este gasto.");
            return;
        }
        addExpense('general', expenseData);
    });

    document.getElementById('travelExpenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            date: document.getElementById('travelExpenseDate').value,
            item: document.getElementById('travelExpenseItem').value,
            price: parseFloat(document.getElementById('travelExpensePrice').value),
            currency: document.querySelector('input[name="travelCurrency"]:checked').value,
            payer: document.getElementById('travelExpensePayer').value,
            involvedParticipants: Array.from(document.querySelectorAll('#travelInvolvedParticipantsCheckboxes input[name="travelInvolved"]:checked')).map(cb => cb.value)
        };
        if (expenseData.involvedParticipants.length === 0) {
            showModal("Debes seleccionar al menos un participante para este gasto.");
            return;
        }
        if (!expenseData.payer) {
            showModal("Debes seleccionar quién pagó este gasto.");
            return;
        }
        addExpense('travel', expenseData);
    });

    // Event listeners para el modal
    modalOkButton.addEventListener('click', hideModal);
    closeButton.addEventListener('click', hideModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideModal();
        }
    });

    // Exponer funciones globales para el HTML (onclick)
    window.deleteParticipant = deleteParticipant;
    window.deleteExpense = deleteExpense;
    window.editExpense = editExpense; // Exponer la función editExpense
};
