import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Variables Globales ---
let app;
let db;
let auth;
let userId;

// Hardcoded Firebase configuration (provided by the user)
const firebaseConfig = {
    apiKey: "AIzaSyAeIKWGArwd2gORhhT0UL0m7Ok4oyNXdiE",
    authDomain: "divisor-gastos-8777d.firebaseapp.com",
    projectId: "divisor-gastos-8777d",
    storageBucket: "divisor-gastos-8777d.firebasestorage.app",
    messagingSenderId: "266285332356",
    appId: "1:266285332356:web:c3d616a7c7dc48a90acfd1",
    measurementId: "G-5ZRS955TKY"
};

// Use projectId from the hardcoded config for appId
let appId = firebaseConfig.projectId; 

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
        console.log("Firebase config (hardcoded):", firebaseConfig);

        // Basic validation for critical config fields
        if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
            const missingFields = [];
            if (!firebaseConfig.apiKey) missingFields.push("apiKey");
            if (!firebaseConfig.authDomain) missingFields.push("authDomain");
            if (!firebaseConfig.projectId) missingFields.push("projectId");
            showModal(`Error: Configuración de Firebase incompleta. Faltan campos: ${missingFields.join(', ')}. La aplicación puede no funcionar correctamente.`);
            console.error("Firebase configuration is missing critical fields:", missingFields);
            return;
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Always attempt anonymous authentication
        await signInAnonymously(auth);
        console.log("Autenticación anónima exitosa.");
        
        // Listener for authentication state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Firebase initialized and user authenticated:", userId);
                // Once authenticated, set up Firestore listeners
                setupFirestoreListeners();
            } else {
                console.log("No user authenticated after onAuthStateChanged.");
                userId = null;
                // Clear data if no user
                generalParticipants = [];
                generalExpenses = [];
                travelParticipants = [];
                travelExpenses = [];
                updateUI(); // Update UI to reflect empty data
                showModal("No se pudo autenticar al usuario. Algunas funcionalidades pueden estar limitadas. Por favor, recarga la página si persisten los problemas.");
            }
        });
    } catch (error) {
        console.error("Error general al inicializar Firebase o autenticar:", error);
        showModal(`Error crítico al iniciar Firebase: ${error.message}. La aplicación puede no funcionar correctamente.`);
    } finally {
        // Ensure UI always updates after initialization attempt
        updateUI();
    }
}

/**
 * Configura los listeners de Firestore para cada colección.
 */
