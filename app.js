// State Management
let items = [];
let itemBeingBoughtId = null; // ID do item que está sendo comprado no momento
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';
let searchQuery = '';
let currentSort = 'date-desc';
let expandedItemIds = new Set(); // Armazena os IDs dos itens expandidos na listagem

// Firebase Configuration & State Falling back to LocalStorage if not configured
const firebaseConfig = {
    apiKey: "AIzaSyA4zLDAI6pGrWEZU2vMdBkcCs_FS0ktEro",
    authDomain: "itensdecasa-48b35.firebaseapp.com",
    projectId: "itensdecasa-48b35",
    storageBucket: "itensdecasa-48b35.firebasestorage.app",
    messagingSenderId: "463316450450",
    appId: "1:463316450450:web:d0a608986cfe89214e3a4b"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && firebaseConfig.apiKey !== "";
let db = null;
let auth = null;
let unsubscribeItems = null;
let authMode = 'login';

// Helper to generate dynamic mock dates relative to today
const getRelativeDateStr = (monthsAgo, day) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(day).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
};

// Default / mock items to greet user on first run
const defaultItems = [
    {
        id: 'mock-1',
        name: 'Detergente Líquido',
        quantity: 3,
        price: 0,
        category: 'Limpeza',
        notes: 'Marca Limpol ou Ypê (Coco)',
        bought: false,
        isInstallment: false,
        installmentsTotal: 0,
        installmentClosingDay: 0,
        installmentDueDay: 0,
        purchaseDate: "",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
    },
    {
        id: 'mock-2',
        name: 'Arroz Integral Tipo 1',
        quantity: 2,
        price: 6.90,
        category: 'Alimentação',
        notes: 'Pacote de 1kg',
        bought: true,
        isInstallment: false,
        installmentsTotal: 0,
        installmentClosingDay: 0,
        installmentDueDay: 0,
        purchaseDate: getRelativeDateStr(0, 5), // comprado no dia 5 deste mês
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString() // 12 hours ago
    },
    {
        id: 'mock-3',
        name: 'Smart TV 50" 4K UHD',
        quantity: 1,
        price: 1800.00,
        category: 'Sala',
        notes: 'Instalada no painel da sala. Voltagem 110-220V',
        bought: true,
        isInstallment: true,
        installmentsTotal: 10,
        installmentClosingDay: 28,
        installmentDueDay: 10,
        purchaseDate: getRelativeDateStr(2, 15), // comprada há 2 meses, dia 15
        createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString() // 60 days ago
    },
    {
        id: 'mock-4',
        name: 'Ar Condicionado Split 12000 BTUs',
        quantity: 1,
        price: 1440.00,
        category: 'Quarto',
        notes: 'Inverter, super econômico',
        bought: true,
        isInstallment: true,
        installmentsTotal: 12,
        installmentClosingDay: 25,
        installmentDueDay: 5,
        purchaseDate: getRelativeDateStr(4, 10), // comprado há 4 meses, dia 10
        createdAt: new Date(Date.now() - 3600000 * 24 * 120).toISOString() // 120 days ago
    },
    {
        id: 'mock-5',
        name: 'Jogo de Toalhas de Banho',
        quantity: 2,
        price: 0,
        category: 'Banheiro',
        notes: 'Cores cinza ou azul marinho',
        bought: false,
        isInstallment: false,
        installmentsTotal: 0,
        installmentClosingDay: 0,
        installmentDueDay: 0,
        purchaseDate: "",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
    },
    {
        id: 'mock-6',
        name: 'Fritadeira Elétrica Air Fryer',
        quantity: 1,
        price: 0,
        category: 'Cozinha',
        notes: 'Capacidade 4L, marca Mondial ou Philips Walita',
        bought: false,
        isInstallment: false,
        installmentsTotal: 0,
        installmentClosingDay: 0,
        installmentDueDay: 0,
        purchaseDate: "",
        createdAt: new Date().toISOString()
    }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    
    // Set current year in footer
    const currentYearElem = document.getElementById('current-year');
    if (currentYearElem) currentYearElem.textContent = new Date().getFullYear();

    // Check if Firebase is configured
    if (isFirebaseConfigured) {
        initFirebase();
        setupAuthEventListeners();
    } else {
        console.log("Firebase não configurado. Ativando Modo de Demonstração Local.");
        
        // Hide loading and show app instantly in local-only demo mode
        const loadingContainer = document.getElementById('loading-container');
        const appContainer = document.getElementById('app-container');
        if (loadingContainer) loadingContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');

        loadItems();
        updateDashboard();
        renderItems();
    }
});

// Check if Firebase is active
function isFirebaseActive() {
    return isFirebaseConfigured && auth && auth.currentUser;
}

// Initialize Firebase SDK Compat
function initFirebase() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();

    // Observe Auth State
    auth.onAuthStateChanged(user => {
        const loadingContainer = document.getElementById('loading-container');
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');

        if (user) {
            // User Logged In
            applyUserTheme(user.email);
            if (userName) userName.textContent = user.displayName || user.email;
            if (userMenu) userMenu.classList.remove('hidden');
            if (authContainer) authContainer.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');
            if (loadingContainer) loadingContainer.classList.add('hidden');

            // Listen to User Collection on Firestore
            listenToUserItems(user.uid);
        } else {
            // User Logged Out / Guest
            applyUserTheme(null);
            if (unsubscribeItems) {
                unsubscribeItems();
                unsubscribeItems = null;
            }
            if (userMenu) userMenu.classList.add('hidden');
            if (appContainer) appContainer.classList.add('hidden');
            if (authContainer) authContainer.classList.remove('hidden');
            if (loadingContainer) loadingContainer.classList.add('hidden');

            items = [];
            renderItems();
            updateDashboard();
        }
    });
}

// Apply per-user color theme on <html> element
// To change the e-mails, replace the values in the PINK_THEME_EMAILS array below.
const PINK_THEME_EMAILS = ['vinicalmeidasouza721@gmail.com'];

function applyUserTheme(email) {
    const html = document.documentElement;
    if (email && PINK_THEME_EMAILS.includes(email.toLowerCase())) {
        html.classList.add('theme-pink');
    } else {
        html.classList.remove('theme-pink');
    }
}


// Setup Real-time Sync with Firestore
function listenToUserItems(userId) {
    if (unsubscribeItems) unsubscribeItems();

    unsubscribeItems = db.collection("items")
        .where("userId", "==", userId)
        .onSnapshot(snapshot => {
            const cloudItems = [];
            snapshot.forEach(doc => {
                cloudItems.push(doc.data());
            });

            // Automatic Migration Strategy: only runs once on first login when cloud is empty
            // and local has real user data (not just the default mock items).
            // Uses a flag so it never triggers again after the first successful sync.
            const alreadySynced = localStorage.getItem('firebase_synced') === '1';

            if (!alreadySynced && cloudItems.length === 0) {
                const storedLocalItems = localStorage.getItem('household_items');
                let localItems = [];
                if (storedLocalItems) {
                    try { localItems = JSON.parse(storedLocalItems); } catch(e){}
                }

                const hasOnlyMockItems = localItems.length > 0 && localItems.every(i => i.id.startsWith('mock-'));

                if (localItems.length > 0 && !hasOnlyMockItems) {
                    console.log("Migrando itens locais para o Firestore...");
                    const batch = db.batch();
                    localItems.forEach(item => {
                        const cleanId = item.id.startsWith('mock-') ? 'cloud-' + Math.random().toString(36).substr(2, 9) : item.id;
                        const ref = db.collection("items").doc(cleanId);
                        batch.set(ref, { ...item, id: cleanId, userId: userId });
                    });
                    batch.commit().then(() => {
                        localStorage.setItem('firebase_synced', '1');
                        showToast("Dados locais sincronizados com a nuvem!", "cloud-arrow-up", "success");
                    });
                    return;
                }
            }

            // Mark as synced so migration never runs again
            localStorage.setItem('firebase_synced', '1');

            // Sync successfully, sort items (newest created first)
            items = cloudItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            // Sync to LocalStorage as cache so dashboard.html stays perfectly updated
            localStorage.setItem('household_items', JSON.stringify(items));

            updateDashboard();
            renderItems();
        }, err => {
            console.error("Erro ao escutar Firestore: ", err);
        });
}

