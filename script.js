// ============ НАСТРОЙКИ ============
var INBOX_PASSWORD = 'mZciG12x';
var STORAGE_KEY = 'mc_shop_messages_v1';

// ============ ДАННЫЕ БОКСОВ ============
var boxes = [
    { name: 'ОБЫЧНЫЙ', emoji: '📦', price: 50, className: 'box-common',
      items: [
        { icon: '🍎', text: '32 яблока' },
        { icon: '🛡️', text: 'Полный сет железной брони' },
        { icon: '⛏️', text: 'Железная кирка' }
      ] },
    { name: 'РЕДКИЙ', emoji: '🎁', price: 100, className: 'box-rare',
      items: [
        { icon: '🥩', text: '32 стейка' },
        { icon: '💎', text: 'Полный сет алмазной брони' },
        { icon: '⚔️', text: 'Алмазный меч' }
      ] },
    { name: 'ЛЕГЕНДАРНЫЙ', emoji: '👑', price: 500, className: 'box-legendary',
      items: [
        { icon: '🖤', text: 'Полный сет незеритовой брони' },
        { icon: '🍏', text: '64 золотых яблока' },
        { icon: '🪽', text: 'Элитры' },
        { icon: '🐉', text: 'Голова дракона' },
        { icon: '🎆', text: '2 стака фейерверков' }
      ] }
];

var currentBox = null;
var messages = [];

// ============ КАНАЛ МЕЖДУ ВКЛАДКАМИ ============
var channel = null;
try {
    channel = new BroadcastChannel('mc_shop_channel');
    console.log('[MC Shop] BroadcastChannel активен');
} catch (e) {
    console.warn('[MC Shop] BroadcastChannel не поддерживается, только localStorage');
}

// ============ DOM ============
var boxesContainer = document.getElementById('boxesContainer');
var modalOverlay = document.getElementById('modalOverlay');
var modalTitle = document.getElementById('modalTitle');
var modalSub = document.getElementById('modalSub');
var nicknameInput = document.getElementById('nicknameInput');
var cancelBtn = document.getElementById('cancelBtn');
var payBtn = document.getElementById('payBtn');
var passwordOverlay = document.getElementById('passwordOverlay');
var passwordInput = document.getElementById('passwordInput');
var passwordCancel = document.getElementById('passwordCancel');
var passwordSubmit = document.getElementById('passwordSubmit');
var notificationsContainer = document.getElementById('notificationsContainer');
var inboxBtn = document.getElementById('inboxBtn');
var inboxBadge = document.getElementById('inboxBadge');
var inboxPanel = document.getElementById('inboxPanel');
var inboxClose = document.getElementById('inboxClose');
var inboxList = document.getElementById('inboxList');
var unreadCountEl = document.getElementById('unreadCount');
var readCountEl = document.getElementById('readCount');
var markAllBtn = document.getElementById('markAllBtn');

// ============ УТИЛИТЫ ============
function formatTime() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' +
           ('0' + d.getMinutes()).slice(-2) + ':' +
           ('0' + d.getSeconds()).slice(-2);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

function showNotification(title, body, type, duration) {
    type = type || 'info';
    duration = duration || 4000;
    var notif = document.createElement('div');
    notif.className = 'notif ' + type;
    notif.innerHTML =
        '<div class="notif-title">' + title + '</div>' +
        '<div class="notif-body">' + body + '</div>' +
        '<div class="notif-time">' + formatTime() + '</div>';
    notificationsContainer.appendChild(notif);
    requestAnimationFrame(function() { notif.classList.add('show'); });
    setTimeout(function() {
        notif.classList.remove('show');
        setTimeout(function() { notif.remove(); }, 400);
    }, duration);
}

// ============ ХРАНИЛИЩЕ ============
function loadMessagesFromStorage() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        messages = raw ? JSON.parse(raw) : [];
    } catch (e) { messages = []; }
}

function saveMessagesToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch (e) {}
}

// ============ СООБЩЕНИЯ ============
function addMessage(nickname, boxName, price, broadcast) {
    var msg = {
        id: Date.now() + Math.random(),
        nickname: nickname,
        boxName: boxName,
        price: price,
        time: formatTime(),
        read: false
    };
    messages.unshift(msg);
    saveMessagesToStorage();
    renderMessages();
    updateBadge();

    if (broadcast !== false && channel) {
        channel.postMessage({ type: 'new-message', msg: msg });
    }
}

