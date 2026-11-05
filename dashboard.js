//teste
// State Management
let items = [];
let currentCategoryFilter = 'all';
let currentYearFilter = 'all';
let currentTimelineView = 'monthly'; // Pode ser 'monthly', 'yearly', 'total'
let currentDueDayFilter = 'all';
let currentDueMonthFilter = 'all';
let currentDueCategoryFilter = 'all';
let isDueLegendExpanded = false;

// Firebase Configuration & State (Must match app.js)
  const firebaseConfig = {
    apiKey: "AIzaSyBZGbkwQ9hPyMM9O8WY-YEccHsH3rNhaOc",
    authDomain: "itensdecasa-e3449.firebaseapp.com",
    projectId: "itensdecasa-e3449",
    storageBucket: "itensdecasa-e3449.firebasestorage.app",
    messagingSenderId: "514651769883",
    appId: "1:514651769883:web:7a101c7035bcb6df287cbe"
  };

const isFirebaseConfigured = firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && firebaseConfig.apiKey !== "";

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Set current year in footer
    const currentYearElem = document.getElementById('current-year');
    if (currentYearElem) currentYearElem.textContent = new Date().getFullYear();

    // Theme toggle button click
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Firebase Auth Guard for Dashboard
    if (isFirebaseConfigured) {
        firebase.initializeApp(firebaseConfig);
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                // If not authenticated, redirect to index.html to login
                console.log("Usuário não autenticado no dashboard. Redirecionando para a página de login.");
                window.location.href = "index.html";
            } else {
                applyUserTheme(user.email);
                // Busca TODOS os itens da collection (de todos os usuários) no Firestore
                firebase.firestore().collection("items").get()
                    .then(snapshot => {
                        const cloudItems = [];
                        snapshot.forEach(doc => cloudItems.push(doc.data()));
                        localStorage.setItem('household_items', JSON.stringify(cloudItems));
                        loadItems();
                    })
                    .catch(err => {
                        console.error("Erro ao buscar itens no Firestore: ", err);
                        // Fallback: usa o cache do LocalStorage
                        loadItems();
                    });
            }
        });
    } else {
        // Fallback Local Mode
        loadItems();
    }
});

// Apply per-user color theme on <html> element
// Must match the same list defined in app.js
const PINK_THEME_EMAILS = ['bruna.murbach@hotmail.com'];

function applyUserTheme(email) {
    const html = document.documentElement;
    if (email && PINK_THEME_EMAILS.includes(email.toLowerCase())) {
        html.classList.add('theme-pink');
    } else {
        html.classList.remove('theme-pink');
    }
}

// Load items from LocalStorage
function loadItems() {
    const storedItems = localStorage.getItem('household_items');
    if (storedItems) {
        try {
            items = JSON.parse(storedItems);
        } catch (e) {
            console.error("Erro ao carregar dados do LocalStorage", e);
            items = [];
        }
    }
    
    setupFilters();
    renderDashboard();
}

// Setup and Populate Dashboard Filters
function setupFilters() {
    const categorySelect = document.getElementById('dash-filter-category');
    const yearSelect = document.getElementById('dash-filter-year');
    const btnReset = document.getElementById('dash-btn-reset-filters');
    const viewSelectorContainer = document.getElementById('timeline-view-selector');

    if (!categorySelect || !yearSelect) return;

    // Populate Unique Years in Select
    const yearsSet = new Set();
    items.forEach(item => {
        if (item.purchaseDate) {
            const yr = item.purchaseDate.split('-')[0];
            if (yr && !isNaN(yr)) yearsSet.add(yr);
        } else if (item.createdAt) {
            const yr = new Date(item.createdAt).getFullYear();
            if (yr && !isNaN(yr)) yearsSet.add(yr.toString());
        }
    });

    // Clear previous dynamic options
    yearSelect.innerHTML = '<option value="all">Todos os Anos</option>';

    // Sort years descending and add
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    sortedYears.forEach(yr => {
        const option = document.createElement('option');
        option.value = yr;
        option.textContent = yr;
        yearSelect.appendChild(option);
    });

    // Set initial values
    categorySelect.value = currentCategoryFilter;
    yearSelect.value = currentYearFilter;

    // Add change listeners
    categorySelect.addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        renderDashboard();
    });

    yearSelect.addEventListener('change', (e) => {
        currentYearFilter = e.target.value;
        renderDashboard();
    });

    // Setup Timeline View Selector (Mensal, Anual, Total)
    if (viewSelectorContainer) {
        viewSelectorContainer.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('button');
            if (!targetBtn) return;

            // Atualiza estilo visual dos botões do seletor
            viewSelectorContainer.querySelectorAll('button').forEach(btn => {
                btn.className = "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all";
            });
            targetBtn.className = "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-cyan-600 text-white shadow-sm";

            currentTimelineView = targetBtn.dataset.view;
            renderDashboard();
        });
    }

    // Reset filters
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            currentCategoryFilter = 'all';
            currentYearFilter = 'all';
            currentTimelineView = 'monthly';
            currentDueDayFilter = 'all';
            currentDueMonthFilter = 'all';
            currentDueCategoryFilter = 'all';
            categorySelect.value = 'all';
            yearSelect.value = 'all';
            
            const dueDaySelect = document.getElementById('due-filter-day');
            if (dueDaySelect) dueDaySelect.value = 'all';
            updateDueDateFilterOptions();

            // Restaura o seletor visual de linha do tempo para 'Mensal'
            if (viewSelectorContainer) {
                viewSelectorContainer.querySelectorAll('button').forEach(btn => {
                    const isMonthly = btn.dataset.view === 'monthly';
                    btn.className = isMonthly
                        ? "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-cyan-600 text-white shadow-sm"
                        : "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all";
                });
            }

            renderDashboard();
        });
    }

    // Configura e popula filtros específicos do Painel de Vencimento
    setupDueDatePanelFilters();
}