// Setup Auth Form Events
function setupAuthEventListeners() {
    const authForm = document.getElementById('auth-form');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const btnLogout = document.getElementById('btn-logout');

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    showToast("Bem-vindo de volta!", "circle-check", "success");
                })
                .catch(err => {
                    console.error(err);
                    showToast(translateAuthError(err.code), "triangle-exclamation", "error");
                });
        });
    }

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', () => {
            const email = document.getElementById('auth-email').value.trim();
            if (!email) {
                showToast("Digite seu e-mail acima primeiro.", "circle-info", "info");
                return;
            }
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    showToast("E-mail de recuperação de senha enviado!", "paper-plane", "success");
                })
                .catch(err => {
                    console.error(err);
                    showToast(translateAuthError(err.code), "triangle-exclamation", "error");
                });
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm("Deseja realmente sair da sua conta?")) {
                auth.signOut();
            }
        });
    }
}

// Translate Common Firebase Auth Errors
function translateAuthError(code) {
    switch (code) {
        case 'auth/invalid-email': return 'E-mail inválido.';
        case 'auth/user-disabled': return 'Este usuário foi desativado.';
        case 'auth/user-not-found': return 'Usuário não encontrado.';
        case 'auth/wrong-password': return 'Senha incorreta.';
        case 'auth/email-already-in-use': return 'E-mail já cadastrado em outra conta.';
        case 'auth/weak-password': return 'A senha deve ter no mínimo 6 caracteres.';
        case 'auth/popup-closed-by-user': return 'Login cancelado pelo usuário.';
        default: return 'Ocorreu um erro ao autenticar. Tente novamente.';
    }
}

// Persist single item (Cloud Firestore if active, fallback to LocalStorage)
function persistItem(item, isNew = false) {
    if (isFirebaseActive()) {
        const userId = auth.currentUser.uid;
        const cleanId = item.id.startsWith('mock-') && isNew ? 'cloud-' + Math.random().toString(36).substr(2, 9) : item.id;
        db.collection("items").doc(cleanId).set({
            ...item,
            id: cleanId,
            userId: userId
        }).catch(err => {
            console.error("Erro ao salvar no Firestore: ", err);
            showToast("Erro ao salvar na nuvem.", "triangle-exclamation", "error");
        });
    } else {
        if (isNew) {
            items.unshift(item);
        } else {
            const idx = items.findIndex(i => i.id === item.id);
            if (idx !== -1) items[idx] = item;
        }
        saveItems();
        updateDashboard();
        renderItems();
    }
}

// Delete single item (Cloud Firestore if active, fallback to LocalStorage)
function deleteItem(id) {
    if (isFirebaseActive()) {
        db.collection("items").doc(id).delete().catch(err => {
            console.error("Erro ao deletar no Firestore: ", err);
            showToast("Erro ao remover na nuvem.", "triangle-exclamation", "error");
        });
    } else {
        items = items.filter(item => item.id !== id);
        expandedItemIds.delete(id);
        saveItems();
        updateDashboard();
        renderItems();
    }
}

// Load items from LocalStorage (Fallback Mode)
function loadItems() {
    const storedItems = localStorage.getItem('household_items');
    if (storedItems) {
        try {
            items = JSON.parse(storedItems);
        } catch (e) {
            console.error("Erro ao carregar dados do LocalStorage, usando padrões.", e);
            items = [...defaultItems];
            saveItems();
        }
    } else {
        items = [...defaultItems];
        saveItems();
    }
}

// Save items to LocalStorage (Fallback Mode)
function saveItems() {
    localStorage.setItem('household_items', JSON.stringify(items));
}

