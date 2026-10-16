// State Management
let items = [];
let currentCategoryFilter = 'all';
let currentYearFilter = 'all';
let currentTimelineView = 'monthly'; // Pode ser 'monthly', 'yearly', 'total'

// Firebase Configuration & State (Must match app.js)
const firebaseConfig = {
    apiKey: "AIzaSyA4zLDAI6pGrWEZU2vMdBkcCs_FS0ktEro",
    authDomain: "itensdecasa-48b35.firebaseapp.com",
    projectId: "itensdecasa-48b35",
    storageBucket: "itensdecasa-48b35.firebasestorage.app",
    messagingSenderId: "463316450450",
    appId: "1:463316450450:web:d0a608986cfe89214e3a4b"
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
                // Load synced items from LocalStorage and render charts
                loadItems();
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
            categorySelect.value = 'all';
            yearSelect.value = 'all';
            
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

    // Regra de Fechamento da Fatura:
    const purchaseDay = purchaseDate.getDate();
    const parsedDueDay = parseInt(dueDay);
    const parsedClosingDay = parseInt(closingDay || dueDay);
    const startMonthOffset = (purchaseDay < parsedClosingDay) ? 0 : 1;

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
        
        // Verifica fechamento para determinar o mês de vencimento da primeira parcela
        const purchaseDay = pDate.getDate();
        const startMonthOffset = (purchaseDay < closingDay) ? 0 : 1;

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
