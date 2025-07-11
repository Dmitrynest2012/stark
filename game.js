document.addEventListener('DOMContentLoaded', async () => {
    let config;
    try {
        const response = await fetch('config.json');
        config = await response.json();
        console.log('Конфиг загружен:', config);
    } catch (error) {
        console.error('Ошибка загрузки конфига:', error);
        config = {
            initialState: {
                currentEnergy: 100,
                currentExp: 0,
                level: 1,
                money: 0
            },
            click: {
                energyCost: 5
            },
            energyRegen: {
                ratePerSecond: 0.5
            },
            levels: Array.from({ length: 24 }, (_, i) => ({
                maxEnergy: 100 + i * 10,
                maxExp: 100 * Math.pow(1.5, i),
                maxMoney: 1000 + i * 500,
                moneyGain: 10 + i * 2,
                expGain: 5 + i
            })),
            stocks: [
                { name: "Stark Industries", maxLevel: 10, baseCost: 100, costMultiplier: 2, passiveIncome: 10, requiredStocks: [] },
                { name: "Tesla", maxLevel: 10, baseCost: 200, costMultiplier: 2.5, passiveIncome: 20, requiredStocks: [{ name: "Stark Industries", level: 3 }] },
                { name: "Apple", maxLevel: 10, baseCost: 300, costMultiplier: 3, passiveIncome: 30, requiredStocks: [{ name: "Tesla", level: 2 }] }
            ],
            crypto: [
                { name: "Bitcoin", maxLevel: 10, baseCost: 150, costMultiplier: 2.2, passiveIncome: 15, requiredCrypto: [] },
                { name: "Ethereum", maxLevel: 10, baseCost: 250, costMultiplier: 2.7, passiveIncome: 25, requiredCrypto: [{ name: "Bitcoin", level: 2 }] }
            ],
            deposits: [
                { name: "Кошелек", maxLevel: 5, baseCost: 500, costMultiplier: 2, maxMoneyIncrease: 1000 },
                { name: "Банковская ячейка", maxLevel: 5, baseCost: 1000, costMultiplier: 3, maxMoneyIncrease: 2000 }
            ],
            equipment: [
                { name: "Дуговой реактор", maxLevel: 10, baseCost: 300, costMultiplier: 2.5, requiredEquipment: [] },
                { name: "Репульсорные модули", maxLevel: 10, baseCost: 400, costMultiplier: 3, requiredEquipment: [{ name: "Дуговой реактор", level: 2 }] },
                { name: "Гидравлика", maxLevel: 10, baseCost: 500, costMultiplier: 3.5, requiredEquipment: [{ name: "Репульсорные модули", level: 2 }] }
            ],
            boosters: [
                { name: "Кофе", cost: 50, duration: 10, energyRegenMultiplier: 2 },
                { name: "Пончик", cost: 100, duration: 15, energyRegenMultiplier: 3 }
            ]
        };
    }

    const gameState = {
        currentEnergy: config.initialState.currentEnergy,
        maxEnergy: config.levels[0].maxEnergy,
        currentExp: config.initialState.currentExp,
        maxExp: config.levels[0].maxExp,
        level: config.initialState.level,
        maxLevel: config.levels.length,
        money: config.initialState.money,
        maxMoney: config.levels[0].maxMoney,
        stocks: config.stocks.map(stock => ({ ...stock, currentLevel: 0 })),
        crypto: config.crypto.map(crypto => ({ ...crypto, currentLevel: 0 })),
        deposits: config.deposits.map(deposit => ({ ...deposit, currentLevel: 0 })),
        equipment: config.equipment.map(equip => ({ ...equip, currentLevel: 0 })),
        activeBooster: null,
        boosterEndTime: 0
    };

    const avatar = document.getElementById('avatar');
    const energyRing = document.querySelector('.energy-ring');
    const stats = {
        currentEnergy: document.getElementById('currentEnergy'),
        maxEnergy: document.getElementById('maxEnergy'),
        currentExp: document.getElementById('currentExp'),
        maxExp: document.getElementById('maxExp'),
        level: document.getElementById('level'),
        maxLevel: document.getElementById('maxLevel'),
        money: document.getElementById('money'),
        maxMoney: document.getElementById('maxMoney'),
        totalIncome: document.getElementById('totalIncome'),
        suitProgress: document.getElementById('suitProgress'),
        questStage: document.getElementById('questStage')
    };

    function formatMoney(value) {
        if (value >= 1000000) return `${Math.round(value / 1000000 * 100) / 100} млн $`;
        if (value >= 1000) return `${Math.round(value / 1000 * 100) / 100} тыс $`;
        return `${Math.round(value * 100) / 100} $`;
    }

    function getEquipmentStatus(level) {
        if (level === 0) return "Не начато";
        if (level <= 1) return "Проектирование";
        if (level <= 3) return "Сумбурные тесты";
        if (level <= 5) return "Реальные тесты";
        if (level <= 7) return "Батончики спрячем на потом";
        if (level <= 9) return "Рабочий прототип";
        return "Готово";
    }

    function updateSuitProgress() {
        const totalLevels = gameState.equipment.reduce((sum, equip) => sum + equip.currentLevel, 0);
        const maxLevels = gameState.equipment.length * 10;
        const progress = Math.round((totalLevels / maxLevels) * 100);
        stats.suitProgress.textContent = `${progress}%`;

        const stages = [
            { name: "Проектирование", minLevel: 1 },
            { name: "Сумбурные тесты", minLevel: 2 },
            { name: "Реальные тесты", minLevel: 4 },
            { name: "Батончики спрячем на потом", minLevel: 6 },
            { name: "Рабочий прототип", minLevel: 8 },
            { name: "Готово", minLevel: 10 }
        ];

        let currentStage = "Не начато";
        for (const stage of stages) {
            if (gameState.equipment.every(equip => equip.currentLevel >= stage.minLevel)) {
                currentStage = stage.name;
            } else {
                break;
            }
        }
        stats.questStage.textContent = currentStage;
    }

    function updateUI() {
        stats.currentEnergy.textContent = Math.floor(gameState.currentEnergy);
        stats.maxEnergy.textContent = gameState.maxEnergy;
        stats.currentExp.textContent = Math.floor(gameState.currentExp);
        stats.maxExp.textContent = Math.floor(gameState.maxExp);
        stats.level.textContent = gameState.level;
        stats.maxLevel.textContent = gameState.maxLevel;
        stats.money.textContent = formatMoney(gameState.money);
        stats.maxMoney.textContent = formatMoney(gameState.maxMoney);
        stats.totalIncome.textContent = formatMoney(
            gameState.stocks.reduce((sum, stock) => sum + (stock.currentLevel > 0 ? stock.passiveIncome * stock.currentLevel : 0), 0) +
            gameState.crypto.reduce((sum, crypto) => sum + (crypto.currentLevel > 0 ? crypto.passiveIncome * crypto.currentLevel : 0), 0)
        ) + '/с';
        energyRing.style.setProperty('--energy-percentage', `${(gameState.currentEnergy / gameState.maxEnergy) * 100}%`);
        updateStocks();
        updateCrypto();
        updateDeposits();
        updateEquipment();
        updateBoostersTime();
        updateSuitProgress();
    }

    function levelUp() {
        if (gameState.currentExp >= gameState.maxExp && gameState.level < gameState.maxLevel) {
            gameState.level++;
            gameState.currentExp -= gameState.maxExp;
            const levelIndex = gameState.level - 1;
            gameState.maxExp = config.levels[levelIndex].maxExp;
            gameState.maxEnergy = config.levels[levelIndex].maxEnergy;
            gameState.maxMoney = config.levels[levelIndex].maxMoney + gameState.deposits.reduce((sum, deposit) => sum + deposit.currentLevel * deposit.maxMoneyIncrease, 0);
            gameState.currentEnergy = gameState.maxEnergy;
        } else if (gameState.level === gameState.maxLevel) {
            gameState.currentExp = Math.min(gameState.currentExp, gameState.maxExp);
        }
    }

    avatar.addEventListener('click', () => {
        if (gameState.currentEnergy >= config.click.energyCost) {
            gameState.currentEnergy -= config.click.energyCost;
            const levelIndex = gameState.level - 1;
            gameState.money = Math.min(gameState.money + config.levels[levelIndex].moneyGain, gameState.maxMoney);
            gameState.currentExp += config.levels[levelIndex].expGain;
            levelUp();
            updateUI();
        }
    });

    setInterval(() => {
        const currentTime = Date.now() / 1000;
        let energyRegenRate = config.energyRegen.ratePerSecond;
        if (gameState.activeBooster && currentTime < gameState.boosterEndTime) {
            energyRegenRate *= gameState.activeBooster.energyRegenMultiplier;
        } else if (gameState.activeBooster) {
            gameState.activeBooster = null;
            gameState.boosterEndTime = 0;
            updateBoosters();
        }
        if (gameState.currentEnergy < gameState.maxEnergy) {
            gameState.currentEnergy = Math.min(gameState.currentEnergy + energyRegenRate, gameState.maxEnergy);
        }
        gameState.money = Math.min(gameState.money + 
            gameState.stocks.reduce((sum, stock) => sum + (stock.currentLevel > 0 ? stock.passiveIncome * stock.currentLevel : 0), 0) +
            gameState.crypto.reduce((sum, crypto) => sum + (crypto.currentLevel > 0 ? crypto.passiveIncome * crypto.currentLevel : 0), 0), 
            gameState.maxMoney
        );
        updateUI();
    }, 1000);

    // Tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabContent = document.getElementById(button.dataset.tab);
            if (tabContent) {
                tabContent.classList.add('active');
                if (button.dataset.tab === 'exchange') {
                    document.querySelector('.sub-tab-button[data-sub-tab="stocks"]').click();
                } else if (button.dataset.tab === 'assets') {
                    document.querySelector('.sub-tab-button[data-sub-tab="deposits"]').click();
                } else if (button.dataset.tab === 'boosters') {
                    document.querySelector('.sub-tab-button[data-sub-tab="boosters"]').click();
                    console.log('Вкладка Бустеры открыта');
                }
            }
        });
    });

    const subTabButtons = document.querySelectorAll('.sub-tab-button');
    const subTabContents = document.querySelectorAll('.sub-tab-content');
    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!button.disabled) {
                const parentTab = button.closest('.tab-content');
                if (!parentTab) return;
                const subTabs = parentTab.querySelectorAll('.sub-tab-button');
                const subContents = parentTab.querySelectorAll('.sub-tab-content');
                subTabs.forEach(btn => btn.classList.remove('active'));
                subContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const subTabContent = parentTab.querySelector(`#${button.dataset.subTab}`);
                if (subTabContent) {
                    subTabContent.classList.add('active');
                    if (button.dataset.subTab === 'boosters') {
                        console.log('Открыта подвкладка Бустеры, вызываем updateBoosters');
                        requestAnimationFrame(() => updateBoosters());
                    } else if (button.dataset.subTab === 'equipment') {
                        console.log('Открыта подвкладка Оборудование, вызываем updateEquipment');
                        requestAnimationFrame(() => updateEquipment());
                    }
                }
            }
        });
    });

    // Function to clear active class from all cards in a container
    function clearActiveCards(container) {
        if (container) {
            container.querySelectorAll('.card').forEach(card => {
                card.classList.remove('active');
                card.style.animation = 'none';
            });
        }
    }

    // Animation for cards
    function animateCard(card) {
        card.style.animation = 'none';
        card.querySelector('::before').style.animation = 'gradientPulse 3s ease-in-out infinite';
    }

    // Stocks
    function updateStocks() {
        const stocksContainer = document.getElementById('stocks-container');
        if (!stocksContainer) return;
        stocksContainer.innerHTML = '';
        gameState.stocks.forEach((stock, index) => {
            const cost = stock.currentLevel === 0 ? stock.baseCost : stock.baseCost * Math.pow(stock.costMultiplier, stock.currentLevel);
            const canUpgrade = gameState.money >= cost && stock.currentLevel < stock.maxLevel && stock.requiredStocks.every(req => {
                const reqStock = gameState.stocks.find(s => s.name === req.name);
                return reqStock && reqStock.currentLevel >= req.level;
            });
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            card.innerHTML = `
                <h3>${stock.name}</h3>
                <p>Уровень: ${stock.currentLevel}/${stock.maxLevel}</p>
                <p>Доход: ${stock.passiveIncome * stock.currentLevel} $/с</p>
                <p>Стоимость: ${formatMoney(cost)}</p>
                <button ${canUpgrade ? 'class="active"' : 'disabled'}>${stock.currentLevel === 0 ? 'Приобрести' : 'Улучшить'}</button>
            `;
            card.addEventListener('click', () => {
                clearActiveCards(stocksContainer);
                card.classList.add('active');
                animateCard(card);
                console.log('Клик по карточке:', index);
            });
            card.addEventListener('mouseover', () => {
                if (!card.classList.contains('active')) {
                    animateCard(card);
                }
            });
            card.addEventListener('mouseout', () => {
                if (!card.classList.contains('active')) {
                    card.style.animation = 'none';
                    card.querySelector('::before').style.animation = 'none';
                }
            });
            card.querySelector('button').addEventListener('click', () => {
                if (canUpgrade) {
                    gameState.money -= cost;
                    stock.currentLevel++;
                    updateUI();
                }
            });
            stocksContainer.appendChild(card);
        });
    }

    // Crypto
    function updateCrypto() {
        const cryptoContainer = document.getElementById('crypto-container');
        if (!cryptoContainer) return;
        cryptoContainer.innerHTML = '';
        gameState.crypto.forEach((crypto, index) => {
            const cost = crypto.currentLevel === 0 ? crypto.baseCost : crypto.baseCost * Math.pow(crypto.costMultiplier, crypto.currentLevel);
            const canUpgrade = gameState.money >= cost && crypto.currentLevel < crypto.maxLevel && crypto.requiredCrypto.every(req => {
                const reqCrypto = gameState.crypto.find(c => c.name === req.name);
                return reqCrypto && reqCrypto.currentLevel >= req.level;
            });
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            card.innerHTML = `
                <h3>${crypto.name}</h3>
                <p>Уровень: ${crypto.currentLevel}/${crypto.maxLevel}</p>
                <p>Доход: ${crypto.passiveIncome * crypto.currentLevel} $/с</p>
                <p>Стоимость: ${formatMoney(cost)}</p>
                <button ${canUpgrade ? 'class="active"' : 'disabled'}>${crypto.currentLevel === 0 ? 'Приобрести' : 'Улучшить'}</button>
            `;
            card.addEventListener('click', () => {
                clearActiveCards(cryptoContainer);
                card.classList.add('active');
                animateCard(card);
                console.log('Клик по карточке:', index);
            });
            card.addEventListener('mouseover', () => {
                if (!card.classList.contains('active')) {
                    animateCard(card);
                }
            });
            card.addEventListener('mouseout', () => {
                if (!card.classList.contains('active')) {
                    card.style.animation = 'none';
                    card.querySelector('::before').style.animation = 'none';
                }
            });
            card.querySelector('button').addEventListener('click', () => {
                if (canUpgrade) {
                    gameState.money -= cost;
                    crypto.currentLevel++;
                    updateUI();
                }
            });
            cryptoContainer.appendChild(card);
        });
    }

    // Deposits
    function updateDeposits() {
        const depositsContainer = document.getElementById('deposits-container');
        if (!depositsContainer) return;
        depositsContainer.innerHTML = '';
        gameState.deposits.forEach((deposit, index) => {
            const cost = deposit.currentLevel === 0 ? deposit.baseCost : deposit.baseCost * Math.pow(deposit.costMultiplier, deposit.currentLevel);
            const canUpgrade = gameState.money >= cost && deposit.currentLevel < deposit.maxLevel;
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            card.innerHTML = `
                <h3>${deposit.name}</h3>
                <p>Уровень: ${deposit.currentLevel}/${deposit.maxLevel}</p>
                <p>Бонус: ${formatMoney(deposit.currentLevel * deposit.maxMoneyIncrease)}</p>
                <p>Стоимость: ${formatMoney(cost)}</p>
                <button ${canUpgrade ? 'class="active"' : 'disabled'}>${deposit.currentLevel === 0 ? 'Приобрести' : 'Улучшить'}</button>
            `;
            card.addEventListener('click', () => {
                clearActiveCards(depositsContainer);
                card.classList.add('active');
                animateCard(card);
                console.log('Клик по карточке:', index);
            });
            card.addEventListener('mouseover', () => {
                if (!card.classList.contains('active')) {
                    animateCard(card);
                }
            });
            card.addEventListener('mouseout', () => {
                if (!card.classList.contains('active')) {
                    card.style.animation = 'none';
                    card.querySelector('::before').style.animation = 'none';
                }
            });
            card.querySelector('button').addEventListener('click', () => {
                if (canUpgrade) {
                    gameState.money -= cost;
                    deposit.currentLevel++;
                    gameState.maxMoney = config.levels[gameState.level - 1].maxMoney + gameState.deposits.reduce((sum, dep) => sum + dep.currentLevel * dep.maxMoneyIncrease, 0);
                    updateUI();
                }
            });
            depositsContainer.appendChild(card);
        });
    }

    // Equipment
    function updateEquipment() {
        const equipmentContainer = document.getElementById('equipment-container');
        if (!equipmentContainer) return;
        equipmentContainer.innerHTML = '';
        gameState.equipment.forEach((equip, index) => {
            const cost = equip.currentLevel === 0 ? equip.baseCost : equip.baseCost * Math.pow(equip.costMultiplier, equip.currentLevel);
            const canUpgrade = gameState.money >= cost && equip.currentLevel < equip.maxLevel && equip.requiredEquipment.every(req => {
                const reqEquip = gameState.equipment.find(e => e.name === req.name);
                return reqEquip && reqEquip.currentLevel >= req.level;
            });
            const status = getEquipmentStatus(equip.currentLevel);
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            card.innerHTML = `
                <h3>${equip.name}</h3>
                <p>Уровень: ${equip.currentLevel}/${equip.maxLevel}</p>
                <p>Статус: ${status}</p>
                <p>Стоимость: ${formatMoney(cost)}</p>
                <button ${canUpgrade ? 'class="active"' : 'disabled'}>${equip.currentLevel === 0 ? 'Приобрести' : 'Улучшить'}</button>
            `;
            card.addEventListener('click', () => {
                clearActiveCards(equipmentContainer);
                card.classList.add('active');
                animateCard(card);
                console.log('Клик по карточке:', index);
            });
            card.addEventListener('mouseover', () => {
                if (!card.classList.contains('active')) {
                    animateCard(card);
                }
            });
            card.addEventListener('mouseout', () => {
                if (!card.classList.contains('active')) {
                    card.style.animation = 'none';
                    card.querySelector('::before').style.animation = 'none';
                }
            });
            card.querySelector('button').addEventListener('click', () => {
                if (canUpgrade) {
                    gameState.money -= cost;
                    equip.currentLevel++;
                    updateUI();
                }
            });
            equipmentContainer.appendChild(card);
        });
    }

    // Boosters
    function updateBoosters() {
        const boostersContainer = document.getElementById('boosters-container');
        if (!boostersContainer) {
            console.error('Контейнер бустеров не найден');
            return;
        }
        boostersContainer.innerHTML = '';
        if (!config.boosters || config.boosters.length === 0) {
            console.error('Бустеры отсутствуют в конфиге:', config.boosters);
            return;
        }
        console.log('Обновляем бустеры:', config.boosters);
        config.boosters.forEach((booster, index) => {
            const currentTime = Date.now() / 1000;
            const canBuy = gameState.money >= booster.cost && !gameState.activeBooster;
            const timeLeft = gameState.activeBooster && gameState.activeBooster.name === booster.name && currentTime < gameState.boosterEndTime ? Math.ceil(gameState.boosterEndTime - currentTime) : 0;
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.boosterName = booster.name;
            card.dataset.index = index;
            card.innerHTML = `
                <h3>${booster.name}</h3>
                <p>Буст: x${booster.energyRegenMultiplier}</p>
                <p class="booster-time">Время: ${timeLeft > 0 ? timeLeft + 'с' : booster.duration + 'с'}</p>
                <p>Стоимость: ${formatMoney(booster.cost)}</p>
                <button ${canBuy ? 'class="active"' : 'disabled'}>Купить</button>
            `;
            card.addEventListener('click', () => {
                clearActiveCards(boostersContainer);
                card.classList.add('active');
                animateCard(card);
                console.log('Клик по карточке:', index);
            });
            card.addEventListener('mouseover', () => {
                if (!card.classList.contains('active')) {
                    animateCard(card);
                }
            });
            card.addEventListener('mouseout', () => {
                if (!card.classList.contains('active')) {
                    card.style.animation = 'none';
                    card.querySelector('::before').style.animation = 'none';
                }
            });
            card.querySelector('button').addEventListener('click', () => {
                if (canBuy) {
                    gameState.money -= booster.cost;
                    gameState.activeBooster = booster;
                    gameState.boosterEndTime = currentTime + booster.duration;
                    updateBoosters();
                    updateUI();
                }
            });
            boostersContainer.appendChild(card);
        });
        requestAnimationFrame(() => {
            boostersContainer.style.display = 'flex';
            boostersContainer.style.visibility = 'visible';
            boostersContainer.style.opacity = '1';
        });
    }

    // Обновление времени и состояния кнопок бустеров
    function updateBoostersTime() {
        const boostersContainer = document.getElementById('boosters-container');
        if (!boostersContainer) return;
        if (!document.querySelector('.tab-content.active #boosters.active')) return;
        const currentTime = Date.now() / 1000;
        config.boosters.forEach(booster => {
            const card = boostersContainer.querySelector(`.card[data-booster-name="${booster.name}"]`);
            if (card) {
                const timeLeft = gameState.activeBooster && gameState.activeBooster.name === booster.name && currentTime < gameState.boosterEndTime ? Math.ceil(gameState.boosterEndTime - currentTime) : 0;
                const timeElement = card.querySelector('.booster-time');
                if (timeElement) {
                    timeElement.textContent = `Время: ${timeLeft > 0 ? timeLeft + 'с' : booster.duration + 'с'}`;
                }
                const button = card.querySelector('button');
                const canBuy = gameState.money >= booster.cost && !gameState.activeBooster;
                button.disabled = !canBuy;
                button.classList.toggle('active', canBuy);
                console.log(`Обновлено состояние кнопки для ${booster.name}: canBuy=${canBuy}, money=${gameState.money}`);
            }
        });
    }

    // Initial UI setup
    updateUI();
    updateBoosters();
    document.querySelector('.tab-button[data-tab="exchange"]').click();
});