// Setup Event Listeners
function setupEventListeners() {
    // Exibição dinâmica de campos de parcelamento no formulário de cadastro (com combinação de 'parcelado' E 'comprado')
    const chkInstallment = document.getElementById('item-is-installment');
    const chkBought = document.getElementById('item-bought');
    const divInstallmentFieldsContainer = document.getElementById('installment-fields-container');

    function toggleInstallmentFields() {
        if (chkInstallment && chkBought && divInstallmentFieldsContainer) {
            // Só exibe se for parcelado E for comprado
            if (chkInstallment.checked && chkBought.checked) {
                divInstallmentFieldsContainer.classList.remove('hidden');
                // Inicializa a data de compra com hoje se estiver vazia
                const dateInput = document.getElementById('item-purchase-date');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            } else {
                divInstallmentFieldsContainer.classList.add('hidden');
            }
        }
    }

    if (chkInstallment) chkInstallment.addEventListener('change', toggleInstallmentFields);
    if (chkBought) chkBought.addEventListener('change', toggleInstallmentFields);

    // Exibição dinâmica de campos de parcelamento e data de compra no Modal de Edição
    const chkEditInstallment = document.getElementById('edit-item-is-installment');
    const chkEditBought = document.getElementById('edit-item-bought');
    const divEditInstallmentFieldsContainer = document.getElementById('edit-installment-fields-container');
    const divEditPurchaseDateContainer = document.getElementById('edit-purchase-date-container');

    function toggleEditInstallmentFields() {
        if (chkEditInstallment && chkEditBought && divEditInstallmentFieldsContainer && divEditPurchaseDateContainer) {
            const editDateInput = document.getElementById('edit-item-purchase-date');
            // Preço e parcelamento só podem ser informados se o item estiver marcado como comprado
            applyEditBoughtLock(chkEditBought.checked);
            if (!chkEditBought.checked) {
                document.getElementById('edit-item-price').value = '';
                chkEditInstallment.checked = false;
            }
            
            // Exibe data de compra se o item estiver comprado (independente de ser parcelado ou não)
            if (chkEditBought.checked) {
                divEditPurchaseDateContainer.classList.remove('hidden');
                if (editDateInput && !editDateInput.value) {
                    editDateInput.value = new Date().toISOString().split('T')[0];
                }
                if (editDateInput) editDateInput.setAttribute('required', 'true');
            } else {
                divEditPurchaseDateContainer.classList.add('hidden');
                if (editDateInput) {
                    editDateInput.removeAttribute('required');
                    editDateInput.value = '';
                }
            }

            // Só exibe campos específicos de parcelamento se for parcelado E for comprado
            if (chkEditInstallment.checked && chkEditBought.checked) {
                divEditInstallmentFieldsContainer.classList.remove('hidden');
            } else {
                divEditInstallmentFieldsContainer.classList.add('hidden');
            }
        }
    }

    if (chkEditInstallment) chkEditInstallment.addEventListener('change', toggleEditInstallmentFields);
    if (chkEditBought) chkEditBought.addEventListener('change', toggleEditInstallmentFields);

    // Controle de Abas de Navegação no Mobile (Responsive Tabs)
    const tabList = document.getElementById('tab-list');
    const tabAdd = document.getElementById('tab-add');
    const formPanel = document.getElementById('form-panel');
    const listPanel = document.getElementById('list-panel');

    if (tabList && tabAdd) {
        tabList.addEventListener('click', () => {
            // Alterna exibição dos painéis
            formPanel.classList.add('hidden');
            formPanel.classList.remove('block');
            listPanel.classList.remove('hidden');
            listPanel.classList.add('block');

            // Ajusta visual dos botões
            tabList.className = "flex-1 py-3 text-sm font-bold rounded-xl text-cyan-600 bg-white dark:bg-slate-700 dark:text-white shadow-sm transition-all flex items-center justify-center gap-2";
            tabAdd.className = "flex-1 py-3 text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all flex items-center justify-center gap-2";
        });

        tabAdd.addEventListener('click', () => {
            // Alterna exibição dos painéis
            listPanel.classList.add('hidden');
            listPanel.classList.remove('block');
            formPanel.classList.remove('hidden');
            formPanel.classList.add('block');

            // Ajusta visual dos botões
            tabAdd.className = "flex-1 py-3 text-sm font-bold rounded-xl text-cyan-600 bg-white dark:bg-slate-700 dark:text-white shadow-sm transition-all flex items-center justify-center gap-2";
            tabList.className = "flex-1 py-3 text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all flex items-center justify-center gap-2";
        });
    }

    // Form submit for adding items
    const addForm = document.getElementById('add-item-form');
    addForm.addEventListener('submit', handleAddItem);

    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderItems();
    });

    // Sorting selection
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderItems();
    });

    // Status Filters (All, To Buy, Bought)
    const statusFiltersContainer = document.getElementById('status-filters');
    statusFiltersContainer.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('button');
        if (!targetBtn) return;

        // Update active styling
        statusFiltersContainer.querySelectorAll('button').forEach(btn => {
            btn.className = "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600";
        });
        targetBtn.className = "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-cyan-600 text-white shadow-sm dark:bg-cyan-600 dark:text-white";

        currentStatusFilter = targetBtn.dataset.status;
        renderItems();
    });

    // Category Filters (Tags)
    const categoryFiltersContainer = document.getElementById('category-filters');
    // Adiciona suporte a clique e arraste horizontal com o mouse (Drag-to-scroll) para computadores
    let isDown = false;
    let startX;
    let scrollLeft;
    let dragThresholdMoved = false; // Flag para diferenciar arraste de clique rápido

    categoryFiltersContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        categoryFiltersContainer.classList.remove('cursor-grab');
        categoryFiltersContainer.classList.add('cursor-grabbing');
        startX = e.pageX - categoryFiltersContainer.offsetLeft;
        scrollLeft = categoryFiltersContainer.scrollLeft;
        dragThresholdMoved = false;
    });

    categoryFiltersContainer.addEventListener('mouseleave', () => {
        isDown = false;
        categoryFiltersContainer.classList.remove('cursor-grabbing');
        categoryFiltersContainer.classList.add('cursor-grab');
    });

    categoryFiltersContainer.addEventListener('mouseup', () => {
        isDown = false;
        categoryFiltersContainer.classList.remove('cursor-grabbing');
        categoryFiltersContainer.classList.add('cursor-grab');
    });

    categoryFiltersContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - categoryFiltersContainer.offsetLeft;
        const walk = (x - startX) * 1.5; // Multiplicador para ajustar a velocidade do scroll
        
        // Se mover mais do que 5 pixels, consideramos como um arraste
        if (Math.abs(walk) > 5) {
            dragThresholdMoved = true;
        }
        categoryFiltersContainer.scrollLeft = scrollLeft - walk;
    });

    categoryFiltersContainer.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('button');
        if (!targetBtn) return;

        // Se o usuário arrastou de verdade, previne o clique acidental no botão de filtro
        if (dragThresholdMoved) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Update active styling
        categoryFiltersContainer.querySelectorAll('button').forEach(btn => {
            btn.className = "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600";
        });
        targetBtn.className = "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-cyan-600 text-white shadow-sm";

        currentCategoryFilter = targetBtn.dataset.category;
        renderItems();
    });

    // Bulk delete bought items
    const clearBoughtBtn = document.getElementById('btn-clear-bought');
    clearBoughtBtn.addEventListener('click', handleClearBought);

    // Theme toggle button
    const themeToggleBtn = document.getElementById('theme-toggle');
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Edit Item Modal handling
    const editForm = document.getElementById('edit-item-form');
    editForm.addEventListener('submit', handleSaveEdit);

    const closeModalBtn = document.getElementById('close-modal');
    closeModalBtn.addEventListener('click', hideEditModal);

    const cancelEditBtn = document.getElementById('btn-cancel-edit');
    cancelEditBtn.addEventListener('click', hideEditModal);

    // Export/Import Modal handling
    const exportImportBtn = document.getElementById('btn-export-import');
    exportImportBtn.addEventListener('click', showExportImportModal);

    const closeExportModalBtn = document.getElementById('close-export-modal');
    closeExportModalBtn.addEventListener('click', hideExportImportModal);

    const btnExportBackup = document.getElementById('btn-export-backup');
    btnExportBackup.addEventListener('click', handleExportBackup);

    const fileInput = document.getElementById('import-file-input');
    const btnTriggerFile = document.getElementById('btn-trigger-file');
    const fileLabel = document.getElementById('import-file-label');
    const btnImportBackup = document.getElementById('btn-import-backup');

    btnTriggerFile.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileLabel.textContent = file.name;
            btnImportBackup.removeAttribute('disabled');
        } else {
            fileLabel.textContent = 'Selecionar arquivo';
            btnImportBackup.setAttribute('disabled', 'true');
        }
    });

    btnImportBackup.addEventListener('click', handleImportBackup);

    // Eventos do novo Modal de Confirmação de Compra
    const chkPurchaseInstallment = document.getElementById('purchase-is-installment');
    const divPurchaseInstallmentFields = document.getElementById('purchase-installment-fields-container');
    if (chkPurchaseInstallment && divPurchaseInstallmentFields) {
        chkPurchaseInstallment.addEventListener('change', (e) => {
            if (e.target.checked) {
                divPurchaseInstallmentFields.classList.remove('hidden');
                const dateInput = document.getElementById('purchase-date');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            } else {
                divPurchaseInstallmentFields.classList.add('hidden');
            }
        });
    }

    const cancelPurchaseBtn = document.getElementById('btn-cancel-purchase');
    if (cancelPurchaseBtn) {
        cancelPurchaseBtn.addEventListener('click', hidePurchaseModal);
    }

    const purchaseForm = document.getElementById('purchase-form');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', handleConfirmPurchase);
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

// Toggle Theme
function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        showToast('Tema claro ativado!', 'sun');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        showToast('Tema escuro ativado!', 'moon');
    }
}

