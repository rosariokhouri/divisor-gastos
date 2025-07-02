// Data storage for both modes
let allExpenses = {
    travel: [],
    general: []
};
let allParticipants = {
    travel: [],
    general: []
};
let currentMode = 'travel'; // Default mode

// Variable para almacenar el tipo de cambio USD a ARS
let currentUsdToArsRate = 1000; // Valor por defecto si la API falla o no se carga
const defaultUsdToArsRate = 1000; // Valor por defecto si la API falla o no se carga

// --- References to DOM elements ---
// Navigation buttons
const travelModeBtn = document.getElementById('travelModeBtn');
const generalModeBtn = document.getElementById('generalModeBtn');
const travelSection = document.getElementById('travelSection');
const generalSection = document.getElementById('generalSection');
const exchangeRateContainer = document.getElementById('exchangeRateContainer');

// Travel Mode Elements
const travelParticipantNameInput = document.getElementById('travelParticipantName');
const addTravelParticipantBtn = document.getElementById('addTravelParticipantBtn');
const travelParticipantsListDiv = document.getElementById('travelParticipantsList');
const travelExpensePayerSelect = document.getElementById('travelExpensePayer');
const travelInvolvedParticipantsCheckboxesDiv = document.getElementById('travelInvolvedParticipantsCheckboxes');
const travelExpenseForm = document.getElementById('travelExpenseForm');
const travelExpensesTableBody = document.getElementById('travelExpensesTableBody');
const noTravelExpensesMessage = document.getElementById('noTravelExpensesMessage');
const travelTotalExpensesSpan = document.getElementById('travelTotalExpenses');
const travelAverageExpenseSpan = document.getElementById('travelAverageExpense');
const travelBalanceList = document.getElementById('travelBalanceList');
const noTravelBalancesMessage = document.getElementById('noTravelBalancesMessage');

// General Mode Elements
const generalParticipantNameInput = document.getElementById('generalParticipantName');
const addGeneralParticipantBtn = document.getElementById('addGeneralParticipantBtn');
const generalParticipantsListDiv = document.getElementById('generalParticipantsList');
const generalExpensePayerSelect = document.getElementById('generalExpensePayer');
const generalInvolvedParticipantsCheckboxesDiv = document.getElementById('generalInvolvedParticipantsCheckboxes');
const generalExpenseForm = document.getElementById('generalExpenseForm');
const generalExpensesTableBody = document.getElementById('generalExpensesTableBody');
const noGeneralExpensesMessage = document.getElementById('noGeneralExpensesMessage');
const generalTotalExpensesSpan = document.getElementById('generalTotalExpenses');
const generalAverageExpenseSpan = document.getElementById('generalAverageExpense');
const generalBalanceList = document.getElementById('generalBalanceList');
const noGeneralBalancesMessage = document.getElementById('noGeneralBalancesMessage');

// Common Elements
const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');
const myModal = document.getElementById('myModal');
const modalMessage = document.getElementById('modalMessage');
const closeButton = document.querySelector('.close-button');
const modalOkButton = document.getElementById('modalOkButton');

// --- Modal Functions ---
function showModal(message) {
    modalMessage.textContent = message;
    myModal.style.display = 'flex';
}

closeButton.onclick = function() {
    myModal.style.display = 'none';
}
modalOkButton.onclick = function() {
    myModal.style.display = 'none';
}
window.onclick = function(event) {
    if (event.target == myModal) {
        myModal.style.display = 'none';
    }
}

// --- Mode Switching Logic ---
function switchMode(mode) {
    currentMode = mode;

    // Update active button styles
    travelModeBtn.classList.remove('active');
    generalModeBtn.classList.remove('active');
    if (mode === 'travel') {
        travelModeBtn.classList.add('active');
        travelSection.classList.remove('hidden');
        generalSection.classList.add('hidden');
        exchangeRateContainer.classList.remove('hidden'); // Show exchange rate for travel mode
    } else { // general mode
        generalModeBtn.classList.add('active');
        travelSection.classList.add('hidden');
        generalSection.classList.remove('hidden');
        exchangeRateContainer.classList.add('hidden'); // Hide exchange rate for general mode
    }
    renderUI(); // Re-render UI for the new mode
}