// Configura os listeners dos filtros do Painel de Gastos por Dia de Vencimento
function setupDueDatePanelFilters() {
    const dueDaySelect = document.getElementById('due-filter-day');
    const dueMonthSelect = document.getElementById('due-filter-month');
    const dueCategorySelect = document.getElementById('due-filter-category');
    const dueBtnReset = document.getElementById('due-btn-reset-filters');

    const allEvents = extractAllInstallmentEvents(items);

    // Popula opções de Dias de Vencimento disponíveis
    if (dueDaySelect) {
        const daysSet = new Set();
        allEvents.forEach(evt => daysSet.add(evt.dueDay));
        const sortedDays = Array.from(daysSet).sort((a, b) => a - b);

        dueDaySelect.innerHTML = '<option value="all">Todos os Dias</option>';
        sortedDays.forEach(day => {
            const opt = document.createElement('option');
            opt.value = day.toString();
            opt.textContent = `Dia ${String(day).padStart(2, '0')}`;
            dueDaySelect.appendChild(opt);
        });

        dueDaySelect.value = currentDueDayFilter;

        dueDaySelect.onchange = (e) => {
            currentDueDayFilter = e.target.value;
            // Filtra dinamicamente as opções de Mês e Categoria apenas para o dia selecionado
            updateDueDateFilterOptions();
            renderDueDatePanel();
        };
    }

    // Configura listeners de alteração de mês e categoria
    if (dueMonthSelect) {
        dueMonthSelect.onchange = (e) => {
            currentDueMonthFilter = e.target.value;
            renderDueDatePanel();
        };
    }

    if (dueCategorySelect) {
        dueCategorySelect.onchange = (e) => {
            currentDueCategoryFilter = e.target.value;
            renderDueDatePanel();
        };
    }

    if (dueBtnReset) {
        dueBtnReset.onclick = () => {
            currentDueDayFilter = 'all';
            currentDueMonthFilter = 'all';
            currentDueCategoryFilter = 'all';
            if (dueDaySelect) dueDaySelect.value = 'all';
            updateDueDateFilterOptions();
            renderDueDatePanel();
        };
    }

    // Popula inicialmente as opções de Mês e Categoria
    updateDueDateFilterOptions();
}

// Atualiza dinamicamente as opções dos selects de Mês e Categoria de acordo com o Dia de Vencimento selecionado
function updateDueDateFilterOptions() {
    const dueMonthSelect = document.getElementById('due-filter-month');
    const dueCategorySelect = document.getElementById('due-filter-category');

    const allEvents = extractAllInstallmentEvents(items);

    // Filtra os eventos pelo Dia de Vencimento selecionado
    const dayFilteredEvents = currentDueDayFilter === 'all'
        ? allEvents
        : allEvents.filter(evt => evt.dueDay.toString() === currentDueDayFilter.toString());

    // 1. Popula opções de Mês disponíveis para o dia selecionado
    if (dueMonthSelect) {
        const monthsMap = new Map();
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        dayFilteredEvents.forEach(evt => {
            if (!monthsMap.has(evt.monthKey)) {
                monthsMap.set(evt.monthKey, {
                    year: evt.year,
                    month: evt.month,
                    label: `${monthNames[evt.month]}/${evt.year}`
                });
            }
        });

        const sortedMonthKeys = Array.from(monthsMap.keys()).sort();

        dueMonthSelect.innerHTML = '<option value="all">Todos os Meses</option>';

        const today = new Date();
        const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap.has(currentMonthKey)) {
            const curOpt = document.createElement('option');
            curOpt.value = 'current';
            curOpt.textContent = `Mês Atual (${monthNames[today.getMonth()]}/${today.getFullYear()})`;
            dueMonthSelect.appendChild(curOpt);
        }

        sortedMonthKeys.forEach(mKey => {
            const mInfo = monthsMap.get(mKey);
            const opt = document.createElement('option');
            opt.value = mKey;
            opt.textContent = mInfo.label;
            dueMonthSelect.appendChild(opt);
        });

        // Se o mês anteriormente selecionado não existe nas novas opções do dia, reseta para 'all'
        const isCurrentValid = currentDueMonthFilter === 'current' && monthsMap.has(currentMonthKey);
        const isSpecificValid = monthsMap.has(currentDueMonthFilter);

        if (currentDueMonthFilter !== 'all' && !isCurrentValid && !isSpecificValid) {
            currentDueMonthFilter = 'all';
        }

        dueMonthSelect.value = currentDueMonthFilter;
    }

    // 2. Popula opções de Categoria disponíveis para o dia selecionado
    if (dueCategorySelect) {
        const categoriesSet = new Set();
        dayFilteredEvents.forEach(evt => {
            if (evt.category) categoriesSet.add(evt.category);
        });

        const sortedCategories = Array.from(categoriesSet).sort();

        dueCategorySelect.innerHTML = '<option value="all">Todas as Categorias</option>';
        sortedCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            dueCategorySelect.appendChild(opt);
        });

        // Se a categoria anteriormente selecionada não existe nas novas opções do dia, reseta para 'all'
        if (currentDueCategoryFilter !== 'all' && !categoriesSet.has(currentDueCategoryFilter)) {
            currentDueCategoryFilter = 'all';
        }

        dueCategorySelect.value = currentDueCategoryFilter;
    }
}

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Toggle Theme (atualiza também as cores do gráfico se necessário)
function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    // Força recarregamento do Dashboard para redesenhar gráficos com fontes legíveis
    renderDashboard();
}