// Função matemática de cálculo de progresso de parcelas baseado em datas
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
    
    // CORREÇÃO DE TIMEZONE: Parse local de "YYYY-MM-DD" para evitar descompassos de horas/fuso local
    let purchaseDate = null;
    if (purchaseDateStr) {
        const parts = purchaseDateStr.split('-');
        if (parts.length === 3) {
            purchaseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    }

    if (!purchaseDate || isNaN(purchaseDate.getTime())) {
        // Fallback se a data for inválida mas for parcelado comprado (considera pelo menos 1 paga)
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
    // Se a compra foi feita ANTES do dia de fechamento (purchaseDay < closingDay),
    // a cobrança da 1ª parcela começa no PRÓPRIO mês da compra (offset = 0).
    // Se a compra foi feita NO DIA ou APÓS o fechamento (purchaseDay >= closingDay),
    // a cobrança da 1ª parcela só começa no MÊS SEGUINTE ao da compra (offset = 1).
    const purchaseDay = purchaseDate.getDate();
    const parsedDueDay = parseInt(dueDay);
    const parsedClosingDay = parseInt(closingDay || dueDay); // Fallback se fechar no mesmo dia
    const startMonthOffset = (purchaseDay < parsedClosingDay) ? 0 : 1;

    let paidInstallments = 0;

    for (let i = 1; i <= installmentsTotal; i++) {
        // Projeta a data de vencimento da parcela i
        const dueDate = new Date(
            purchaseDate.getFullYear(),
            purchaseDate.getMonth() + startMonthOffset + (i - 1),
            parsedDueDay
        );
        
        // Zera as horas de ambas as datas para comparar apenas o dia civil de vencimento
        const compareDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // A parcela só é considerada paga se HOJE for igual ou posterior ao vencimento da respectiva parcela
        if (compareDueDate <= compareToday) {
            paidInstallments++;
        } else {
            // Como as parcelas são sequenciais, a primeira que estiver no futuro interrompe o loop
            break;
        }
    }

    // Garantir limitadores de segurança
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

// Update Dashboard Statistics
function updateDashboard() {
    const totalItems = items.length;
    const boughtItems = items.filter(item => item.bought).length;
    const toBuyItems = totalItems - boughtItems;

    let totalBoughtValue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalMonthlyInstallments = 0;

    items.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const totalPrice = price * qty;

        if (!item.bought) {
            // Itens a comprar: o valor total estimado vai para o restante a pagar
            totalRemaining += totalPrice;
        } else {
            // Itens comprados (vista ou parcelado)
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

            // Se for parcelado e ainda estiver ativo (pendente de quitação)
            if (item.isInstallment && progress.active) {
                totalMonthlyInstallments += (totalPrice / item.installmentsTotal);
            }
        }
    });

    // Update statistics elements
    document.getElementById('stat-total').textContent = totalItems;
    document.getElementById('stat-to-buy-summary').textContent = `${toBuyItems} a comprar`;
    document.getElementById('stat-total-bought-value').textContent = formatCurrency(totalBoughtValue);
    document.getElementById('stat-total-paid').textContent = formatCurrency(totalPaid);
    document.getElementById('stat-total-remaining').textContent = formatCurrency(totalRemaining);

    // Atualiza estatísticas de parcelas mensais se houverem
    const priceMonthlyLabel = document.getElementById('stat-price-monthly');
    if (priceMonthlyLabel) {
        if (totalMonthlyInstallments > 0) {
            priceMonthlyLabel.textContent = `Mensal: ${formatCurrency(totalMonthlyInstallments)}`;
            priceMonthlyLabel.classList.remove('hidden');
        } else {
            priceMonthlyLabel.classList.add('hidden');
        }
    }

    // Show/Hide Clear Bought button
    const clearBoughtBtn = document.getElementById('btn-clear-bought');
    if (boughtItems > 0) {
        clearBoughtBtn.classList.remove('hidden');
    } else {
        clearBoughtBtn.classList.add('hidden');
    }
}

// Add New Item Handler (Cadastro Simplificado - Entra como 'A comprar')
function handleAddItem(e) {
    e.preventDefault();

    const nameInput = document.getElementById('item-name');
    const quantityInput = document.getElementById('item-quantity');
    const categorySelect = document.getElementById('item-category');
    const notesInput = document.getElementById('item-notes');

    const newItem = {
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: nameInput.value.trim(),
        quantity: parseInt(quantityInput.value) || 1,
        price: 0, // Inicia zerado visto que ainda não foi comprado
        category: categorySelect.value,
        notes: notesInput.value.trim(),
        bought: false, // Sempre entra como "A comprar"
        
        // Atributos de parcelas iniciam vazios
        isInstallment: false,
        installmentsTotal: 0,
        installmentClosingDay: 0,
        installmentDueDay: 0,
        purchaseDate: "",
        
        createdAt: new Date().toISOString()
    };

    persistItem(newItem, true);

    // Reset Form Fields
    nameInput.value = '';
    quantityInput.value = '1';
    categorySelect.value = 'Outros';
    notesInput.value = '';

    showToast(`"${newItem.name}" adicionado para comprar!`, 'hourglass-half', 'success');

    // Se estiver no mobile (abas ativas), volta para a lista automaticamente após cadastrar
    const tabList = document.getElementById('tab-list');
    const mobileTabs = document.getElementById('mobile-tabs');
    if (tabList && mobileTabs && window.getComputedStyle(mobileTabs).display !== 'none') {
        tabList.click();
    }
}

// Delete Item Handler
function handleDeleteItem(id) {
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete) return;

    if (confirm(`Deseja realmente remover "${itemToDelete.name}" da lista?`)) {
        deleteItem(id);
        showToast(`"${itemToDelete.name}" removido!`, 'trash-can', 'warning');
    }
}

// Toggle Item Bought Status (com interrupção para abrir o novo modal de compra)
function handleToggleBought(id) {
    const item = items.find(item => item.id === id);
    if (!item) return;

    if (!item.bought) {
        // Se está marcando como comprado, abre o modal de confirmação de preço e parcelamento
        showPurchaseModal(id);
    } else {
        // Se está desmarcando para voltar a "A comprar", limpa os valores financeiros
        if (confirm(`Deseja desmarcar "${item.name}" como comprado? Os valores financeiros e parcelamentos serão limpos.`)) {
            item.bought = false;
            item.price = 0;
            item.isInstallment = false;
            item.installmentClosingDay = 0;
            item.installmentDueDay = 0;
            item.purchaseDate = "";
            
            persistItem(item);
            showToast(`"${item.name}" voltou para a lista de itens a comprar!`, 'hourglass-half', 'info');
        } else {
            // Se o usuário cancelar, re-renderiza para manter o checkbox marcado
            renderItems();
        }
    }
}

// Abre o Modal de Compra e Configura os Campos do Item
function showPurchaseModal(id) {
    const item = items.find(item => item.id === id);
    if (!item) return;

    itemBeingBoughtId = id;
    
    // Atualiza descrição do modal com o nome do item selecionado
    document.getElementById('purchase-item-id').value = id;
    document.getElementById('purchase-item-title-desc').innerHTML = `Preencha os detalhes de pagamento de <span class="text-cyan-600 dark:text-cyan-400 font-bold">"${escapeHTML(item.name)}"</span> para registrá-lo na sua lista de itens comprados.`;
    
    // Zera/reseta inputs de compra anterior
    document.getElementById('purchase-price').value = '';
    
    const chkPurchaseInst = document.getElementById('purchase-is-installment');
    chkPurchaseInst.checked = false;
    
    const divPurchaseInstFields = document.getElementById('purchase-installment-fields-container');
    if (divPurchaseInstFields) {
        divPurchaseInstFields.classList.add('hidden');
    }
    
    document.getElementById('purchase-installments-total').value = '12';
    document.getElementById('purchase-installment-closing-day').value = '28';
    document.getElementById('purchase-installment-due-day').value = '10';
    document.getElementById('purchase-date').value = new Date().toISOString().split('T')[0];

    // Abre o modal
    const modal = document.getElementById('purchase-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('modal-active');
        document.getElementById('purchase-price').focus();
    }, 10);
}