travelModeBtn.addEventListener('click', () => switchMode('travel'));
generalModeBtn.addEventListener('click', () => switchMode('general'));

// --- Helper Functions to get/set data based on currentMode ---
function getParticipants() {
    return allParticipants[currentMode];
}

function setParticipants(newParticipants) {
    allParticipants[currentMode] = newParticipants;
}

function getExpenses() {
    return allExpenses[currentMode];
}

function setExpenses(newExpenses) {
    allExpenses[currentMode] = newExpenses;
}

// --- Participant Management ---
function addParticipant(nameInput, participantsListDiv, addBtn) {
    const name = nameInput.value.trim();
    let currentParticipants = getParticipants();
    if (name && !currentParticipants.includes(name)) {
        currentParticipants.push(name);
        setParticipants(currentParticipants);
        nameInput.value = '';
        renderParticipants();
        updatePayerSelect();
        updateInvolvedParticipantsCheckboxes();
        updateSummary();
    } else if (name && currentParticipants.includes(name)) {
        showModal('El participante "' + name + '" ya existe.');
    } else {
        showModal('Por favor, ingresa un nombre para el participante.');
    }
}

function renderParticipants() {
    const currentParticipants = getParticipants();
    let targetListDiv = currentMode === 'travel' ? travelParticipantsListDiv : generalParticipantsListDiv;
    targetListDiv.innerHTML = '';
    if (currentParticipants.length === 0) {
        targetListDiv.innerHTML = '<p class="text-gray-500">Aún no hay participantes. Añade algunos para empezar.</p>';
    } else {
        currentParticipants.forEach(participant => {
            const span = document.createElement('span');
            span.className = 'bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2';
            span.textContent = participant;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'x';
            removeBtn.className = 'text-blue-600 hover:text-blue-900 font-bold ml-1';
            removeBtn.onclick = () => removeParticipant(participant);

            span.appendChild(removeBtn);
            targetListDiv.appendChild(span);
        });
    }
}

function removeParticipant(nameToRemove) {
    const currentExpenses = getExpenses();
    const currentParticipants = getParticipants();

    const hasExpenses = currentExpenses.some(expense =>
        expense.payer === nameToRemove || expense.involvedParticipants.includes(nameToRemove)
    );

    if (hasExpenses) {
        showModal(`No se puede eliminar a "${nameToRemove}" porque tiene gastos asociados. Primero elimina sus gastos o quítalo de ellos.`);
        return;
    }

    setParticipants(currentParticipants.filter(p => p !== nameToRemove));
    renderParticipants();
    updatePayerSelect();
    updateInvolvedParticipantsCheckboxes();
    updateSummary();
}

function updatePayerSelect() {
    const currentParticipants = getParticipants();
    let targetSelect = currentMode === 'travel' ? travelExpensePayerSelect : generalExpensePayerSelect;
    targetSelect.innerHTML = '<option value="">Selecciona un participante</option>';
    currentParticipants.forEach(participant => {
        const option = document.createElement('option');
        option.value = participant;
        option.textContent = participant;
        targetSelect.appendChild(option);
    });
}

function updateInvolvedParticipantsCheckboxes() {
    const currentParticipants = getParticipants();
    let targetCheckboxesDiv = currentMode === 'travel' ? travelInvolvedParticipantsCheckboxesDiv : generalInvolvedParticipantsCheckboxesDiv;
    targetCheckboxesDiv.innerHTML = '';
    if (currentParticipants.length === 0) {
        targetCheckboxesDiv.innerHTML = '<p class="text-gray-500">Añade participantes para poder seleccionarlos aquí.</p>';
    } else {
        currentParticipants.forEach(participant => {
            const label = document.createElement('label');
            label.className = 'inline-flex items-center';
            label.innerHTML = `
                <input type="checkbox" name="involvedParticipant" value="${participant}"
                       class="form-checkbox h-5 w-5 text-blue-600 rounded">
                <span class="ml-2 text-gray-700">${participant}</span>
            `;
            targetCheckboxesDiv.appendChild(label);
        });
    }
}

