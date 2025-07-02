// Global Arrays for Expenses and Participants
let participants = [];
let travelExpenses = [];
let generalExpenses = [];

// Exchange Rate Variable
let currentUsdToArsRate = 1000; // Default value if API fails
const defaultUsdToArsRate = 1000; // Default fallback

// --- DOM Element References ---
// Participants Section (Shared)
const participantNameInput = document.getElementById('participantName');
const addParticipantBtn = document.getElementById('addParticipantBtn');
const participantsListDiv = document.getElementById('participantsList');

// Travel Expenses Section
const travelExpenseForm = document.getElementById('travelExpenseForm');
const travelExpenseDateInput = document.getElementById('travelExpenseDate');
const travelExpensePayerSelect = document.getElementById('travelExpensePayer');
const travelInvolvedParticipantsCheckboxesDiv = document.getElementById('travelInvolvedParticipantsCheckboxes');
const travelExpensesTableBody = document.getElementById('travelExpensesTableBody');
const noTravelExpensesMessage = document.getElementById('noTravelExpensesMessage');
const totalTravelExpensesSpan = document.getElementById('totalTravelExpenses');
const averageTravelExpenseSpan = document.getElementById('averageTravelExpense');
const travelBalanceList = document.getElementById('travelBalanceList');
const noTravelBalancesMessage = document.getElementById('noTravelBalancesMessage');
const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');

// General Expenses Section
const generalExpenseForm = document.getElementById('generalExpenseForm');
const generalExpensePayerSelect = document.getElementById('generalExpensePayer');
const generalInvolvedParticipantsCheckboxesDiv = document.getElementById('generalInvolvedParticipantsCheckboxes');
const generalExpensesTableBody = document.getElementById('generalExpensesTableBody');
const noGeneralExpensesMessage = document.getElementById('noGeneralExpensesMessage');
const totalGeneralExpensesSpan = document.getElementById('totalGeneralExpenses');
const averageGeneralExpenseSpan = document.getElementById('averageGeneralExpense');
const generalBalanceList = document.getElementById('generalBalanceList');
const noGeneralBalancesMessage = document.getElementById('noGeneralBalancesMessage');

// Modal Elements
const myModal = document.getElementById('myModal');
const modalMessage = document.getElementById('modalMessage');
const closeButton = document.querySelector('.close-button');
const modalOkButton = document.getElementById('modalOkButton');

// Tab Elements
const travelExpensesTabBtn = document.getElementById('travel-expenses-tab');
const generalExpensesTabBtn = document.getElementById('general-expenses-tab');
const travelExpensesContent = document.getElementById('travel-expenses');
const generalExpensesContent = document.getElementById('general-expenses');