// Fecha o Modal de Compra
function hidePurchaseModal() {
    const modal = document.getElementById('purchase-modal');
    modal.classList.remove('modal-active');
    setTimeout(() => {
        modal.classList.add('hidden');
        itemBeingBoughtId = null;
        // Re-renderiza para reverter o estado visual do checkbox se o usuário apenas fechou
        renderItems();
    }, 300);
}

// Confirmação de Transação de Compra do Item
function handleConfirmPurchase(e) {
    e.preventDefault();

    const id = document.getElementById('purchase-item-id').value;
    const price = parseFloat(document.getElementById('purchase-price').value) || 0;
    const isInstallment = document.getElementById('purchase-is-installment').checked;
    
    const installmentsTotal = isInstallment ? (parseInt(document.getElementById('purchase-installments-total').value) || 12) : 0;
    const installmentClosingDay = isInstallment ? (parseInt(document.getElementById('purchase-installment-closing-day').value) || 28) : 0;
    const installmentDueDay = isInstallment ? (parseInt(document.getElementById('purchase-installment-due-day').value) || 10) : 0;
    const purchaseDate = document.getElementById('purchase-date').value; // Sempre salva a data de compra para todas as compras

    const item = items.find(item => item.id === id);
    if (item) {
        item.bought = true;
        item.price = price;
        item.isInstallment = isInstallment;
        item.installmentsTotal = installmentsTotal;
        item.installmentClosingDay = installmentClosingDay;
        item.installmentDueDay = installmentDueDay;
        item.purchaseDate = purchaseDate;

        persistItem(item);
        
        // Esconde o modal
        const modal = document.getElementById('purchase-modal');
        modal.classList.remove('modal-active');
        modal.classList.add('hidden');
        itemBeingBoughtId = null;
        
        showToast(`"${item.name}" marcado como comprado!`, 'circle-check', 'success');
    }
}

// Clear All Bought Items
function handleClearBought() {
    const boughtCount = items.filter(item => item.bought).length;
    if (boughtCount === 0) return;

    if (confirm(`Tem certeza que deseja excluir todos os ${boughtCount} itens marcados como COMPRADOS?`)) {
        const boughtItems = items.filter(item => item.bought);
        boughtItems.forEach(item => deleteItem(item.id));
        
        if (!isFirebaseActive()) {
            items = items.filter(item => !item.bought);
            saveItems();
            updateDashboard();
            renderItems();
        }
        showToast(`${boughtCount} itens comprados foram removidos.`, 'trash-can', 'warning');
    }
}

// Habilita/bloqueia preço e parcelamento no Modal de Edição conforme o status de comprado
function applyEditBoughtLock(isBought) {
    const priceInput = document.getElementById('edit-item-price');
    priceInput.disabled = !isBought;
    priceInput.required = isBought; // Valor obrigatório quando comprado
    document.getElementById('edit-item-is-installment').disabled = !isBought;
    document.getElementById('edit-installment-section').classList.toggle('opacity-50', !isBought);
}

// Open and Populate Edit Modal
function showEditModal(id) {
    const item = items.find(item => item.id === id);
    if (!item) return;

    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-item-name').value = item.name;
    document.getElementById('edit-item-quantity').value = item.quantity;
    document.getElementById('edit-item-price').value = item.price > 0 ? item.price : '';
    document.getElementById('edit-item-category').value = item.category;
    document.getElementById('edit-item-notes').value = item.notes || '';
    document.getElementById('edit-item-bought').checked = item.bought;

    // Carregar informações de parcelamento e data de compra
    const isInst = !!item.isInstallment && item.bought;
    const chkEditInst = document.getElementById('edit-item-is-installment');
    const divEditInstFieldsContainer = document.getElementById('edit-installment-fields-container');
    const divEditPurchaseDateContainer = document.getElementById('edit-purchase-date-container');
    const editPurchaseDateInput = document.getElementById('edit-item-purchase-date');
    
    if (chkEditInst && divEditInstFieldsContainer && divEditPurchaseDateContainer && editPurchaseDateInput) {
        chkEditInst.checked = isInst;
        document.getElementById('edit-item-installments-total').value = isInst ? item.installmentsTotal : '12';
        document.getElementById('edit-item-installment-closing-day').value = isInst ? (item.installmentClosingDay || 28) : '28';
        document.getElementById('edit-item-installment-due-day').value = isInst ? item.installmentDueDay : '10';
        
        // Exibe data de compra se o item estiver comprado (independente de ser parcelado ou não)
        if (item.bought) {
            divEditPurchaseDateContainer.classList.remove('hidden');
            editPurchaseDateInput.value = item.purchaseDate || new Date().toISOString().split('T')[0];
            editPurchaseDateInput.setAttribute('required', 'true');
        } else {
            divEditPurchaseDateContainer.classList.add('hidden');
            editPurchaseDateInput.removeAttribute('required');
            editPurchaseDateInput.value = '';
        }
        
        if (isInst) {
            divEditInstFieldsContainer.classList.remove('hidden');
        } else {
            divEditInstFieldsContainer.classList.add('hidden');
        }
    }

    applyEditBoughtLock(item.bought);

    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

// Close Edit Modal
function hideEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('modal-active');
    setTimeout(() => {
        modal.classList.add('hidden');
        
        // Reset parcelamento modal inputs
        const divEditInstFieldsContainer = document.getElementById('edit-installment-fields-container');
        if (divEditInstFieldsContainer) {
            divEditInstFieldsContainer.classList.add('hidden');
        }
    }, 300);
}

// Save Edited Item
function handleSaveEdit(e) {
    e.preventDefault();

    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value.trim();
    const quantity = parseInt(document.getElementById('edit-item-quantity').value) || 1;
    const category = document.getElementById('edit-item-category').value;
    const notes = document.getElementById('edit-item-notes').value.trim();
    const bought = document.getElementById('edit-item-bought').checked;
    const priceValue = document.getElementById('edit-item-price').value;
    const price = bought && priceValue ? parseFloat(priceValue) : 0;

    // Capturar parcelamento e data de compra editados
    const isInstallmentCheckbox = document.getElementById('edit-item-is-installment');
    const installmentsTotalInput = document.getElementById('edit-item-installments-total');
    const installmentClosingDayInput = document.getElementById('edit-item-installment-closing-day');
    const installmentDueDayInput = document.getElementById('edit-item-installment-due-day');
    const purchaseDateInput = document.getElementById('edit-item-purchase-date');

    const isInstallment = isInstallmentCheckbox.checked && bought;
    const purchaseDate = bought ? purchaseDateInput.value : ""; // Salva a data de compra de qualquer item comprado

    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
        items[index] = {
            ...items[index],
            name,
            quantity,
            price,
            category,
            notes,
            bought,
            
            // Atributos de parcelas atualizados (só mantidos se for comprado E parcelado)
            isInstallment,
            installmentsTotal: isInstallment ? (parseInt(installmentsTotalInput.value) || 12) : 0,
            installmentClosingDay: isInstallment ? (parseInt(installmentClosingDayInput.value) || 28) : 0,
            installmentDueDay: isInstallment ? (parseInt(installmentDueDayInput.value) || 10) : 0,
            purchaseDate: purchaseDate,
            
            updatedAt: new Date().toISOString()
        };

        persistItem(items[index]);
        hideEditModal();
        showToast(`"${name}" atualizado com sucesso!`, 'pen-to-square', 'success');
    }
}