// --- Expense Management ---
function addExpense(event) {
    event.preventDefault();

    const currentParticipants = getParticipants();
    if (currentParticipants.length === 0) {
        showModal('Por favor, añade al menos un participante antes de añadir gastos.');
        return;
    }

    let date, item, price, currency, payer, selectedInvolvedCheckboxes;

    if (currentMode === 'travel') {
        date = document.getElementById('travelExpenseDate').value;
        item = document.getElementById('travelExpenseItem').value;
        price = parseFloat(document.getElementById('travelExpensePrice').value);
        currency = document.querySelector('input[name="travelCurrency"]:checked').value;
        payer = document.getElementById('travelExpensePayer').value;
        selectedInvolvedCheckboxes = document.querySelectorAll('#travelInvolvedParticipantsCheckboxes input[name="involvedParticipant"]:checked');
    } else { // general mode
        date = document.getElementById('generalExpenseDate').value;
        item = document.getElementById('generalExpenseItem').value;
        price = parseFloat(document.getElementById('generalExpensePrice').value);
        currency = 'ARS'; // Fixed for general expenses
        payer = document.getElementById('generalExpensePayer').value;
        selectedInvolvedCheckboxes = document.querySelectorAll('#generalInvolvedParticipantsCheckboxes input[name="involvedParticipant"]:checked');
    }

    const involvedParticipants = Array.from(selectedInvolvedCheckboxes).map(cb => cb.value);

    if (!payer) {
        showModal('Por favor, selecciona quién pagó el gasto.');
        return;
    }

    if (involvedParticipants.length === 0) {
        showModal('Por favor, selecciona al menos un participante involucrado en este gasto.');
        return;
    }

    const newExpense = {
        id: Date.now(), // Unique ID for the expense
        date,
        item,
        price,
        currency,
        payer,
        involvedParticipants // Store who is involved in this specific expense
    };

    let currentExpenses = getExpenses();
    currentExpenses.push(newExpense);
    setExpenses(currentExpenses);

    // Reset form and re-render UI
    if (currentMode === 'travel') {
        travelExpenseForm.reset();
    } else {
        generalExpenseForm.reset();
    }
    updateInvolvedParticipantsCheckboxes(); // Re-render checkboxes to clear selections
    renderExpenses();
    updateSummary();
}