// Função de cálculo de progresso de parcelas idêntica à do app.js
function calculateInstallmentProgress(purchaseDateStr, dueDay, closingDay, installmentsTotal, totalPrice, isBought, isInstallment) {
    if (!isBought) {
        return {
            paidInstallments: 0,
            paidValue: 0,
            remainingValue: totalPrice,
            active: false
        };
    }
    
    if (!isInstallment || installmentsTotal <= 0) {
        return {
            paidInstallments: 1, // Pagamento único (100% pago)
            paidValue: totalPrice,
            remainingValue: 0,
            active: false
        };
    }

    const today = new Date();
    
    // Parse local de "YYYY-MM-DD"
    let purchaseDate = null;
    if (purchaseDateStr) {
        const parts = purchaseDateStr.split('-');
        if (parts.length === 3) {
            purchaseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    }

    if (!purchaseDate || isNaN(purchaseDate.getTime())) {
        const roundedInstallment = Math.round((totalPrice / installmentsTotal) * 100) / 100;
        return {
            paidInstallments: 1,
            paidValue: roundedInstallment,
            remainingValue: Math.round((totalPrice - roundedInstallment) * 100) / 100,
            active: true
        };
    }

    if (purchaseDate > today) {
        return {
            paidInstallments: 0,
            paidValue: 0,
            remainingValue: totalPrice,
            active: true
        };
    }

    // LÓGICA DE FATURA (FECHAMENTO E VENCIMENTO):
    // O modelo correto de cartão de crédito funciona assim:
    //   1. Determinar em qual fatura a compra cai:
    //      - Se purchaseDay < closingDay → entra na fatura do mês corrente (fechamento = mesmo mês)
    //      - Se purchaseDay >= closingDay → já passou o fechamento, entra na fatura do mês seguinte
    //   2. O vencimento da fatura pode ser no mesmo mês ou no seguinte ao fechamento:
    //      - Se dueDay > closingDay → o vencimento é no mesmo mês do fechamento
    //      - Se dueDay <= closingDay → o vencimento é no mês seguinte ao fechamento
    const purchaseDay = purchaseDate.getDate();
    const parsedDueDay = parseInt(dueDay);
    const parsedClosingDay = parseInt(closingDay || dueDay);

    // Mês base da fatura (0 = mês da compra, 1 = mês seguinte)
    const billingMonthOffset = (purchaseDay < parsedClosingDay) ? 0 : 1;

    // Se o vencimento ocorre ANTES ou NO MESMO DIA do fechamento, ele cai no mês seguinte ao fechamento.
    const dueAfterClosingOffset = (parsedDueDay <= parsedClosingDay) ? 1 : 0;

    // Offset total para o vencimento da 1ª parcela a partir do mês da compra
    const startMonthOffset = billingMonthOffset + dueAfterClosingOffset;

    let paidInstallments = 0;

    for (let i = 1; i <= installmentsTotal; i++) {
        // Projeta o vencimento da parcela i
        const dueDate = new Date(
            purchaseDate.getFullYear(),
            purchaseDate.getMonth() + startMonthOffset + (i - 1),
            parsedDueDay
        );
        
        const compareDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (compareDueDate <= compareToday) {
            paidInstallments++;
        } else {
            break;
        }
    }

    if (paidInstallments < 0) paidInstallments = 0;
    if (paidInstallments > installmentsTotal) paidInstallments = installmentsTotal;

    const installmentValue = Math.round((totalPrice / installmentsTotal) * 100) / 100;
    let paidValue = Math.round((installmentValue * paidInstallments) * 100) / 100;
    
    // Tratamento de ajuste para absorver dízimas de arredondamento de floats em faturamento
    if (paidInstallments === installmentsTotal) {
        paidValue = totalPrice;
    } else if (paidInstallments === 0) {
        paidValue = 0;
    }
    
    const remainingValue = Math.round((totalPrice - paidValue) * 100) / 100;
 
    return {
        paidInstallments,
        paidValue: Math.round(paidValue * 100) / 100,
        remainingValue: Math.round(remainingValue * 100) / 100,
        active: paidInstallments < installmentsTotal
    };
}

// Render Dashboard Data and Charts
function renderDashboard() {
    const emptyState = document.getElementById('dash-empty-state');
    const chartsContainer = document.getElementById('dash-charts-container');
    
    // Filter items based on active dashboard selectors
    const filteredItems = items.filter(item => {
        // Category Filter
        const matchesCategory = currentCategoryFilter === 'all' || item.category === currentCategoryFilter;

        // Year Filter
        let matchesYear = true;
        if (currentYearFilter !== 'all') {
            if (item.purchaseDate) {
                matchesYear = item.purchaseDate.startsWith(currentYearFilter);
            } else if (item.createdAt) {
                matchesYear = new Date(item.createdAt).getFullYear().toString() === currentYearFilter;
            } else {
                matchesYear = false;
            }
        }

        return matchesCategory && matchesYear;
    });

    const originalItemsWithPrices = items.filter(item => item.price > 0 || item.bought);
    
    if (items.length === 0 || originalItemsWithPrices.length === 0) {
        // No actual data
        emptyState.classList.remove('hidden');
        chartsContainer.classList.add('hidden');
        emptyState.querySelector('h3').textContent = "Sem dados financeiros para analisar";
        emptyState.querySelector('p').textContent = "Vá até a sua Lista de Compras, adicione itens e marque-os como \"Comprado\" informando os valores correspondentes para ver a análise gráfica de despesas aqui.";
        const actionBtn = emptyState.querySelector('a');
        if (actionBtn) {
            actionBtn.innerHTML = '<i class="fa-solid fa-list-check"></i><span>Ir para Lista de Compras</span>';
            actionBtn.href = "index.html";
            actionBtn.onclick = null;
        }
        
        // Zera KPIs
        document.getElementById('dash-stat-paid').textContent = formatCurrency(0);
        document.getElementById('dash-stat-remaining').textContent = formatCurrency(0);
        document.getElementById('dash-stat-monthly').textContent = formatCurrency(0);
        document.getElementById('dash-stat-total').textContent = formatCurrency(0);
        return;
    }

    if (filteredItems.length === 0) {
        // Data exists but filter has 0 matches
        emptyState.classList.remove('hidden');
        chartsContainer.classList.add('hidden');
        emptyState.querySelector('h3').textContent = "Nenhum resultado para os filtros atuais";
        emptyState.querySelector('p').textContent = "Não encontramos itens cadastrados que correspondam à categoria ou ao ano de compra selecionados.";
        const actionBtn = emptyState.querySelector('a');
        if (actionBtn) {
            actionBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i><span>Limpar Filtros</span>';
            actionBtn.href = "#";
            actionBtn.onclick = (e) => {
                e.preventDefault();
                document.getElementById('dash-btn-reset-filters').click();
            };
        }
        
        // Zera KPIs
        document.getElementById('dash-stat-paid').textContent = formatCurrency(0);
        document.getElementById('dash-stat-remaining').textContent = formatCurrency(0);
        document.getElementById('dash-stat-monthly').textContent = formatCurrency(0);
        document.getElementById('dash-stat-total').textContent = formatCurrency(0);
        return;
    }
    
    emptyState.classList.add('hidden');
    chartsContainer.classList.remove('hidden');

    // 1. Processar KPIs Financeiros Gerais
    let totalBoughtValue = 0; // Itens que já foram de fato comprados
    let totalPaid = 0;        // Desembolso real (à vista + parcelas pagas)
    let totalRemaining = 0;   // Pendente (faturas futuras + itens "A comprar")
    let totalMonthly = 0;     // Fatura do mês atual de parcelados ativos
    let totalBudget = 0;      // Investimento total de todos os itens cadastrados
    
    filteredItems.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const totalPrice = price * qty;

        totalBudget += totalPrice;

        if (!item.bought) {
            // Itens a comprar contam integralmente no restante a pagar
            totalRemaining += totalPrice;
        } else {
            totalBoughtValue += totalPrice;
            
            const progress = calculateInstallmentProgress(
                item.purchaseDate,
                item.installmentDueDay,
                item.installmentClosingDay,
                item.installmentsTotal,
                totalPrice,
                item.bought,
                item.isInstallment
            );

            totalPaid += progress.paidValue;
            totalRemaining += progress.remainingValue;

            // Se for parcelado e a fatura estiver ativa, calcula a mensalidade do mês corrente
            if (item.isInstallment && progress.active) {
                totalMonthly += (totalPrice / item.installmentsTotal);
            }
        }
    });

    // Atualiza KPIs em Tela
    document.getElementById('dash-stat-paid').textContent = formatCurrency(totalPaid);
    document.getElementById('dash-stat-remaining').textContent = formatCurrency(totalRemaining);
    document.getElementById('dash-stat-monthly').textContent = formatCurrency(totalMonthly);
    document.getElementById('dash-stat-total').textContent = formatCurrency(totalBudget);

    // Ajusta visualização da fatura mensal (se não houver parcelados ativos, oculta a cor de ênfase)
    const monthlyCard = document.getElementById('dash-stat-monthly');
    if (totalMonthly > 0) {
        monthlyCard.className = "text-lg sm:text-2xl font-bold text-teal-600 dark:text-teal-400 leading-tight";
    } else {
        monthlyCard.className = "text-lg sm:text-2xl font-bold text-slate-800 dark:text-white leading-tight";
    }

    // 2. Cores e Estilos Adaptativos do Chart.js para Modo Escuro
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#f1f5f9' : '#1e293b'; // slate-100 vs slate-800
    const gridColor = isDark ? '#334155' : '#f1f5f9'; // slate-700 vs slate-100

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    // Destruir gráficos anteriores se existirem (para evitar sobreposição na atualização de tema)
    destroyActiveCharts();

    // 3. Renderizar Gráfico 1: Orçamento (Donut)
    const ctxBudget = document.getElementById('budgetChart').getContext('2d');
    window.budgetChartInstance = new Chart(ctxBudget, {
        type: 'doughnut',
        data: {
            labels: ['Já Pago Real', 'Restante a Pagar'],
            datasets: [{
                data: [totalPaid, totalRemaining],
                backgroundColor: [
                    '#10b981', // Emerald-500
                    '#f43f5e'  // Rose-500
                ],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 11, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            const percentage = ((value / totalBudget) * 100).toFixed(1);
                            return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });

    // 4. Renderizar Gráfico 2: Despesas por Categoria (Horizontal Bar)
    // Agrupa despesa total por categoria
    const categoryTotals = {};
    filteredItems.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const totalPrice = price * qty;
        
        // Consideramos as categorias tanto compradas quanto estimadas
        const label = item.category || 'Outros';
        categoryTotals[label] = (categoryTotals[label] || 0) + totalPrice;
    });

    // Ordenar categorias por valor decrescente
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .filter(entry => entry[1] > 0); // Só mostra categorias com gastos

    const catLabels = sortedCategories.map(entry => entry[0]);
    const catValues = sortedCategories.map(entry => entry[1]);

    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    window.categoryChartInstance = new Chart(ctxCategory, {
        type: 'bar',
        data: {
            labels: catLabels,
            datasets: [{
                label: 'Total Alocado (R$)',
                data: catValues,
                backgroundColor: '#4f46e5', // Indigo-600
                borderRadius: 8,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y', // Define o gráfico como barra horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            return ` Total Alocado: ${formatCurrency(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: {
                        callback: value => formatCurrency(value),
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: 'bold' } }
                }
            }
        }
    });

    // 5. Renderizar Gráfico 3: Cronograma de Fluxo de Caixa Mensal (Stacked Column)
    // Coleta todos os eventos de desembolso para mapear dinamicamente quais meses de fato possuem lançamentos
    const disbursementEvents = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    filteredItems.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const totalPrice = price * qty;

        if (!item.bought) {
            // Itens a comprar entram como estimativa para o mês atual ("A Pagar")
            disbursementEvents.push({
                year: currentYear,
                month: currentMonth,
                value: totalPrice,
                type: 'toPay'
            });
            return;
        }

        // Se o item foi comprado e NÃO é parcelado:
        if (!item.isInstallment || item.installmentsTotal <= 0) {
            let pDate = null;
            if (item.purchaseDate) {
                const parts = item.purchaseDate.split('-');
                if (parts.length === 3) {
                    pDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
            }
            if (!pDate || isNaN(pDate.getTime())) {
                pDate = today;
            }

            disbursementEvents.push({
                year: pDate.getFullYear(),
                month: pDate.getMonth(),
                value: totalPrice,
                type: 'paid'
            });
            return;
        }

        // Se for comprado E parcelado, projetamos cada uma de suas parcelas:
        let pDate = null;
        if (item.purchaseDate) {
            const parts = item.purchaseDate.split('-');
            if (parts.length === 3) {
                pDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
        }
        if (!pDate || isNaN(pDate.getTime())) {
            // Sem data de compra, joga as parcelas como "A Pagar" no mês atual
            disbursementEvents.push({
                year: currentYear,
                month: currentMonth,
                value: totalPrice,
                type: 'toPay'
            });
            return;
        }

        const closingDay = parseInt(item.installmentClosingDay || 28);
        const dueDay = parseInt(item.installmentDueDay || 10);

        // Mesma lógica de offset usada em calculateInstallmentProgress:
        // 1. Em qual fatura a compra cai (antes ou após o fechamento)
        // 2. Se o vencimento é anterior ou igual ao fechamento, cai no mês seguinte ao fechamento
        const purchaseDay = pDate.getDate();
        const billingMonthOffset = (purchaseDay < closingDay) ? 0 : 1;
        const dueAfterClosingOffset = (dueDay <= closingDay) ? 1 : 0;
        const startMonthOffset = billingMonthOffset + dueAfterClosingOffset;

        const installmentValue = Math.round((totalPrice / item.installmentsTotal) * 100) / 100;

        for (let i = 1; i <= item.installmentsTotal; i++) {
            // Data exata de vencimento projetada para a parcela i
            const dueDate = new Date(
                pDate.getFullYear(),
                pDate.getMonth() + startMonthOffset + (i - 1),
                dueDay
            );

            const compareDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const type = (compareDueDate <= compareToday) ? 'paid' : 'toPay';

            disbursementEvents.push({
                year: dueDate.getFullYear(),
                month: dueDate.getMonth(),
                value: installmentValue,
                type: type
            });
        }
    });

    // Se por acaso a lista de eventos estiver vazia, adiciona o mês corrente zerado
    if (disbursementEvents.length === 0) {
        disbursementEvents.push({
            year: currentYear,
            month: currentMonth,
            value: 0,
            type: 'paid'
        });
    }

    let timelineLabels = [];
    let timelinePaid = [];
    let timelineToPay = [];

    if (currentTimelineView === 'monthly') {
        // --- VISUALIZAÇÃO MENSAL ---
        // Encontra dinamicamente o menor e o maior ano/mês dos lançamentos para traçar o horizonte ideal
        let minYear = currentYear;
        let minMonth = currentMonth;
        let maxYear = currentYear;
        let maxMonth = currentMonth;

        disbursementEvents.forEach(evt => {
            if (evt.year < minYear || (evt.year === minYear && evt.month < minMonth)) {
                minYear = evt.year;
                minMonth = evt.month;
            }
            if (evt.year > maxYear || (evt.year === maxYear && evt.month > maxMonth)) {
                maxYear = evt.year;
                maxMonth = evt.month;
            }
        });

        // Gera o intervalo contínuo de meses entre o menor e o maior mês encontrados
        const monthsTimeline = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        let tempYear = minYear;
        let tempMonth = minMonth;

        while (tempYear < maxYear || (tempYear === maxYear && tempMonth <= maxMonth)) {
            monthsTimeline.push({
                year: tempYear,
                month: tempMonth,
                label: `${monthNames[tempMonth]}/${String(tempYear).substring(2)}`,
                paid: 0,
                toPay: 0
            });

            tempMonth++;
            if (tempMonth > 11) {
                tempMonth = 0;
                tempYear++;
            }
        }

        // Distribui os valores dos eventos projetados nos meses correspondentes da nossa linha do tempo
        disbursementEvents.forEach(evt => {
            const monthObj = monthsTimeline.find(m => m.year === evt.year && m.month === evt.month);
            if (monthObj) {
                if (evt.type === 'paid') {
                    monthObj.paid += evt.value;
                } else {
                    monthObj.toPay += evt.value;
                }
            }
        });

        // Garante que todos os valores somados sejam arredondados estritamente para 2 casas decimais
        monthsTimeline.forEach(m => {
            m.paid = Math.round(m.paid * 100) / 100;
            m.toPay = Math.round(m.toPay * 100) / 100;
        });

        timelineLabels = monthsTimeline.map(m => m.label);
        timelinePaid = monthsTimeline.map(m => m.paid);
        timelineToPay = monthsTimeline.map(m => m.toPay);

    } else if (currentTimelineView === 'yearly') {
        // --- VISUALIZAÇÃO ANUAL ---
        // Coleta todos os anos únicos dos eventos
        const yearsSet = new Set();
        disbursementEvents.forEach(evt => yearsSet.add(evt.year));
        if (yearsSet.size === 0) yearsSet.add(currentYear);

        // Cria estrutura de anos cronológica ordenada
        const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
        const yearsTimeline = sortedYears.map(yr => ({
            year: yr,
            label: `${yr}`,
            paid: 0,
            toPay: 0
        }));

        // Agrupa os eventos por ano correspondente
        disbursementEvents.forEach(evt => {
            const yearObj = yearsTimeline.find(y => y.year === evt.year);
            if (yearObj) {
                if (evt.type === 'paid') {
                    yearObj.paid += evt.value;
                } else {
                    yearObj.toPay += evt.value;
                }
            }
        });

        yearsTimeline.forEach(y => {
            y.paid = Math.round(y.paid * 100) / 100;
            y.toPay = Math.round(y.toPay * 100) / 100;
        });

        timelineLabels = yearsTimeline.map(y => y.label);
        timelinePaid = yearsTimeline.map(y => y.paid);
        timelineToPay = yearsTimeline.map(y => y.toPay);

    } else if (currentTimelineView === 'total') {
        // --- VISUALIZAÇÃO TOTAL ---
        let totalPaidSum = 0;
        let totalToPaySum = 0;

        disbursementEvents.forEach(evt => {
            if (evt.type === 'paid') {
                totalPaidSum += evt.value;
            } else {
                totalToPaySum += evt.value;
            }
        });

        timelineLabels = ['Investimento Acumulado'];
        timelinePaid = [Math.round(totalPaidSum * 100) / 100];
        timelineToPay = [Math.round(totalToPaySum * 100) / 100];
    }

    // Ajusta dinamicamente a largura do contêiner do gráfico de acordo com a resolução (apenas para celulares/dispositivos móveis)
    const chartWrapper = document.getElementById('timeline-chart-wrapper');
    const isMobile = window.innerWidth < 768; // Breakpoint 'md' do Tailwind CSS
    const activeBarThickness = isMobile ? 24 : undefined; // No desktop (undefined), o Chart.js calcula a espessura ideal
    const DESKTOP_OVERFLOW_THRESHOLD = 15; // meses a partir dos quais o desktop também rola horizontalmente

    if (chartWrapper) {
        const parentWidth = chartWrapper.parentElement.clientWidth || 350;

        let requiredWidth = parentWidth;
        if (currentTimelineView === 'monthly') {
            const isDesktopOverflow = !isMobile && timelineLabels.length > DESKTOP_OVERFLOW_THRESHOLD;
            if (isMobile || isDesktopOverflow) {
                // Mobile: 65px/barra; Desktop com overflow: 72px/barra para melhor legibilidade
                const minSpacePerBar = isMobile ? 65 : 72;
                requiredWidth = timelineLabels.length * minSpacePerBar;
            }
        }

        if (requiredWidth > parentWidth) {
            chartWrapper.style.width = `${requiredWidth}px`;
        } else {
            chartWrapper.style.width = '100%';
        }
    }

    // Plugin inline: desenha o total acima de cada coluna empilhada (resolve invisibilidade em meses de baixo valor)
    const stackedTotalLabelsPlugin = {
        id: 'stackedTotalLabels',
        afterDatasetsDraw(chart) {
            const { ctx, data, scales: { x, y } } = chart;
            const totals = data.labels.map((_, i) =>
                chart.data.datasets.reduce((sum, ds) => sum + (ds.data[i] || 0), 0)
            );
            ctx.save();
            ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = isDark ? '#94a3b8' : '#475569'; // slate-400 / slate-600
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            totals.forEach((total, i) => {
                if (total <= 0) return;
                const xPos = x.getPixelForValue(i);
                const yPos = y.getPixelForValue(total);
                ctx.fillText(formatCurrency(total), xPos, yPos - 4);
            });
            ctx.restore();
        }
    };

    // Calcula o valor máximo da soma de cada coluna para definir um teto com folga visual
    const colTotals = timelineLabels.map((_, i) => (timelinePaid[i] || 0) + (timelineToPay[i] || 0));
    const maxColTotal = Math.max(...colTotals, 0);
    // Adiciona 20% de folga acima do pico para os rótulos de total não ficarem cortados
    const yAxisSuggestedMax = maxColTotal > 0 ? maxColTotal * 1.22 : 100;

    // Renderiza Gráfico 3: Fluxo de Caixa (Stacked Column)
    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    window.timelineChartInstance = new Chart(ctxTimeline, {
        type: 'bar',
        data: {
            labels: timelineLabels,
            datasets: [
                {
                    label: 'Já Pago',
                    data: timelinePaid,
                    backgroundColor: '#10b981', // Emerald-500
                    borderRadius: 6,
                    barThickness: activeBarThickness // Dinâmico: fixo no mobile e fluído no desktop
                },
                {
                    label: 'A Pagar',
                    data: timelineToPay,
                    backgroundColor: '#f43f5e', // Rose-500 (mesma cor do "Restante a Pagar")
                    borderRadius: 6,
                    barThickness: activeBarThickness // Dinâmico: fixo no mobile e fluído no desktop
                }
            ]
        },
        plugins: [stackedTotalLabelsPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Custom legenda externa no HTML
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            return ` ${context.dataset.label}: ${formatCurrency(value)}`;
                        },
                        afterBody: function(tooltipItems) {
                            const total = tooltipItems.reduce((sum, item) => sum + (item.raw || 0), 0);
                            return [``, ` Total do mês: ${formatCurrency(total)}`];
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    suggestedMax: yAxisSuggestedMax,
                    grid: { color: gridColor },
                    ticks: {
                        callback: value => formatCurrency(value),
                        font: { size: 10 }
                    }
                }
            }
        }
    });

    // 6. Renderizar Painel de Gastos por Dia de Vencimento da Fatura
    renderDueDatePanel();
}