function markAsRead(id) {
    var changed = false;
    for (var i = 0; i < messages.length; i++) {
        if (messages[i].id === id && !messages[i].read) {
            messages[i].read = true;
            changed = true;
            break;
        }
    }
    if (changed) {
        saveMessagesToStorage();
        renderMessages();
        updateBadge();
        if (channel) channel.postMessage({ type: 'update' });
    }
}

function markAllAsRead() {
    var changed = false;
    for (var i = 0; i < messages.length; i++) {
        if (!messages[i].read) { messages[i].read = true; changed = true; }
    }
    if (changed) {
        saveMessagesToStorage();
        renderMessages();
        updateBadge();
        if (channel) channel.postMessage({ type: 'update' });
    }
}

function updateBadge() {
    var unread = 0;
    for (var i = 0; i < messages.length; i++) if (!messages[i].read) unread++;
    if (unread > 0) {
        inboxBadge.textContent = unread > 99 ? '99+' : unread;
        inboxBadge.classList.remove('hidden');
    } else {
        inboxBadge.classList.add('hidden');
    }
}

function renderMessages() {
    var unread = 0;
    for (var i = 0; i < messages.length; i++) if (!messages[i].read) unread++;
    var read = messages.length - unread;
    unreadCountEl.textContent = unread;
    readCountEl.textContent = read;
    markAllBtn.disabled = unread === 0;

    if (messages.length === 0) {
        inboxList.innerHTML = '<div class="inbox-empty">📭 Пока нет сообщений.<br>Купите бокс — и здесь появятся уведомления о покупках.</div>';
        return;
    }

    var html = '';
    messages.forEach(function(msg, idx) {
        html += '<div class="msg-card ' + (msg.read ? 'read' : 'unread') + '" data-idx="' + idx + '">' +
            '<div class="msg-top">' +
                '<span class="msg-status ' + (msg.read ? 'read' : 'unread') + '">' +
                    (msg.read ? '✓ Прочитано' : '● Не прочитано') +
                '</span>' +
                '<span class="msg-time">' + msg.time + '</span>' +
            '</div>' +
            '<div class="msg-text">' +
                'Игрок <strong>' + escapeHtml(msg.nickname) + '</strong> купил ' +
                '<strong>' + escapeHtml(msg.boxName) + '</strong> бокс за ' +
                '<strong>' + msg.price + ' ₽</strong>.' +
            '</div>' +
            (msg.read ? '' : '<div class="msg-hint">Нажмите, чтобы отметить как прочитанное</div>') +
        '</div>';
    });
    inboxList.innerHTML = html;

    var cards = inboxList.querySelectorAll('.msg-card');
    for (var i = 0; i < cards.length; i++) {
        (function(card) {
            card.addEventListener('click', function() {
                var idx = parseInt(card.getAttribute('data-idx'), 10);
                if (messages[idx] && !messages[idx].read) markAsRead(messages[idx].id);
            });
        })(cards[i]);
    }
}

// ============ ОТРИСОВКА БОКСОВ ============
function renderBoxes() {
    var html = '';
    boxes.forEach(function(box, idx) {
        var itemsHtml = '';
        box.items.forEach(function(item) {
            itemsHtml += '<li><span class="item-icon">' + item.icon + '</span><span>' + item.text + '</span></li>';
        });
        html += '<div class="box-card ' + box.className + '">' +
            '<div class="box-emoji">' + box.emoji + '</div>' +
            '<div class="box-name">' + box.name + '</div>' +
            '<div class="box-price">' + box.price + ' ₽</div>' +
            '<ul class="loot-list">' + itemsHtml + '</ul>' +
            '<button class="buy-btn" data-buy-idx="' + idx + '">КУПИТЬ</button>' +
        '</div>';
    });
    boxesContainer.innerHTML = html;

    var buyBtns = boxesContainer.querySelectorAll('.buy-btn');
    for (var i = 0; i < buyBtns.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.getAttribute('data-buy-idx'), 10);
                if (boxes[idx]) openModal(boxes[idx]);
            });
        })(buyBtns[i]);
    }
}

// ============ МОДАЛКИ ============
function openModal(box) {
    currentBox = box;
    modalTitle.textContent = 'Покупка: ' + box.name;
    modalSub.innerHTML = 'Цена: <strong>' + box.price + ' ₽</strong>. Введите ваш ник, чтобы оплатить.';
    nicknameInput.value = '';
    nicknameInput.classList.remove('error');
    modalOverlay.classList.add('active');
    setTimeout(function() { nicknameInput.focus(); }, 100);
}

function closeModal() {
    modalOverlay.classList.remove('active');
    currentBox = null;
    nicknameInput.classList.remove('error');
}