// Export/Import Modal Controllers
function showExportImportModal() {
    const modal = document.getElementById('export-import-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

function hideExportImportModal() {
    const modal = document.getElementById('export-import-modal');
    modal.classList.remove('modal-active');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Reset file import states
        document.getElementById('import-file-input').value = '';
        document.getElementById('import-file-label').textContent = 'Selecionar arquivo';
        document.getElementById('btn-import-backup').setAttribute('disabled', 'true');
    }, 300);
}

// Export Backup to JSON file
function handleExportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lista_itens_casa_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    showToast('Backup exportado com sucesso!', 'file-export', 'success');
    hideExportImportModal();
}

// Import Backup from JSON file
function handleImportBackup() {
    const fileInput = document.getElementById('import-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const parsedData = JSON.parse(event.target.result);
            if (Array.isArray(parsedData)) {
                // Perform basic validation to check fields
                const isValid = parsedData.every(item => item.name && item.id);
                if (isValid) {
                    if (isFirebaseActive()) {
                        db.collection("items").where("userId", "==", auth.currentUser.uid).get().then(snapshot => {
                            const batch = db.batch();
                            snapshot.docs.forEach(doc => batch.delete(doc.ref));
                            parsedData.forEach(item => {
                                const cleanId = item.id.startsWith('mock-') ? 'cloud-' + Math.random().toString(36).substr(2, 9) : item.id;
                                const ref = db.collection("items").doc(cleanId);
                                batch.set(ref, { ...item, id: cleanId, userId: auth.currentUser.uid });
                            });
                            return batch.commit();
                        }).then(() => {
                            showToast('Lista importada e sincronizada na nuvem!', 'cloud-arrow-up', 'success');
                            hideExportImportModal();
                        }).catch(err => {
                            console.error("Erro ao importar no Firebase: ", err);
                            showToast('Erro ao importar na nuvem.', 'triangle-exclamation', 'error');
                        });
                    } else {
                        items = parsedData;
                        saveItems();
                        updateDashboard();
                        renderItems();
                        showToast('Lista importada com sucesso!', 'file-import', 'success');
                        hideExportImportModal();
                    }
                } else {
                    alert('Erro: O arquivo não possui o formato de lista de itens válido.');
                }
            } else {
                alert('Erro: O conteúdo do arquivo não é um array válido.');
            }
        } catch (e) {
            alert('Erro ao ler ou processar o arquivo de backup.');
            console.error(e);
        }
    };
    reader.readAsText(file);
}