// Extrai e projeta todos os eventos de parcelas/faturas com suas datas e dias de vencimento
function extractAllInstallmentEvents(itemList) {
    const events = [];
    const today = new Date();
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    itemList.forEach(item => {
        const installmentsTotal = parseInt(item.installmentsTotal) || 0;
        if (!item.bought || !item.isInstallment || installmentsTotal <= 0 || !item.purchaseDate) {
            return;
        }

        const parts = item.purchaseDate.split('-');
        if (parts.length !== 3) return;
        const pDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(pDate.getTime())) return;

        const closingDay = parseInt(item.installmentClosingDay || 28);
        const dueDay = parseInt(item.installmentDueDay || 10);
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const totalPrice = price * qty;
        const installmentValue = Math.round((totalPrice / installmentsTotal) * 100) / 100;

        const purchaseDay = pDate.getDate();
        const billingMonthOffset = (purchaseDay < closingDay) ? 0 : 1;
        const dueAfterClosingOffset = (dueDay <= closingDay) ? 1 : 0;
        const startMonthOffset = billingMonthOffset + dueAfterClosingOffset;

        for (let i = 1; i <= installmentsTotal; i++) {
            const dueDate = new Date(
                pDate.getFullYear(),
                pDate.getMonth() + startMonthOffset + (i - 1),
                dueDay
            );
            const compareDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            const isPaid = compareDueDate <= compareToday;

            let val = installmentValue;
            if (i === installmentsTotal) {
                const previousSum = installmentValue * (installmentsTotal - 1);
                val = Math.round((totalPrice - previousSum) * 100) / 100;
            }

            const month = dueDate.getMonth();
            const year = dueDate.getFullYear();
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

            const pDayNum = pDate.getDate();
            const pMonthNum = pDate.getMonth() + 1;
            const purchaseDayMonth = `${String(pDayNum).padStart(2, '0')}/${String(pMonthNum).padStart(2, '0')}`;

            events.push({
                item: item,
                itemName: item.name || 'Sem nome',
                category: item.category || 'Outros',
                dueDay: dueDay,
                dueDate: dueDate,
                purchaseDate: pDate,
                purchaseDateStr: item.purchaseDate,
                purchaseDay: purchaseDay,
                purchaseDayMonth: purchaseDayMonth,
                year: year,
                month: month,
                monthKey: monthKey,
                installmentNumber: i,
                installmentsTotal: installmentsTotal,
                value: val,
                isPaid: isPaid
            });
        }
    });

    return events;
}