// --- Modal Functions ---
function showModal(message) {
    modalMessage.textContent = message;
    myModal.style.display = 'flex'; // Use flex to center
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

// --- Tab Functionality ---
function activateTab(activeTabBtn, activeContent, inactiveTabBtn, inactiveContent) {
    // Deactivate current tab
    inactiveTabBtn.classList.remove('text-blue-600', 'border-blue-600');
    inactiveTabBtn.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
    inactiveContent.classList.add('hidden');

    // Activate new tab
    activeTabBtn.classList.add('text-blue-600', 'border-blue-600');
    activeTabBtn.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
    activeContent.classList.remove('hidden');

    // Update summaries when switching tabs
    updateTravelSummary();
    updateGeneralSummary();
}

travelExpensesTabBtn.addEventListener('click', () => {
    activateTab(travelExpensesTabBtn, travelExpensesContent, generalExpensesTabBtn, generalExpensesContent);
});

generalExpensesTabBtn.addEventListener('click', () => {
    activateTab(generalExpensesTabBtn, generalExpensesContent, travelExpensesTabBtn, travelExpensesContent);
});

// --- Participant Management (Shared) ---
addParticipantBtn.addEventListener('click', () => {
    const name = participantNameInput.value.trim();
    if (name && !participants.includes(name)) {
        participants.push(name);
        participantNameInput.value = '';
        renderParticipants();
        updatePayerSelects();
        updateInvolvedParticipantsCheckboxes();
        updateTravelSummary(); // Update summaries when a participant is added
        updateGeneralSummary();
    } else if (name && participants.includes(name)) {
        showModal('El participante "' + name + '" ya existe.');
    } else {
        showModal('Por favor, ingresa un nombre para el participante.');
    }
});

function renderParticipants() {
    participantsListDiv.innerHTML = '';
    if (participants.length === 0) {
        participantsListDiv.innerHTML = '<p class="text-gray-500">Aún no hay participantes. Añade algunos para empezar.</p>';
    } else {
        participants.forEach(participant => {
            const span = document.createElement('span');
            span.className = 'bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2';
            span.textContent = participant;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'x';
            removeBtn.className = 'text-blue-600 hover:text-blue-900 font-bold ml-1';
            removeBtn.onclick = () => removeParticipant(participant);

            span.appendChild(removeBtn);
            participantsListDiv.appendChild(span);
        });
    }
}

function removeParticipant(nameToRemove) {
    // Check if the participant has associated expenses in either list
    const hasTravelExpenses = travelExpenses.some(expense =>
        expense.payer === nameToRemove || expense.involvedParticipants.includes(nameToRemove)
    );
    const hasGeneralExpenses = generalExpenses.some(expense =>
        expense.payer === nameToRemove || expense.involvedParticipants.includes(nameToRemove)
    );

    if (hasTravelExpenses || hasGeneralExpenses) {
        showModal(`No se puede eliminar a "${nameToRemove}" porque tiene gastos asociados. Primero elimina sus gastos o quítalo de ellos.`);
        return;
    }

    participants = participants.filter(p => p !== nameToRemove);
    renderParticipants();
    updatePayerSelects();
    updateInvolvedParticipantsCheckboxes();
    updateTravelSummary();
    updateGeneralSummary();
}

function updatePayerSelects() {
    const selects = [travelExpensePayerSelect, generalExpensePayerSelect];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecciona un participante</option>';
        participants.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant;
            option.textContent = participant;
            select.appendChild(option);
        });
    });
}

function updateInvolvedParticipantsCheckboxes() {
    const checkboxDivs = [travelInvolvedParticipantsCheckboxesDiv, generalInvolvedParticipantsCheckboxesDiv];

    checkboxDivs.forEach(div => {
        div.innerHTML = '';
        if (participants.length === 0) {
            div.innerHTML = '<p class="text-gray-500">Añade participantes para poder seleccionarlos aquí.</p>';
        } else {
            participants.forEach(participant => {
                const label = document.createElement('label');
                label.className = 'inline-flex items-center';
                label.innerHTML = `
                    <input type="checkbox" name="involvedParticipant" value="${participant}"
                           class="form-checkbox h-5 w-5 text-blue-600 rounded">
                    <span class="ml-2 text-gray-700">${participant}</span>
                `;
                div.appendChild(label);
            });
        }
    });
}

// --- Travel Expense Management ---
travelExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (participants.length === 0) {
        showModal('Por favor, añade al menos un participante antes de añadir gastos.');
        return;
    }

    const date = travelExpenseDateInput.value;
    const item = document.getElementById('travelExpenseItem').value;
    const price = parseFloat(document.getElementById('travelExpensePrice').value);
    const currency = document.querySelector('input[name="travelCurrency"]:checked').value;
    const payer = travelExpensePayerSelect.value;

    const selectedInvolvedCheckboxes = travelInvolvedParticipantsCheckboxesDiv.querySelectorAll('input[name="involvedParticipant"]:checked');
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
        id: Date.now(), // Unique ID
        type: 'travel',
        date,
        item,
        price,
        currency,
        payer,
        involvedParticipants
    };

    travelExpenses.push(newExpense);
    travelExpenseForm.reset();
    updateInvolvedParticipantsCheckboxes(); // Re-render checkboxes to clear selections
    renderTravelExpenses();
    updateTravelSummary();
});