// Helpers para formatação de datas e cálculo de parcelas individuais nos detalhes
function formatDateToBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function formatDateObjToBR(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

function getItemInstallmentsList(item) {
    if (!item.isInstallment || !item.bought || !item.installmentsTotal || item.installmentsTotal <= 0) {
        return [];
    }
    
    // CORREÇÃO DE TIMEZONE: Parse local de "YYYY-MM-DD" para evitar descompassos de fuso local
    let purchaseDate = null;
    if (item.purchaseDate) {
        const parts = item.purchaseDate.split('-');
        if (parts.length === 3) {
            purchaseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    }
    
    if (!purchaseDate || isNaN(purchaseDate.getTime())) {
        return [];
    }
    
    const today = new Date();
    const purchaseDay = purchaseDate.getDate();
    const parsedDueDay = parseInt(item.installmentDueDay);
    const parsedClosingDay = parseInt(item.installmentClosingDay || item.installmentDueDay);
    const startMonthOffset = (purchaseDay < parsedClosingDay) ? 0 : 1;
    
    const installments = [];
    const itemTotalPrice = (item.price || 0) * (item.quantity || 1);
    const installmentValue = Math.round((itemTotalPrice / item.installmentsTotal) * 100) / 100;
    
    for (let i = 1; i <= item.installmentsTotal; i++) {
        // Projeta a data de vencimento da parcela i
        const dueDate = new Date(
            purchaseDate.getFullYear(),
            purchaseDate.getMonth() + startMonthOffset + (i - 1),
            parsedDueDay
        );
        
        const compareDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isPaid = compareDueDate <= compareToday;
        
        let val = installmentValue;
        if (i === item.installmentsTotal) {
            const previousSum = installmentValue * (item.installmentsTotal - 1);
            val = Math.round((itemTotalPrice - previousSum) * 100) / 100;
        }

        installments.push({
            number: i,
            dueDate: dueDate,
            value: val,
            isPaid: isPaid
        });
    }
    
    return installments;
}

function toggleItemDetails(itemId) {
    if (expandedItemIds.has(itemId)) {
        expandedItemIds.delete(itemId);
    } else {
        expandedItemIds.add(itemId);
    }
    renderItems(); // Re-renderiza para atualizar o painel e os ícones
}

function renderItemDetailsContent(item, progress) {
    const itemTotalPrice = (item.price || 0) * (item.quantity || 1);
    
    // Formatar datas de criação e compra
    const createdDateStr = item.createdAt ? formatDateToBR(item.createdAt.split('T')[0]) : 'Não informada';
    const purchaseDateStr = item.purchaseDate ? formatDateToBR(item.purchaseDate) : 'Não informada';
    
    let financeSection = '';
    
    if (item.bought) {
        if (item.isInstallment) {
            const installments = getItemInstallmentsList(item);
            const percentPaid = Math.round((progress.paidInstallments / item.installmentsTotal) * 100);
            
            let installmentsHTML = '';
            installments.forEach(inst => {
                const dueDateStr = formatDateObjToBR(inst.dueDate);
                const statusBadge = inst.isPaid
                    ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <i class="fa-solid fa-circle-check"></i> PAGA
                       </span>`
                    : `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <i class="fa-solid fa-clock"></i> A VENCER
                       </span>`;
                
                installmentsHTML += `
                    <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between shadow-sm">
                        <div>
                            <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Parcela ${inst.number}/${item.installmentsTotal}</p>
                            <p class="text-[10px] text-slate-400 dark:text-slate-500">Vencimento: ${dueDateStr}</p>
                        </div>
                        <div class="text-right flex flex-col items-end gap-1">
                            <p class="text-xs font-extrabold text-slate-800 dark:text-slate-200">${formatCurrency(inst.value)}</p>
                            ${statusBadge}
                        </div>
                    </div>
                `;
            });
            
            financeSection = `
                <!-- Financeiro Parcelado -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100/60 dark:border-teal-900/20">
                    <div>
                        <h5 class="text-xs font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                            <i class="fa-solid fa-calculator text-xs"></i> Resumo do Parcelamento
                        </h5>
                        <ul class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <li class="flex justify-between"><span>Valor Total:</span> <strong class="text-slate-800 dark:text-slate-200">${formatCurrency(itemTotalPrice)}</strong></li>
                            <li class="flex justify-between"><span>Valor da Parcela:</span> <strong class="text-slate-800 dark:text-slate-200">${item.installmentsTotal}x de ${formatCurrency(itemTotalPrice / item.installmentsTotal)}</strong></li>
                            <li class="flex justify-between"><span>Dia de Vencimento:</span> <strong class="text-slate-800 dark:text-slate-200">Todo dia ${item.installmentDueDay}</strong></li>
                            <li class="flex justify-between"><span>Dia de Fechamento:</span> <strong class="text-slate-800 dark:text-slate-200">Todo dia ${item.installmentClosingDay || item.installmentDueDay}</strong></li>
                            <li class="flex justify-between border-t border-teal-100 dark:border-teal-900/40 pt-1.5 mt-1.5">
                                <span>Total Pago até Hoje:</span>
                                <strong class="text-emerald-600 dark:text-emerald-400 font-bold">${formatCurrency(progress.paidValue)} (${progress.paidInstallments} parc.)</strong>
                            </li>
                            <li class="flex justify-between">
                                <span>Restante a Pagar:</span>
                                <strong class="text-rose-500 dark:text-rose-400 font-bold">${formatCurrency(progress.remainingValue)} (${item.installmentsTotal - progress.paidInstallments} parc.)</strong>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="flex flex-col justify-between">
                        <div>
                            <h5 class="text-xs font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span>Progresso de Quitação</span>
                                <span class="font-extrabold text-teal-800 dark:text-teal-300">${percentPaid}%</span>
                            </h5>
                            <div class="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner mb-3">
                                <div class="bg-cyan-600 dark:bg-cyan-500 h-full rounded-full transition-all duration-500" style="width: ${percentPaid}%"></div>
                            </div>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                                Considera parcelas com vencimento igual ou anterior à data atual de hoje como pagas. Parcelas futuras permanecem em aberto.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Cronograma de Parcelas -->
                <div class="mt-4">
                    <h5 class="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <i class="fa-solid fa-calendar-days text-xs"></i> Cronograma de Parcelas
                    </h5>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-1.5">
                        ${installmentsHTML}
                    </div>
                </div>
            `;
        } else {
            // Comprado à vista
            financeSection = `
                <!-- Financeiro à Vista -->
                <div class="mt-4 p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h5 class="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <i class="fa-solid fa-circle-check text-xs"></i> Detalhes do Pagamento
                        </h5>
                        <ul class="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            <li class="flex justify-between"><span>Valor Pago:</span> <strong class="text-slate-800 dark:text-slate-200">${formatCurrency(itemTotalPrice)}</strong></li>
                            <li class="flex justify-between"><span>Forma de Pagamento:</span> <strong class="text-emerald-600 dark:text-emerald-400 font-bold">À Vista</strong></li>
                            <li class="flex justify-between"><span>Data de Compra:</span> <strong class="text-slate-800 dark:text-slate-200">${purchaseDateStr}</strong></li>
                        </ul>
                    </div>
                    <div class="flex items-center justify-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-100/40 dark:border-emerald-900/10 shadow-sm">
                        <div class="text-center">
                            <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider leading-none">Status de Quitação</p>
                            <p class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1 leading-none">
                                <i class="fa-solid fa-circle-check"></i> 100% Pago
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        // Planejamento de Compra (Não Comprado)
        financeSection = `
            <div class="mt-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/20 text-center">
                <p class="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center gap-1.5 mb-1">
                    <i class="fa-solid fa-circle-info text-sm"></i> Item em Planejamento
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-normal">
                    Este item ainda não foi comprado. Quando você o adquirir, marque o checkbox na lista para definir o valor, quantidade final e as condições de pagamento (à vista ou parcelado).
                </p>
            </div>
        `;
    }
    
    return `
        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 space-y-4 animate-fade-in text-left">
            <!-- Ficha Técnica Básica -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div class="flex items-center gap-2.5 text-xs">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <i class="fa-solid fa-calendar text-xs"></i>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">Cadastrado em</p>
                        <p class="font-semibold text-slate-700 dark:text-slate-200">${createdDateStr}</p>
                    </div>
                </div>
                
                ${item.bought ? `
                    <div class="flex items-center gap-2.5 text-xs">
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i class="fa-solid fa-cart-flatbed-suitcase text-xs"></i>
                        </div>
                        <div>
                            <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">Adquirido em</p>
                            <p class="font-semibold text-slate-700 dark:text-slate-200">${purchaseDateStr}</p>
                        </div>
                    </div>
                ` : ''}

                <div class="flex items-center gap-2.5 text-xs">
                    <div class="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <i class="fa-solid fa-cubes text-xs"></i>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">Quantidade</p>
                        <p class="font-semibold text-slate-700 dark:text-slate-200">${item.quantity || 1} unidade(s)</p>
                    </div>
                </div>
            </div>

            <!-- Observações / Notas Completas -->
            ${item.notes ? `
                <div class="mt-1 w-full">
                    <h5 class="text-[10px] sm:text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <i class="fa-solid fa-pen-clip text-[11px]"></i> Observações do Item
                    </h5>
                    <div class="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300 leading-normal whitespace-pre-line text-left shadow-sm w-full">${escapeHTML(item.notes)}</div>
                </div>
            ` : ''}

            <!-- Seção Financeira e Parcelamento -->
            ${financeSection}
        </div>
    `;
}

// Filter, Sort and Render Items List
function renderItems() {
    const listContainer = document.getElementById('items-list-container');
    const emptyState = document.getElementById('empty-state');
    
    // Clear list but keep empty state element reference
    const itemsNodes = listContainer.querySelectorAll('.item-card-element');
    itemsNodes.forEach(node => node.remove());

    // 1. Filter items based on filters (search, status, category)
    let filteredItems = items.filter(item => {
        // Search Filter
        const matchesSearch = item.name.toLowerCase().includes(searchQuery) || 
                              (item.notes && item.notes.toLowerCase().includes(searchQuery));
        
        // Status Filter
        let matchesStatus = true;
        if (currentStatusFilter === 'to-buy') {
            matchesStatus = !item.bought;
        } else if (currentStatusFilter === 'bought') {
            matchesStatus = item.bought;
        }

        // Category Filter
        const matchesCategory = currentCategoryFilter === 'all' || item.category === currentCategoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    // 2. Sort items
    filteredItems.sort((a, b) => {
        if (currentSort === 'date-desc') {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        } else if (currentSort === 'date-asc') {
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        } else if (currentSort === 'name-asc') {
            return a.name.localeCompare(b.name);
        } else if (currentSort === 'name-desc') {
            return b.name.localeCompare(a.name);
        } else if (currentSort === 'price-desc') {
            const priceA = (a.price || 0) * (a.quantity || 1);
            const priceB = (b.price || 0) * (b.quantity || 1);
            return priceB - priceA;
        } else if (currentSort === 'price-asc') {
            const priceA = (a.price || 0) * (a.quantity || 1);
            const priceB = (b.price || 0) * (b.quantity || 1);
            return priceA - priceB;
        }
        return 0;
    });

    // Update Showing Count label
    document.getElementById('filtered-count').textContent = `Mostrando ${filteredItems.length} de ${items.length} itens`;

    // 3. Render
    if (filteredItems.length === 0) {
        emptyState.classList.remove('hidden');
        if (items.length > 0) {
            emptyState.querySelector('h3').textContent = "Nenhum item correspondente";
            emptyState.querySelector('p').textContent = "Ajuste os filtros de pesquisa, categoria ou status para encontrar o que procura.";
        } else {
            emptyState.querySelector('h3').textContent = "Sua lista está vazia";
            emptyState.querySelector('p').textContent = "Adicione novos itens usando o formulário ao lado para começar a planejar e gerenciar suas compras de casa.";
        }
    } else {
        emptyState.classList.add('hidden');

        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.dataset.id = item.id;
            
            const isExpanded = expandedItemIds.has(item.id);
            
            // Layout vertical do card para suportar o painel expansível de detalhes
            if (item.bought) {
                card.className = "item-card-element item-card bg-emerald-50/35 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-150 dark:border-emerald-900/40 shadow-sm flex flex-col animate-slide-up transition-all hover:shadow-md opacity-85 hover:opacity-100";
            } else {
                card.className = "item-card-element item-card bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col animate-slide-up transition-all hover:shadow-md opacity-100";
            }
            
            // Adiciona destaque de ring ao card se ele estiver expandido
            if (isExpanded) {
                card.classList.add('ring-2', 'ring-cyan-500/20', 'dark:ring-cyan-400/30', 'shadow-md');
            }
            
            // Generate category emoji and tag style
            const catEmoji = getCategoryEmoji(item.category);
            const itemTotalPrice = (item.price || 0) * (item.quantity || 1);

            // Calcula o progresso do faturamento
            const progress = calculateInstallmentProgress(
                item.purchaseDate,
                item.installmentDueDay,
                item.installmentClosingDay,
                item.installmentsTotal,
                itemTotalPrice,
                item.bought,
                item.isInstallment
            );

            card.innerHTML = `
                <!-- Linha Principal Clickável para expansão -->
                <div class="flex items-start justify-between gap-3 w-full cursor-pointer" onclick="toggleItemDetails('${item.id}')">
                    <div class="flex items-start space-x-3 flex-grow min-w-0">
                        <!-- Checkbox (com stopPropagation e margem superior para alinhar perfeitamente com a primeira linha de texto) -->
                        <div class="flex items-center flex-shrink-0 mt-0.5" onclick="event.stopPropagation()">
                            <input type="checkbox" ${item.bought ? 'checked' : ''}
                                onclick="event.stopPropagation(); handleToggleBought('${item.id}')"
                                class="checkbox-custom w-6 h-6 text-emerald-600 bg-slate-100 rounded-lg border-slate-200 focus:ring-emerald-500/20 dark:bg-slate-700 dark:border-slate-600 cursor-pointer">
                        </div>

                        <!-- Nome e Notas do Item -->
                        <div class="min-w-0 flex-grow">
                            <h4 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate ${item.bought ? 'text-slate-400 dark:text-slate-500' : ''}">
                                ${escapeHTML(item.name)}
                            </h4>
                            ${item.notes ? `
                                <p class="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 max-w-[150px] xs:max-w-[200px] sm:max-w-md md:max-w-lg leading-tight">
                                    ${escapeHTML(item.notes)}
                                </p>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Lado Direito do Título (Apenas o Chevron de expansão no mobile para dar espaço total ao título) -->
                    <div class="flex items-center space-x-2 flex-shrink-0 mt-0.5" onclick="event.stopPropagation()">
                        <!-- Botão Chevron de Expansão -->
                        <button class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 ${isExpanded ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''}"
                            onclick="event.stopPropagation(); toggleItemDetails('${item.id}')"
                            title="${isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}">
                            <i class="fa-solid fa-chevron-down text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- Sublinha de Informações e Ações Rápidas (flex-col no celular empilha as seções verticalmente) -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-700/40 w-full animate-fade-in">
                    <!-- Linha 2 (Badges): Sempre na sua própria linha física independente no celular, alinhada à esquerda -->
                    <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto text-left">
                        <!-- Badge de Status (Sempre a primeira à esquerda, com largura fixa de 96px para alinhamento vertical das badges vizinhas) -->
                        <span class="inline-flex items-center justify-center gap-1 text-[10px] font-bold w-24 py-0.5 rounded-full flex-shrink-0 ${item.bought ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}">
                            <i class="fa-solid ${item.bought ? 'fa-circle-check' : 'fa-cart-shopping'} text-[9px]"></i>
                            <span>${item.bought ? 'COMPRADO' : 'A COMPRAR'}</span>
                        </span>

                        <!-- Categoria -->
                        <span class="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            ${catEmoji} ${item.category}
                        </span>
                        
                        <!-- Quantidade -->
                        ${item.quantity > 1 ? `
                            <span class="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                                ${item.quantity}x
                            </span>
                        ` : ''}

                        <!-- Badge de Parcelas -->
                        ${item.isInstallment && item.bought ? `
                            <span class="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center gap-1 whitespace-nowrap">
                                <i class="fa-solid fa-credit-card text-[9px]"></i> Parcela ${progress.paidInstallments}/${item.installmentsTotal}
                            </span>
                        ` : ''}
                    </div>

                    <!-- Linha 3 (Valores e Ações): Fica abaixo das badges no celular, e integrada horizontalmente no desktop -->
                    <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto" onclick="event.stopPropagation()">
                        <!-- Bloco de Preço (Sempre em sua linha separada abaixo das badges no celular, alinhado perfeitamente à esquerda com o checkbox/badges) -->
                        ${item.price > 0 ? `
                            ${item.isInstallment && item.bought ? `
                                <div class="text-left sm:text-right flex-shrink-0">
                                    <p class="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold leading-none">Parcelamento</p>
                                    <p class="text-xs font-extrabold text-teal-600 dark:text-teal-400 leading-normal mt-0.5 whitespace-nowrap">
                                        ${item.installmentsTotal}x de ${formatCurrency(itemTotalPrice / item.installmentsTotal)}
                                    </p>
                                </div>
                            ` : `
                                <div class="text-left sm:text-right flex-shrink-0">
                                    <p class="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold leading-none">Subtotal</p>
                                    <p class="text-xs font-extrabold text-slate-700 dark:text-slate-300 leading-normal mt-0.5 whitespace-nowrap">
                                        ${formatCurrency(itemTotalPrice)}
                                    </p>
                                </div>
                            `}
                        ` : ''}
                        <!-- Grupo de Ações (Editar e Excluir agrupados de forma próxima) -->
                        <div class="flex items-center gap-1 flex-shrink-0 ml-auto sm:ml-0">
                            <button onclick="event.stopPropagation(); showEditModal('${item.id}')"
                                class="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 dark:hover:text-cyan-400 rounded-xl transition-colors"
                                title="Editar Item">
                                <i class="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button onclick="event.stopPropagation(); handleDeleteItem('${item.id}')"
                                class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-xl transition-colors"
                                title="Excluir Item">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Seção Expandida de Detalhes -->
                <div id="details-${item.id}" class="${isExpanded ? 'block' : 'hidden'} w-full">
                    ${isExpanded ? renderItemDetailsContent(item, progress) : ''}
                </div>
            `;
            listContainer.appendChild(card);
        });
    }
}

// Helpers
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function getCategoryEmoji(category) {
    const emojis = {
        'Alimentação': '🍎',
        'Cozinha': '🍳',
        'Limpeza': '🧼',
        'Banheiro': '🚽',
        'Quarto': '🛏️',
        'Sala': '🛋️',
        'Eletrodomésticos': '🔌',
        'Reforma': '🔨',
        'Carro': '🚗',
        'Transporte': '🚌',
        'Contas': '💵',
        'Impostos': '🧾',
        'Roupas': '👕',
        'Lazer': '🍿',
        'Beleza': '💄',
        'Saúde': '💊',
        'Outros': '📦'
    };
    return emojis[category] || '📦';
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Show Toast Notification
let toastTimeout;
function showToast(message, iconName = 'circle-check', type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    // Set colors based on type
    let colorClass = 'text-emerald-400';
    if (type === 'warning') colorClass = 'text-red-400';
    if (type === 'info') colorClass = 'text-teal-400';

    toastIcon.innerHTML = `<i class="fa-solid fa-${iconName} ${colorClass} text-base"></i>`;
    toastMessage.textContent = message;

    // Reset timeout if already running
    clearTimeout(toastTimeout);

    // Show toast
    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    // Hide toast after 3 seconds
    toastTimeout = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
}