function setupFirestoreListeners() {
    if (!userId) {
        console.warn("setupFirestoreListeners llamado sin userId. No se configurarán los listeners.");
        return;
    }
    console.log(`Configurando listeners de Firestore para appId: ${appId}, userId: ${userId}`);

    // Listener para participantes generales
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/generalParticipants`), (snapshot) => {
        generalParticipants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderParticipants('general');
        updateSummary('general');
        console.log("Participantes generales cargados:", generalParticipants.length);
    }, (error) => {
        console.error("Error fetching general participants:", error);
        showModal(`Error al cargar participantes generales: ${error.message}`);
    });

    // Listener para gastos generales
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/generalExpenses`), (snapshot) => {
        generalExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses('general');
        updateSummary('general');
        console.log("Gastos generales cargados:", generalExpenses.length);
    }, (error) => {
        console.error("Error fetching general expenses:", error);
        showModal(`Error al cargar gastos generales: ${error.message}`);
    });

    // Listener para participantes de viaje
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/travelParticipants`), (snapshot) => {
        travelParticipants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderParticipants('travel');
        updateSummary('travel');
        console.log("Participantes de viaje cargados:", travelParticipants.length);
    }, (error) => {
        console.error("Error fetching travel participants:", error);
        showModal(`Error al cargar participantes de viaje: ${error.message}`);
    });

    // Listener para gastos de viaje
    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/travelExpenses`), (snapshot) => {
        travelExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses('travel');
        updateSummary('travel');
        console.log("Gastos de viaje cargados:", travelExpenses.length);
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
        showModal("Error: Usuario no autenticado. No se puede añadir participante. Por favor, recarga la página.");
        return;
    }
    if (!name.trim()) {
        showModal("El nombre del participante no puede estar vacío.");
        return;
    }
    const participantsRef = collection(db, `artifacts/${appId}/users/${userId}/${mode}Participants`);
    try {
        await addDoc(participantsRef, { name: name.trim() });
        document.getElementById(`${mode}ParticipantName`).value = ''; // Clear input
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
        showModal("Error: Usuario no autenticado. No se puede eliminar participante. Por favor, recarga la página.");
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

    // Clear previous lists
    participantsList.innerHTML = '';
    payerSelect.innerHTML = '<option value="">Selecciona un participante</option>';
    involvedCheckboxes.innerHTML = '';

    if (participants.length === 0) {
        return;
    }

    participants.forEach(p => {
        // Render in participants list
        const participantTag = document.createElement('span');
        participantTag.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2';
        participantTag.innerHTML = `${p.name} <button class="text-blue-600 hover:text-blue-800 font-bold" onclick="deleteParticipant('${mode}', '${p.id}')">&times;</button>`;
        participantsList.appendChild(participantTag);

        // Populate "Who Paid" selector
        const payerOption = document.createElement('option');
        payerOption.value = p.name;
        payerOption.textContent = p.name;
        payerSelect.appendChild(payerOption);

        // Populate "Who Participates" checkboxes
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'flex items-center';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="${mode}-${p.id}-checkbox" name="${mode}Involved" value="${p.name}" class="form-checkbox h-5 w-5 text-blue-600 rounded">
            <label for="${mode}-${p.id}-checkbox" class="ml-2 text-gray-700">${p.name}</label>
        `;
        involvedCheckboxes.appendChild(checkboxDiv);
    });

    // Add "Select All" checkbox only for general mode
    if (mode === 'general') {
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'flex items-center mt-2';
        selectAllDiv.innerHTML = `
            <input type="checkbox" id="generalSelectAllParticipants" class="form-checkbox h-5 w-5 text-blue-600 rounded">
            <label for="generalSelectAllParticipants" class="ml-2 text-gray-700 font-semibold">Seleccionar todos</label>
        `;
        involvedCheckboxes.prepend(selectAllDiv); // Add to the beginning

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
        showModal("Error: Usuario no autenticado. No se puede añadir gasto. Por favor, recarga la página.");
        return;
    }
    const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/${mode}Expenses`);
    try {
        if (editingExpenseId) {
            // If editing, update the existing document
            const expenseDocRef = doc(db, `artifacts/${appId}/users/${userId}/${mode}Expenses`, editingExpenseId);
            await updateDoc(expenseDocRef, expenseData);
            editingExpenseId = null; // Reset editing ID
            document.getElementById(`${mode}AddExpenseBtn`).textContent = 'Añadir Gasto'; // Restore button text
        } else {
            // If not editing, add a new document
            await addDoc(expensesRef, expenseData);
        }
        document.getElementById(`${mode}ExpenseForm`).reset(); // Clear form
        // Uncheck all checkboxes after adding/editing expense
        document.querySelectorAll(`#${mode}InvolvedParticipantsCheckboxes input[name="${mode}Involved"]`).forEach(cb => {
            cb.checked = false;
        });
        // Uncheck "Select All" checkbox if it exists
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

        // Load data into the form
        document.getElementById(`${mode}ExpenseItem`).value = expenseToEdit.item;
        document.getElementById(`${mode}ExpensePrice`).value = parseFloat(expenseToEdit.price); // Ensure it's a number
        document.getElementById(`${mode}ExpensePayer`).value = expenseToEdit.payer;

        // Uncheck all checkboxes first
        document.querySelectorAll(`#${mode}InvolvedParticipantsCheckboxes input[name="${mode}Involved"]`).forEach(cb => {
            cb.checked = false;
        });
        // Check checkboxes for involved participants
        expenseToEdit.involvedParticipants.forEach(participantName => {
            const checkbox = document.querySelector(`#${mode}InvolvedParticipantsCheckboxes input[value="${participantName}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        // For travel mode, select currency
        if (mode === 'travel') {
            document.querySelector(`input[name="travelCurrency"][value="${expenseToEdit.currency}"]`).checked = true;
            document.getElementById('travelExpenseDate').value = expenseToEdit.date; // Load date as well
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
        showModal("Error: Usuario no autenticado. No se puede eliminar gasto. Por favor, recarga la página.");
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

    expensesTableBody.innerHTML = ''; // Clear table

    if (expenses.length === 0) {
        noExpensesMessage.classList.remove('hidden');
        return;
    } else {
        noExpensesMessage.classList.add('hidden');
    }

    // Update table header based on mode
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
        row.className = 'hover:bg-gray-50 cursor-pointer'; // Add cursor-pointer
        row.onclick = () => editExpense(mode, expense.id); // Add click event for editing

        // Determine which columns to show
        let cells = '';
        if (mode === 'travel') { // Only show date in travel mode
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
    // Map to store direct debts between each pair of people
    // directDebts.get(debtor).get(creditor) = amount_owed
    const directDebts = new Map();
    participants.forEach(p => {
        directDebts.set(p.name, new Map());
    });

    let totalExpenses = 0;

    // 1. Calculate initial debts for each expense
    expenses.forEach(expense => {
        const payer = expense.payer;
        const involvedParticipants = expense.involvedParticipants;
        let price = parseFloat(expense.price);

        // Convert USD to ARS if necessary
        if (expense.currency === 'USD' && exchangeRate) {
            price *= exchangeRate;
        }
        totalExpenses += price;

        const sharePerPerson = price / involvedParticipants.length;

        involvedParticipants.forEach(participant => {
            if (participant !== payer) {
                // Participant owes the payer
                const currentDebt = directDebts.get(participant).get(payer) || 0;
                directDebts.get(participant).set(payer, currentDebt + sharePerPerson);
            }
        });
    });

    // 2. Netting debts between pairs of people
    const finalBalances = [];
    const processedPairs = new Set(); // To avoid processing A-B and then B-A

    participants.forEach(p1 => {
        participants.forEach(p2 => {
            if (p1.name === p2.name) return; // They don't owe themselves

            // Create a unique key for the pair, regardless of order
            const pairKey = [p1.name, p2.name].sort().join('_');

            if (processedPairs.has(pairKey)) {
                return; // Already processed this pair
            }

            let p1OwesP2 = directDebts.get(p1.name)?.get(p2.name) || 0;
            let p2OwesP1 = directDebts.get(p2.name)?.get(p1.name) || 0;

            if (p1OwesP2 > p2OwesP1) {
                const netAmount = p1OwesP2 - p2OwesP1;
                if (netAmount > 0.01) { // Only add if debt is significant
                    finalBalances.push(`${p1.name} debe ARS ${netAmount.toFixed(2)} a ${p2.name}.`);
                }
            } else if (p2OwesP1 > p1OwesP2) {
                const netAmount = p2OwesP1 - p1OwesP2;
                if (netAmount > 0.01) { // Only add if debt is significant
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

    balanceListUl.innerHTML = ''; // Clear list

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
        exchangeRateContainer.classList.remove('hidden'); // Show exchange rate
        fetchExchangeRate(); // Load exchange rate when switching to travel mode
    } else {
        travelSection.classList.add('hidden');
        generalSection.classList.remove('hidden');
        travelModeBtn.classList.remove('active');
        generalModeBtn.classList.add('active');
        exchangeRateContainer.classList.add('hidden'); // Hide exchange rate
    }
    updateUI(); // Update UI for the new mode
}

/**
 * Updates the entire user interface.
 */
function updateUI() {
    renderParticipants(currentMode);
    renderExpenses(currentMode);
    updateSummary(currentMode);
}

/**
 * Fetches the USD to ARS exchange rate from an external API.
 */
async function fetchExchangeRate() {
    exchangeRateDisplay.textContent = 'Cargando...';
    // Using the API key provided by the user for Open Exchange Rates
    const apiKey = '44426f5c88d04ec487673e15502bdfb2'; 
    const apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`API response was not ok: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Open Exchange Rates API Response:", data); // Log the full response

        if (data.rates && data.rates.ARS) {
            exchangeRate = data.rates.ARS;
            exchangeRateDisplay.textContent = `ARS ${exchangeRate.toFixed(2)}`;
            updateSummary('travel'); // Recalculate travel balances with the new exchange rate
        } else if (data.error) {
            console.error("Open Exchange Rates API Error:", data.description || data.message);
            throw new Error(`API Error: ${data.description || data.message}`);
        }
        else {
            throw new Error("Invalid exchange rate data format from Open Exchange Rates.");
        }
    } catch (error) {
        console.error("Error fetching exchange rate:", error);
        exchangeRateDisplay.textContent = 'Error al cargar';
        showModal(`Error al cargar el tipo de cambio: ${error.message}. Usando valor predeterminado.`);
        exchangeRate = 1000; // Default value in case of error
        updateSummary('travel'); // Recalculate travel balances with the default value
    }
}

// --- Event Listeners ---

window.onload = () => {
    initializeFirebase(); // Initialize Firebase on page load
    switchMode('general'); // Start in "General Expenses" mode by default

    // Event listeners for mode buttons
    travelModeBtn.addEventListener('click', () => switchMode('travel'));
    generalModeBtn.addEventListener('click', () => switchMode('general'));

    // Event listeners for adding participants
    document.getElementById('addGeneralParticipantBtn').addEventListener('click', () => {
        const name = document.getElementById('generalParticipantName').value;
        addParticipant('general', name);
    });
    document.getElementById('addTravelParticipantBtn').addEventListener('click', () => {
        const name = document.getElementById('travelParticipantName').value;
        addParticipant('travel', name);
    });

    // Event listeners for adding expenses
    document.getElementById('generalExpenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            item: document.getElementById('generalExpenseItem').value,
            price: parseFloat(document.getElementById('generalExpensePrice').value),
            currency: 'ARS', // Fixed for general expenses
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

    // Event listeners for the modal
    modalOkButton.addEventListener('click', hideModal);
    closeButton.addEventListener('click', hideModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideModal();
        }
    });

    // Expose global functions for HTML (onclick)
    window.deleteParticipant = deleteParticipant;
    window.deleteExpense = deleteExpense;
    window.editExpense = editExpense; // Expose editExpense function
};