function renderTravelExpenses() {
    travelExpensesTableBody.innerHTML = '';
    if (travelExpenses.length === 0) {
        noTravelExpensesMessage.classList.remove('hidden');
    } else {
        noTravelExpensesMessage.classList.add('hidden');
        travelExpenses.forEach(expense => {
            const row = travelExpensesTableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.item}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.price.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.currency}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.payer}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${expense.involvedParticipants.join(', ')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="deleteTravelExpense(${expense.id})"
                            class="text-red-600 hover:text-red-900 transition duration-300 ease-in-out">
                        Eliminar
                    </button>
                </td>
            `;
        });
    }
}

function deleteTravelExpense(id) {
    travelExpenses = travelExpenses.filter(expense => expense.id !== id);
    renderTravelExpenses();
    updateTravelSummary();
}

// --- General Expense Management ---
generalExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (participants.length === 0) {
        showModal('Por favor, añade al menos un participante antes de añadir gastos.');
        return;
    }

    const item = document.getElementById('generalExpenseItem').value;
    const price = parseFloat(document.getElementById('generalExpensePrice').value);
    const payer = generalExpensePayerSelect.value;

    const selectedInvolvedCheckboxes = generalInvolvedParticipantsCheckboxesDiv.querySelectorAll('input[name="involvedParticipant"]:checked');
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
        id: Date.now(), // Unique ID
        type: 'general',
        item,
        price, // Price is always in ARS for general expenses
        currency: 'ARS',
        payer,
        involvedParticipants
    };

    generalExpenses.push(newExpense);
    generalExpenseForm.reset();
    updateInvolvedParticipantsCheckboxes(); // Re-render checkboxes to clear selections
    renderGeneralExpenses();
    updateGeneralSummary();
});

function renderGeneralExpenses() {
    generalExpensesTableBody.innerHTML = '';
    if (generalExpenses.length === 0) {
        noGeneralExpensesMessage.classList.remove('hidden');
    } else {
        noGeneralExpensesMessage.classList.add('hidden');
        generalExpenses.forEach(expense => {
            const row = generalExpensesTableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.item}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.price.toFixed(2)} ARS</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.payer}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${expense.involvedParticipants.join(', ')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="deleteGeneralExpense(${expense.id})"
                            class="text-red-600 hover:text-red-900 transition duration-300 ease-in-out">
                        Eliminar
                    </button>
                </td>
            `;
        });
    }
}

function deleteGeneralExpense(id) {
    generalExpenses = generalExpenses.filter(expense => expense.id !== id);
    renderGeneralExpenses();
    updateGeneralSummary();
}

// --- Summary Calculation Functions ---

// Function to update the summary of Travel Expenses
function updateTravelSummary() {
    let totalExpensesARS = 0;
    const participantBalances = {};

    participants.forEach(p => {
        participantBalances[p] = 0;
    });

    travelExpenses.forEach(expense => {
        let priceInARS = expense.price;
        if (expense.currency === 'USD') {
            priceInARS *= currentUsdToArsRate;
        }
        totalExpensesARS += priceInARS;

        const costPerInvolvedPerson = expense.involvedParticipants.length > 0 ? priceInARS / expense.involvedParticipants.length : 0;

        expense.involvedParticipants.forEach(involvedP => {
            participantBalances[involvedP] -= costPerInvolvedPerson;
        });

        participantBalances[expense.payer] += priceInARS;
    });

    totalTravelExpensesSpan.textContent = `ARS ${totalExpensesARS.toFixed(2)}`;

    const numParticipants = participants.length;
    const averageExpensePerPersonOverall = numParticipants > 0 ? totalExpensesARS / numParticipants : 0;
    averageTravelExpenseSpan.textContent = `ARS ${averageExpensePerPersonOverall.toFixed(2)}`;

    generateBalanceSettlement(participantBalances, travelBalanceList, noTravelBalancesMessage);
}

// Function to update the summary of General Expenses
function updateGeneralSummary() {
    let totalExpensesARS = 0;
    const participantBalances = {};

    participants.forEach(p => {
        participantBalances[p] = 0;
    });

    generalExpenses.forEach(expense => {
        // General expenses are always in ARS
        const priceInARS = expense.price;
        totalExpensesARS += priceInARS;

        const costPerInvolvedPerson = expense.involvedParticipants.length > 0 ? priceInARS / expense.involvedParticipants.length : 0;

        expense.involvedParticipants.forEach(involvedP => {
            participantBalances[involvedP] -= costPerInvolvedPerson;
        });

        participantBalances[expense.payer] += priceInARS;
    });

    totalGeneralExpensesSpan.textContent = `ARS ${totalExpensesARS.toFixed(2)}`;

    const numParticipants = participants.length;
    const averageExpensePerPersonOverall = numParticipants > 0 ? totalExpensesARS / numParticipants : 0;
    averageGeneralExpenseSpan.textContent = `ARS ${averageExpensePerPersonOverall.toFixed(2)}`;

    generateBalanceSettlement(participantBalances, generalBalanceList, noGeneralBalancesMessage);
}