function renderExpenses() {
    const currentExpenses = getExpenses();
    let targetTableBody = currentMode === 'travel' ? travelExpensesTableBody : generalExpensesTableBody;
    let targetNoExpensesMessage = currentMode === 'travel' ? noTravelExpensesMessage : noGeneralExpensesMessage;

    targetTableBody.innerHTML = '';
    if (currentExpenses.length === 0) {
        targetNoExpensesMessage.classList.remove('hidden');
    } else {
        targetNoExpensesMessage.classList.add('hidden');
        currentExpenses.forEach(expense => {
            const row = targetTableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.item}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.price.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.currency}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.payer}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${expense.involvedParticipants.join(', ')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="deleteExpense(${expense.id})"
                            class="text-red-600 hover:text-red-900 transition duration-300 ease-in-out">
                        Eliminar
                    </button>
                </td>
            `;
        });
    }
}

function deleteExpense(id) {
    let currentExpenses = getExpenses();
    setExpenses(currentExpenses.filter(expense => expense.id !== id));
    renderExpenses();
    updateSummary();
}

/**
 * Fetches the current USD to ARS exchange rate from Open Exchange Rates API.
 * IMPORTANT: Replace 'YOUR_OPEN_EXCHANGE_RATES_API_KEY' with your actual API key.
 */
async function fetchExchangeRate() {
    exchangeRateDisplay.textContent = 'Cargando...';
    // REGÍSTRATE EN openexchangerates.org PARA OBTENER TU CLAVE API GRATUITA
    // Y REEMPLAZA 'YOUR_OPEN_EXCHANGE_RATES_API_KEY' CON TU CLAVE REAL.
    const apiKey = '44426f5c88d04ec487673e15502bdfb2'; // <-- ¡PEGA TU CLAVE API AQUÍ!
    const apiUrl = `https://open.er-api.com/v6/latest/USD?apikey=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.result === 'success' && data.rates && data.rates.ARS) {
            currentUsdToArsRate = data.rates.ARS;
            exchangeRateDisplay.textContent = `1 USD = ARS ${currentUsdToArsRate.toFixed(2)}`;
            updateSummary(); // Recalcular el resumen con el nuevo tipo de cambio
        } else {
            // Manejar errores específicos de la API si el resultado no es 'success' o falta la tasa
            throw new Error(data.error || 'Tipo de cambio ARS no encontrado en la respuesta de la API.');
        }
    } catch (error) {
        console.error("Error al obtener el tipo de cambio:", error);
        exchangeRateDisplay.textContent = `Error al cargar (usando ${defaultUsdToArsRate.toFixed(2)})`;
        currentUsdToArsRate = defaultUsdToArsRate; // Usar el valor por defecto en caso de error
        showModal('No se pudo obtener el tipo de cambio actual. Se utilizará un valor por defecto de 1 USD = ARS ' + defaultUsdToArsRate.toFixed(2) + '. Asegúrate de haber pegado tu clave API de Open Exchange Rates.');
        updateSummary();
    }
}