function openPasswordModal() {
    passwordInput.value = '';
    passwordInput.classList.remove('error');
    passwordOverlay.classList.add('active');
    setTimeout(function() { passwordInput.focus(); }, 100);
}

function closePasswordModal() {
    passwordOverlay.classList.remove('active');
    passwordInput.classList.remove('error');
}

function checkPassword() {
    if (passwordInput.value === INBOX_PASSWORD) {
        closePasswordModal();
        inboxPanel.classList.add('open');
        showNotification('🔓 Доступ разрешён', 'Добро пожаловать в сообщения!', 'success', 2500);
    } else {
        passwordInput.classList.add('error');
        passwordInput.value = '';
        passwordInput.focus();
        showNotification('❌ Неверный пароль', 'Попробуйте ещё раз.', 'info', 2500);
    }
}

// ============ ОПЛАТА ============
function handlePayment() {
    if (!currentBox) return;
    var nickname = nicknameInput.value.trim();

    if (nickname.length < 3) {
        nicknameInput.classList.add('error');
        nicknameInput.focus();
        showNotification('⚠️ Ошибка', 'Ник должен содержать минимум 3 символа.', 'info', 2500);
        return;
    }
    if (/\s/.test(nickname)) {
        nicknameInput.classList.add('error');
        nicknameInput.focus();
        showNotification('⚠️ Ошибка', 'Ник не должен содержать пробелов.', 'info', 2500);
        return;
    }

    var box = currentBox;
    closeModal();

    showNotification(
        '✅ Оплата прошла!',
        'Вы купили <strong>' + box.name + '</strong> бокс за <strong>' + box.price + ' ₽</strong>.<br>Ник: <strong>' + escapeHtml(nickname) + '</strong>',
        'success', 5000
    );
    showNotification(
        '🛒 Новая покупка!',
        'Игрок <strong>' + escapeHtml(nickname) + '</strong> купил <strong>' + box.name + '</strong> бокс за <strong>' + box.price + ' ₽</strong>!',
        'purchase', 6000
    );

    addMessage(nickname, box.name, box.price, true);
}

// ============ ПРИЁМ ИЗ ДРУГИХ ВКЛАДОК ============
if (channel) {
    channel.onmessage = function(event) {
        var data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'new-message') {
            var incoming = data.msg;
            var exists = false;
            for (var i = 0; i < messages.length; i++) {
                if (messages[i].id === incoming.id) { exists = true; break; }
            }
            if (!exists) {
                messages.unshift(incoming);
                saveMessagesToStorage();
                renderMessages();
                updateBadge();
                showNotification(
                    '📬 Новая покупка!',
                    'Игрок <strong>' + escapeHtml(incoming.nickname) + '</strong> купил <strong>' + escapeHtml(incoming.boxName) + '</strong> бокс за <strong>' + incoming.price + ' ₽</strong>!',
                    'purchase', 6000
                );
            }
        } else if (data.type === 'update') {
            loadMessagesFromStorage();
            renderMessages();
            updateBadge();
        }
    };
}

// Резервная синхронизация через localStorage
window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY) {
        loadMessagesFromStorage();
        renderMessages();
        updateBadge();
    }
});

// ============ СТАРТ ============
window.addEventListener('DOMContentLoaded', function() {
    loadMessagesFromStorage();
    renderBoxes();
    renderMessages();
    updateBadge();

    cancelBtn.addEventListener('click', closeModal);
    payBtn.addEventListener('click', handlePayment);

    nicknameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); handlePayment(); }
    });
    nicknameInput.addEventListener('input', function() {
        nicknameInput.classList.remove('error');
    });

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeModal();
    });

    inboxBtn.addEventListener('click', openPasswordModal);
    inboxClose.addEventListener('click', function() {
        inboxPanel.classList.remove('open');
    });
    markAllBtn.addEventListener('click', markAllAsRead);

    passwordCancel.addEventListener('click', closePasswordModal);
    passwordSubmit.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); checkPassword(); }
    });
    passwordInput.addEventListener('input', function() {
        passwordInput.classList.remove('error');
    });
    passwordOverlay.addEventListener('click', function(e) {
        if (e.target === passwordOverlay) closePasswordModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (modalOverlay.classList.contains('active')) closeModal();
            if (passwordOverlay.classList.contains('active')) closePasswordModal();
        }
    });

    setTimeout(function() {
        showNotification('🎮 Добро пожаловать!', 'Выберите бокс и нажмите «КУПИТЬ».', 'info', 3500);
    }, 500);
});