// Reusable function to generate balance settlement
function generateBalanceSettlement(participantBalances, balanceListElement, noBalancesMessageElement) {
    const numParticipants = participants.length;
    const hasExpenses = Object.values(participantBalances).some(balance => Math.abs(balance) > 0.01);

    if (numParticipants === 0 || !hasExpenses) {
        balanceListElement.innerHTML = ''; // Clear previous balances
        noBalancesMessageElement.classList.remove('hidden');
        noBalancesMessageElement.textContent = numParticipants === 0 ? 'Añade participantes y gastos para ver los saldos.' : 'Añade gastos para ver los saldos.';
        balanceListElement.appendChild(noBalancesMessageElement);
        return;
    } else {
        noBalancesMessageElement.classList.add('hidden');
    }

    const balancesToSettle = [];
    for (const payer in participantBalances) {
        if (Math.abs(participantBalances[payer]) > 0.01) {
            balancesToSettle.push({ name: payer, balance: participantBalances[payer] });
        }
    }

    balancesToSettle.sort((a, b) => a.balance - b.balance);

    let i = 0;
    let j = balancesToSettle.length - 1;
    balanceListElement.innerHTML = '';

    if (balancesToSettle.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = '¡Todos los gastos están equilibrados! 🎉';
        balanceListElement.appendChild(listItem);
        return;
    }

    let transactionsGenerated = false;
    while (i < j) {
        const debtor = balancesToSettle[i];
        const creditor = balancesToSettle[j];

        if (debtor.balance >= -0.01 && creditor.balance <= 0.01) {
            break;
        }

        const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);

        if (amountToSettle > 0.01) {
            const listItem = document.createElement('li');
            listItem.textContent = `${debtor.name} debe ARS ${amountToSettle.toFixed(2)} a ${creditor.name}.`;
            balanceListElement.appendChild(listItem);
            transactionsGenerated = true;
        }

        debtor.balance += amountToSettle;
        creditor.balance -= amountToSettle;

        if (debtor.balance >= -0.01) {
            i++;
        }
        if (creditor.balance <= 0.01) {
            j--;
        }
    }

    if (!transactionsGenerated && balancesToSettle.some(b => Math.abs(b.balance) > 0.01)) {
        // This case handles very small, residual balances that didn't trigger a transaction
        // or cases where the balance is already effectively zero.
        const listItem = document.createElement('li');
        listItem.textContent = '¡Todos los gastos están equilibrados! 🎉';
        balanceListElement.appendChild(listItem);
    } else if (!transactionsGenerated && balancesToSettle.every(b => Math.abs(b.balance) <= 0.01)) {
        // Explicitly show balanced if all are within tolerance and no transactions were needed
         const listItem = document.createElement('li');
         listItem.textContent = '¡Todos los gastos están equilibrados! 🎉';
         balanceListElement.appendChild(listItem);
    }
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
            updateTravelSummary(); // Recalcular el resumen de viaje con el nuevo tipo de cambio
        } else {
            throw new Error(data.error || 'Tipo de cambio ARS no encontrado en la respuesta de la API.');
        }
    } catch (error) {
        console.error("Error al obtener el tipo de cambio:", error);
        exchangeRateDisplay.textContent = `Error al cargar (usando ${defaultUsdToArsRate.toFixed(2)})`;
        currentUsdToArsRate = defaultUsdToArsRate; // Usar el valor por defecto en caso de error
        showModal('No se pudo obtener el tipo de cambio actual. Se utilizará un valor por defecto de 1 USD = ARS ' + defaultUsdToArsRate.toFixed(2) + '. Asegúrate de haber pegado tu clave API de Open Exchange Rates.');
        updateTravelSummary();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Set current date as default for the travel date field
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    travelExpenseDateInput.value = `${yyyy}-${mm}-${dd}`;

    // Initialize participants and expenses
    renderParticipants();
    updatePayerSelects();
    updateInvolvedParticipantsCheckboxes();
    renderTravelExpenses();
    renderGeneralExpenses();

    // Set initial tab state
    activateTab(travelExpensesTabBtn, travelExpensesContent, generalExpensesTabBtn, generalExpensesContent);

    // Fetch exchange rate and update summaries
    fetchExchangeRate();
    updateTravelSummary();
    updateGeneralSummary();
});