// Function to update the summary of balances
function updateSummary() {
    const currentExpenses = getExpenses();
    const currentParticipants = getParticipants();

    let totalExpensesARS = 0;
    const participantBalances = {}; // { 'Nombre': net_balance_in_ARS }

    // Initialize participant balances to 0
    currentParticipants.forEach(p => {
        participantBalances[p] = 0;
    });

    // Calculate total expenses and individual contributions/debts
    currentExpenses.forEach(expense => {
        let priceInARS = expense.price;
        if (expense.currency === 'USD') {
            priceInARS *= currentUsdToArsRate; // Usar el tipo de cambio actual
        }
        totalExpensesARS += priceInARS;

        // Amount each involved participant should pay for this specific expense
        const costPerInvolvedPerson = expense.involvedParticipants.length > 0 ? priceInARS / expense.involvedParticipants.length : 0;

        // Subtract the share from each involved participant
        expense.involvedParticipants.forEach(involvedP => {
            if (participantBalances[involvedP] !== undefined) { // Ensure participant exists
                participantBalances[involvedP] -= costPerInvolvedPerson;
            }
        });

        // Add the full amount to the payer's balance (they paid it all)
        if (participantBalances[expense.payer] !== undefined) { // Ensure payer exists
            participantBalances[expense.payer] += priceInARS;
        }
    });

    // Update UI elements based on current mode
    let targetTotalExpensesSpan = currentMode === 'travel' ? travelTotalExpensesSpan : generalTotalExpensesSpan;
    let targetAverageExpenseSpan = currentMode === 'travel' ? travelAverageExpenseSpan : generalAverageExpenseSpan;
    let targetBalanceList = currentMode === 'travel' ? travelBalanceList : generalBalanceList;
    let targetNoBalancesMessage = currentMode === 'travel' ? noTravelBalancesMessage : noGeneralBalancesMessage;

    targetTotalExpensesSpan.textContent = `ARS ${totalExpensesARS.toFixed(2)}`;

    const numParticipants = currentParticipants.length;
    const averageExpensePerPersonOverall = numParticipants > 0 ? totalExpensesARS / numParticipants : 0;
    targetAverageExpenseSpan.textContent = `ARS ${averageExpensePerPersonOverall.toFixed(2)}`;


    // Display "Add expenses to see balances." if no participants or expenses
    if (numParticipants === 0 || currentExpenses.length === 0) {
        targetBalanceList.innerHTML = `<li id="${targetNoBalancesMessage.id}" class="text-gray-500">Añade gastos para ver los saldos.</li>`;
        return;
    } else {
        const existingNoBalancesMessage = document.getElementById(targetNoBalancesMessage.id);
        if (existingNoBalancesMessage) {
            existingNoBalancesMessage.remove();
        }
    }

    // Prepare balances for the settlement algorithm
    const balancesToSettle = [];
    for (const payer in participantBalances) {
        // Only include participants who have a non-zero balance
        if (Math.abs(participantBalances[payer]) > 0.01) { // Tolerance for floating point
            balancesToSettle.push({ name: payer, balance: participantBalances[payer] });
        }
    }

    // Simple algorithm to settle payments
    balancesToSettle.sort((a, b) => a.balance - b.balance); // Sort from most owed to most paid

    let i = 0;
    let j = balancesToSettle.length - 1;
    targetBalanceList.innerHTML = ''; // Clear list of balances

    if (balancesToSettle.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = '¡Todos los gastos están equilibrados! 🎉';
        targetBalanceList.appendChild(listItem);
        return;
    }

    while (i < j) {
        const debtor = balancesToSettle[i];
        const creditor = balancesToSettle[j];

        // If debtor is close to zero or positive, and creditor is close to zero or negative, stop
        if (debtor.balance >= -0.01 && creditor.balance <= 0.01) {
            break; // All are balanced within tolerance
        }

        // Amount to settle is the minimum of what debtor owes and what creditor is owed
        const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);

        if (amountToSettle > 0.01) { // Only if there's a significant amount to settle
            const listItem = document.createElement('li');
            listItem.textContent = `${debtor.name} debe ARS ${amountToSettle.toFixed(2)} a ${creditor.name}.`;
            targetBalanceList.appendChild(listItem);
        }

        // Adjust balances
        debtor.balance += amountToSettle;
        creditor.balance -= amountToSettle;

        // Move pointers
        if (debtor.balance >= -0.01) { // If debtor has paid off their debt (or is close to zero)
            i++;
        }
        if (creditor.balance <= 0.01) { // If creditor has received what they are owed (or is close to zero)
            j--;
        }
    }

    // If no transactions were generated but there are still non-zero balances (due to floating point or very small amounts)
    if (targetBalanceList.children.length === 0 && balancesToSettle.some(b => Math.abs(b.balance) > 0.01)) {
         const listItem = document.createElement('li');
         listItem.textContent = '¡Todos los gastos están equilibrados! 🎉'; // Or a more precise message if small discrepancies
         targetBalanceList.appendChild(listItem);
    }
}

// --- Unified UI Rendering Function ---
function renderUI() {
    renderParticipants();
    updatePayerSelect();
    updateInvolvedParticipantsCheckboxes();
    renderExpenses();
    updateSummary();
}

// --- Event Listeners for adding participants and expenses ---
addTravelParticipantBtn.addEventListener('click', () => addParticipant(travelParticipantNameInput, travelParticipantsListDiv, addTravelParticipantBtn));
addGeneralParticipantBtn.addEventListener('click', () => addParticipant(generalParticipantNameInput, generalParticipantsListDiv, addGeneralParticipantBtn));

travelExpenseForm.addEventListener('submit', addExpense);
generalExpenseForm.addEventListener('submit', addExpense);

// Initialize the application on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set current date as default for date fields
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('travelExpenseDate').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('generalExpenseDate').value = `${yyyy}-${mm}-${dd}`;

    fetchExchangeRate(); // Fetch the exchange rate for travel mode
    switchMode('travel'); // Start in travel mode
});