// Renderiza o Painel de Gastos por Dia de Vencimento da Fatura com filtros por mês e categoria
function renderDueDatePanel() {
    const emptyState = document.getElementById('due-empty-state');
    const contentContainer = document.getElementById('due-content-container');
    const kpiTotal = document.getElementById('due-kpi-total');
    const kpiPeakDay = document.getElementById('due-kpi-peak-day');
    const kpiCount = document.getElementById('due-kpi-count');
    const daysBadge = document.getElementById('due-days-count-badge');
    const daysList = document.getElementById('due-days-list');

    if (!contentContainer || !emptyState) return;

    // Destrói gráfico anterior do painel de vencimento se existir
    if (window.dueDateChartInstance && typeof window.dueDateChartInstance.destroy === 'function') {
        window.dueDateChartInstance.destroy();
    }

    const allEvents = extractAllInstallmentEvents(items);

    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Aplica filtros específicos do painel: Dia de Vencimento, Mês e Categoria
    const filteredEvents = allEvents.filter(evt => {
        // Filtro por Dia de Vencimento
        let matchesDay = true;
        if (currentDueDayFilter !== 'all') {
            matchesDay = evt.dueDay.toString() === currentDueDayFilter.toString();
        }

        // Filtro por Mês
        let matchesMonth = true;
        if (currentDueMonthFilter === 'current') {
            matchesMonth = evt.monthKey === currentMonthKey;
        } else if (currentDueMonthFilter !== 'all') {
            matchesMonth = evt.monthKey === currentDueMonthFilter;
        }

        // Filtro por Categoria
        let matchesCategory = true;
        if (currentDueCategoryFilter !== 'all') {
            matchesCategory = evt.category === currentDueCategoryFilter;
        }

        return matchesDay && matchesMonth && matchesCategory;
    });

    if (filteredEvents.length === 0) {
        emptyState.classList.remove('hidden');
        contentContainer.classList.add('hidden');
        if (kpiTotal) kpiTotal.textContent = formatCurrency(0);
        if (kpiPeakDay) kpiPeakDay.textContent = '-';
        if (kpiCount) kpiCount.textContent = '0 parcelas';
        if (daysBadge) daysBadge.textContent = '0 dias';
        if (daysList) daysList.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    contentContainer.classList.remove('hidden');

    // Agrupa despesas por dia de vencimento (dueDay)
    const dayMap = new Map();
    let totalFilterSum = 0;

    filteredEvents.forEach(evt => {
        totalFilterSum += evt.value;
        const d = evt.dueDay;
        if (!dayMap.has(d)) {
            dayMap.set(d, {
                dueDay: d,
                totalValue: 0,
                paidValue: 0,
                toPayValue: 0,
                events: []
            });
        }
        const grp = dayMap.get(d);
        grp.totalValue += evt.value;
        if (evt.isPaid) {
            grp.paidValue += evt.value;
        } else {
            grp.toPayValue += evt.value;
        }
        grp.events.push(evt);
    });

    // Ordena os dias de vencimento numericamente (ex: Dia 5, Dia 10, Dia 15, Dia 28)
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.dueDay - b.dueDay);

    // Encontra o dia com a maior concentração de gastos
    const peakDay = sortedDays.reduce((max, d) => d.totalValue > max.totalValue ? d : max, sortedDays[0]);

    // Atualiza mini KPIs
    if (kpiTotal) kpiTotal.textContent = formatCurrency(totalFilterSum);
    if (kpiPeakDay) kpiPeakDay.textContent = `Dia ${String(peakDay.dueDay).padStart(2, '0')} (${formatCurrency(peakDay.totalValue)})`;
    if (kpiCount) kpiCount.textContent = `${filteredEvents.length} ${filteredEvents.length === 1 ? 'parcela' : 'parcelas'}`;
    if (daysBadge) daysBadge.textContent = `${sortedDays.length} ${sortedDays.length === 1 ? 'dia' : 'dias'}`;

    // Renderiza Lista de Detalhamento por Dia de Vencimento com Agrupamento por Data de Compra (Dia/Mês)
    if (daysList) {
        daysList.innerHTML = sortedDays.map(d => {
            const dayLabel = `Vencimento Dia ${String(d.dueDay).padStart(2, '0')}`;

            // Agrupa itens do vencimento pela data/mês exata em que a compra foi realizada (ex: 16/10)
            const pDateMap = new Map();
            d.events.forEach(evt => {
                const pKey = evt.purchaseDayMonth || 'Data n/d';
                if (!pDateMap.has(pKey)) {
                    pDateMap.set(pKey, {
                        purchaseDayMonth: pKey,
                        time: evt.purchaseDate ? evt.purchaseDate.getTime() : 0,
                        total: 0,
                        events: []
                    });
                }
                const pGrp = pDateMap.get(pKey);
                pGrp.total += evt.value;
                pGrp.events.push(evt);
            });

            const sortedPDateGroups = Array.from(pDateMap.values()).sort((a, b) => a.time - b.time);

            const purchaseGroupsHtml = sortedPDateGroups.map(pGrp => {
                const pText = `Compras de ${pGrp.purchaseDayMonth}`;

                const itemsRows = pGrp.events.map(evt => {
                    const dateVencStr = formatDateObjToBR(evt.dueDate);
                    const statusBadge = evt.isPaid
                        ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><i class="fa-solid fa-check text-[8px]"></i> Pago</span>`
                        : `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><i class="fa-solid fa-clock text-[8px]"></i> A Pagar</span>`;

                    return `
                        <div class="flex items-center justify-between py-1.5 border-t border-slate-100 dark:border-slate-700/40 first:border-t-0 text-xs gap-2">
                            <div class="min-w-0 flex-grow">
                                <p class="font-bold text-slate-700 dark:text-slate-200 truncate">${evt.itemName}</p>
                                <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                    <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">${evt.category}</span>
                                    <span>Parcela ${evt.installmentNumber}/${evt.installmentsTotal}</span>
                                    </div>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <p class="font-extrabold text-slate-800 dark:text-white">${formatCurrency(evt.value)}</p>
                                <div class="mt-0.5">${statusBadge}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs mb-2 last:mb-0">
                        <div class="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-700/50">
                            <span class="text-xs font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                                <i class="fa-solid fa-cart-shopping text-[10px] text-cyan-500"></i>
                                ${pText}
                            </span>
                            <span class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${formatCurrency(pGrp.total)}</span>
                        </div>
                        <div class="space-y-0.5">
                            ${itemsRows}
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-600/50">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 flex items-center justify-center font-black text-xs">
                                ${d.dueDay}
                            </div>
                            <div>
                                <span class="text-xs font-bold text-slate-800 dark:text-white">${dayLabel}</span>
                                <span class="text-[10px] text-slate-400 dark:text-slate-500 ml-1">(${d.events.length} ${d.events.length === 1 ? 'item' : 'itens'})</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block text-[9px]">Fatura Total</span>
                            <span class="text-sm font-extrabold text-cyan-600 dark:text-cyan-400">${formatCurrency(d.totalValue)}</span>
                        </div>
                    </div>
                    <div class="space-y-1">
                        ${purchaseGroupsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Paleta de cores moderna e contrastante para as Datas de Compra
    const PURCHASE_DAY_PALETTE = [
        '#06b6d4', // Cyan-500
        '#6366f1', // Indigo-500
        '#3b82f6', // Blue-500
        '#ec4899', // Pink-500
        '#f59e0b', // Amber-500
        '#10b981', // Emerald-500
        '#8b5cf6', // Violet-500
        '#14b8a6', // Teal-500
        '#f43f5e', // Rose-500
        '#84cc16', // Lime-500
        '#a855f7', // Purple-500
        '#f97316', // Orange-500
        '#0284c7', // Sky-600
        '#d946ef'  // Fuchsia-500
    ];

    // Coleta todas as datas de compra únicas (Dia/Mês, ex: "16/10") ordenadas cronologicamente
    const purchaseDateMap = new Map();
    filteredEvents.forEach(evt => {
        const key = evt.purchaseDayMonth || 'Data n/d';
        if (!purchaseDateMap.has(key)) {
            purchaseDateMap.set(key, {
                key: key,
                time: evt.purchaseDate ? evt.purchaseDate.getTime() : 0
            });
        }
    });

    const sortedPurchaseDates = Array.from(purchaseDateMap.values())
        .sort((a, b) => a.time - b.time)
        .map(obj => obj.key);

    // Constrói os datasets empilhados do Chart.js: cada dataset é uma Data de Compra (Dia/Mês)
    const isDark = document.documentElement.classList.contains('dark');
    const isMobile = window.innerWidth < 640;
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#f1f5f9';

    // Ajusta a largura do contêiner do gráfico para permitir rolagem fluida em mobile se houver muitas colunas
    const dueChartWrapper = document.getElementById('due-chart-wrapper');
    if (dueChartWrapper) {
        const parentWidth = dueChartWrapper.parentElement.clientWidth || 320;
        let reqWidth = parentWidth;
        if (isMobile && sortedDays.length > 4) {
            reqWidth = sortedDays.length * 68;
        }
        if (reqWidth > parentWidth) {
            dueChartWrapper.style.width = `${reqWidth}px`;
        } else {
            dueChartWrapper.style.width = '100%';
        }
    }

    const ctxDueDate = document.getElementById('dueDateChart');
    if (!ctxDueDate) return;

    const chartLabels = sortedDays.map(d => `Dia ${String(d.dueDay).padStart(2, '0')}`);
    const activeBarThickness = isMobile ? (sortedDays.length > 4 ? 22 : 28) : (sortedDays.length > 6 ? undefined : 36);

    const datasets = sortedPurchaseDates.map((pDayMonth, idx) => {
        const color = PURCHASE_DAY_PALETTE[idx % PURCHASE_DAY_PALETTE.length];
        const dataArr = sortedDays.map(d => {
            const dayEvents = d.events.filter(e => e.purchaseDayMonth === pDayMonth);
            const sum = dayEvents.reduce((acc, e) => acc + e.value, 0);
            return Math.round(sum * 100) / 100;
        });

        return {
            label: `Compra ${pDayMonth}`,
            purchaseDayMonth: pDayMonth,
            data: dataArr,
            backgroundColor: color,
            borderColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 1.5,
            borderRadius: 4,
            barThickness: activeBarThickness
        };
    });

    // Se por acaso nenhum evento tiver data informada, gera fallback
    if (datasets.length === 0) {
        datasets.push({
            label: 'Gastos da Fatura',
            data: sortedDays.map(d => Math.round(d.totalValue * 100) / 100),
            backgroundColor: '#06b6d4',
            borderRadius: 6,
            barThickness: activeBarThickness
        });
    }

    // Atualiza a legenda visual com as Datas de Compra (Dia/Mês) abaixo do gráfico com opção de expandir/recolher
    renderDueChartLegend(sortedPurchaseDates, filteredEvents, PURCHASE_DAY_PALETTE);

    // Plugin inline: desenha o valor total da fatura acima de cada torre empilhada
    const dueDateTotalLabelsPlugin = {
        id: 'dueDateTotalLabels',
        afterDatasetsDraw(chart) {
            const { ctx, data, scales: { x, y } } = chart;
            const totals = data.labels.map((_, i) =>
                chart.data.datasets.reduce((sum, ds) => sum + (ds.data[i] || 0), 0)
            );
            ctx.save();
            ctx.font = isMobile ? 'bold 9px "Plus Jakarta Sans", sans-serif' : 'bold 11px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            totals.forEach((total, i) => {
                if (total <= 0) return;
                const xPos = x.getPixelForValue(i);
                const yPos = y.getPixelForValue(total);
                ctx.fillText(formatCurrency(total), xPos, yPos - 3);
            });
            ctx.restore();
        }
    };

    const maxDayTotal = Math.max(...sortedDays.map(d => d.totalValue), 0);
    const ySuggestedMax = maxDayTotal > 0 ? maxDayTotal * 1.25 : 100;

    window.dueDateChartInstance = new Chart(ctxDueDate.getContext('2d'), {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: datasets
        },
        plugins: [dueDateTotalLabelsPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            if (!tooltipItems.length) return '';
                            const index = tooltipItems[0].dataIndex;
                            const dueDayObj = sortedDays[index];
                            return `Fatura com Vencimento no Dia ${String(dueDayObj.dueDay).padStart(2, '0')}`;
                        },
                        label: function(context) {
                            const value = context.raw || 0;
                            if (value <= 0) return null;
                            return ` 📅 ${context.dataset.label}: ${formatCurrency(value)}`;
                        },
                        afterBody: function(tooltipItems) {
                            if (!tooltipItems.length) return [];
                            const index = tooltipItems[0].dataIndex;
                            const dueDayObj = sortedDays[index];
                            const hoveredDataset = tooltipItems[0].dataset;
                            const pKey = hoveredDataset ? hoveredDataset.purchaseDayMonth : null;

                            const matchingEvents = pKey
                                ? dueDayObj.events.filter(e => e.purchaseDayMonth === pKey)
                                : dueDayObj.events;

                            const lines = [''];
                            if (matchingEvents.length > 0) {
                                lines.push(`📋 Compras de ${pKey}:`);
                                matchingEvents.forEach(e => {
                                    lines.push(` • ${e.itemName} (${e.installmentNumber}/${e.installmentsTotal}): ${formatCurrency(e.value)}`);
                                });
                            }
                            lines.push('');
                            lines.push(`💰 Total da Fatura (Dia ${dueDayObj.dueDay}): ${formatCurrency(dueDayObj.totalValue)}`);
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        font: { size: isMobile ? 10 : 11, weight: 'bold' }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    suggestedMax: ySuggestedMax,
                    grid: { color: gridColor },
                    ticks: {
                        callback: value => formatCurrency(value),
                        font: { size: isMobile ? 9 : 10 }
                    }
                }
            }
        }
    });
}

// Renderiza a legenda dinâmica de datas de compra com limite inicial e botão "Ver todos / Recolher"
function renderDueChartLegend(sortedPurchaseDates, filteredEvents, PURCHASE_DAY_PALETTE) {
    const legendContainer = document.getElementById('due-chart-legend');
    if (!legendContainer) return;

    if (!sortedPurchaseDates || sortedPurchaseDates.length === 0) {
        legendContainer.innerHTML = '';
        return;
    }

    const LEGEND_LIMIT = 6;
    const hasOverflow = sortedPurchaseDates.length > LEGEND_LIMIT;
    const datesToShow = (hasOverflow && !isDueLegendExpanded)
        ? sortedPurchaseDates.slice(0, LEGEND_LIMIT)
        : sortedPurchaseDates;

    const badgesHtml = datesToShow.map((pDayMonth) => {
        const originalIdx = sortedPurchaseDates.indexOf(pDayMonth);
        const color = PURCHASE_DAY_PALETTE[originalIdx % PURCHASE_DAY_PALETTE.length];
        const totalForPDate = filteredEvents
            .filter(e => e.purchaseDayMonth === pDayMonth)
            .reduce((sum, e) => sum + e.value, 0);

        return `
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
                <span><strong class="text-slate-900 dark:text-white">${pDayMonth}</strong>: <strong>${formatCurrency(totalForPDate)}</strong></span>
            </div>
        `;
    }).join('');

    let toggleBtnHtml = '';
    if (hasOverflow) {
        const remainingCount = sortedPurchaseDates.length - LEGEND_LIMIT;
        if (!isDueLegendExpanded) {
            toggleBtnHtml = `
                <button id="due-legend-toggle-btn" class="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:hover:bg-cyan-900/60 dark:text-cyan-300 font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer shadow-xs border border-cyan-100 dark:border-cyan-800/40">
                    <i class="fa-solid fa-chevron-down text-[8px] sm:text-[9px]"></i>
                    <span>Ver todos (+${remainingCount})</span>
                </button>
            `;
        } else {
            toggleBtnHtml = `
                <button id="due-legend-toggle-btn" class="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer shadow-xs border border-slate-200 dark:border-slate-600">
                    <i class="fa-solid fa-chevron-up text-[8px] sm:text-[9px]"></i>
                    <span>Recolher</span>
                </button>
            `;
        }
    }

    legendContainer.innerHTML = badgesHtml + toggleBtnHtml;

    const toggleBtn = document.getElementById('due-legend-toggle-btn');
    if (toggleBtn) {
        toggleBtn.onclick = (e) => {
            e.preventDefault();
            isDueLegendExpanded = !isDueLegendExpanded;
            renderDueChartLegend(sortedPurchaseDates, filteredEvents, PURCHASE_DAY_PALETTE);
        };
    }
}

// Formata objeto Date para DD/MM/AAAA
function formatDateObjToBR(date) {
    if (!date || isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

// Destruir instâncias ativas do Chart.js para permitir redesenho limpo
function destroyActiveCharts() {
    if (window.budgetChartInstance && typeof window.budgetChartInstance.destroy === 'function') {
        window.budgetChartInstance.destroy();
    }
    if (window.categoryChartInstance && typeof window.categoryChartInstance.destroy === 'function') {
        window.categoryChartInstance.destroy();
    }
    if (window.timelineChartInstance && typeof window.timelineChartInstance.destroy === 'function') {
        window.timelineChartInstance.destroy();
    }
    if (window.dueDateChartInstance && typeof window.dueDateChartInstance.destroy === 'function') {
        window.dueDateChartInstance.destroy();
    }
}

// Helpers
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
