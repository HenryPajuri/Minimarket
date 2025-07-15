import { signup, login, logout, me, getConversations, getMessages, sendMessage, getUnreadCount } from "../utils/api.js";

let isLoggedIn = false;
let currentUser = null;
let currentChatUserId = null;
let currentProductId = null;
let conversations = [];


function getTurnstileToken() {
  let token = latestToken || window.latestToken || "";


  if (!token && window.turnstileWidgetId && window.turnstile) {
    try {
      token = window.turnstile.getResponse(window.turnstileWidgetId);
    } catch (e) {
    }
  }

  return token;
}


const navUser = document.getElementById("navUser");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const unreadCount = document.getElementById("unreadCount");
const refreshBtn = document.getElementById("refreshBtn");
const conversationsList = document.getElementById("conversationsList");
const chatInterface = document.getElementById("chatInterface");
const activeChat = document.getElementById("activeChat");
const closeChatBtn = document.getElementById("closeChatBtn");
const messagesList = document.getElementById("messagesList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const chatUserName = document.getElementById("chatUserName");
const chatProductInfo = document.getElementById("chatProductInfo");
const chatAvatar = document.getElementById("chatAvatar");
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showLoginTab = document.getElementById("showLogin");
const showSignupTab = document.getElementById("showSignup");
const closeModalBtn = document.getElementById("closeModal");
const startConversationModal = document.getElementById("startConversationModal");
const closeStartConversationModal = document.getElementById("closeStartConversationModal");
const startConversationForm = document.getElementById("startConversationForm");
const initialMessage = document.getElementById("initialMessage");

function showLoggedInUI(user) {
  isLoggedIn = true;
  currentUser = user;
  navUser.textContent = `Hi, ${user.name || "User"}`;
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  updateUnreadCount();
}

function showLoggedOutUI() {
  isLoggedIn = false;
  currentUser = null;
  navUser.textContent = "";
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  unreadCount.classList.add("hidden");
}

function getAvatarLetter(name) {
  return name ? name[0].toUpperCase() : "?";
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Today";
  if (diffDays === 2) return "Yesterday";
  if (diffDays < 7) return `${diffDays - 1} days ago`;
  return date.toLocaleDateString();
}

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function updateUnreadCount() {
  if (!isLoggedIn) return;
  try {
    const { count } = await getUnreadCount();
    if (count > 0) {
      unreadCount.textContent = `${count} unread`;
      unreadCount.classList.remove("hidden");
    } else {
      unreadCount.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error updating unread count:", err);
  }
}

async function loadConversations() {
  if (!isLoggedIn) {
    conversationsList.innerHTML = `
      <div class="empty-state">
        <h3>Please log in</h3>
        <p>You need to log in to see your messages.</p>
      </div>
    `;
    return;
  }

  conversationsList.innerHTML = '<div class="loading">Loading conversations...</div>';

  try {
    conversations = await getConversations();

    if (conversations.length === 0) {
      conversationsList.innerHTML = `
        <div class="empty-state">
          <h3>No conversations yet</h3>
          <p>Start browsing <a href="/html/index.html" style="color: #4bb6ac;">items</a> to message sellers!</p>
        </div>
      `;
      return;
    }

    conversationsList.innerHTML = "";

    conversations.forEach(conv => {
      const item = document.createElement("div");
      item.className = `conversation-item ${conv.unreadCount > 0 ? "unread" : ""}`;
      item.dataset.userId = conv.otherUser.id;

      const avatar = getAvatarLetter(conv.otherUser.name);
      const timeAgo = formatTime(conv.lastMessage.createdAt);
      const isFromMe = conv.lastMessage.sender === currentUser.id;
      const preview = isFromMe ? `You: ${conv.lastMessage.content}` : conv.lastMessage.content;

      item.innerHTML = `
        <div class="conversation-avatar">${avatar}</div>
        <div class="conversation-info">
          <div class="conversation-name">${conv.otherUser.name}</div>
          <div class="conversation-preview">${preview}</div>
        </div>
        <div class="conversation-meta">
          <div class="conversation-time">${timeAgo}</div>
          ${conv.unreadCount > 0 ? `<div class="conversation-unread">${conv.unreadCount}</div>` : ""}
        </div>
        ${conv.product ? `<div class="conversation-product">${conv.product.name}</div>` : ""}
      `;

      item.addEventListener("click", () => openChat(conv.otherUser.id, conv.otherUser.name, conv.product));
      conversationsList.appendChild(item);
    });

  } catch (err) {
    console.error("Error loading conversations:", err);
    conversationsList.innerHTML = '<div class="loading">Error loading conversations</div>';
  }
}

async function openChat(userId, userName, product = null) {
  currentChatUserId = userId;
  currentProductId = product?.id || null;

  document.querySelectorAll(".conversation-item").forEach(item => {
    item.classList.remove("active");
  });
  document.querySelector(`[data-user-id="${userId}"]`)?.classList.add("active");

  chatInterface.classList.add("hidden");
  activeChat.classList.remove("hidden");

  chatUserName.textContent = userName;
  chatAvatar.textContent = getAvatarLetter(userName);

  if (product) {
    chatProductInfo.textContent = `About: ${product.name}`;
    chatProductInfo.classList.remove("hidden");
  } else {
    chatProductInfo.classList.add("hidden");
  }

  await loadMessages(userId);
  messageInput.focus();
}

async function loadMessages(userId) {
  messagesList.innerHTML = '<div class="loading">Loading messages...</div>';

  try {
    const { messages } = await getMessages(userId);

    if (messages.length === 0) {
      messagesList.innerHTML = '<div class="empty-state">Start the conversation!</div>';
      return;
    }

    messagesList.innerHTML = "";

    messages.forEach(msg => {
      const item = document.createElement("div");
      item.className = `message-item ${msg.sender._id === currentUser.id ? "sent" : "received"}`;

      const time = formatMessageTime(msg.createdAt);

      item.innerHTML = `
        <div class="message-bubble">${msg.content}</div>
        <div class="message-time">${time}</div>
      `;

      messagesList.appendChild(item);
    });

    messagesList.scrollTop = messagesList.scrollHeight;

  } catch (err) {
    console.error("Error loading messages:", err);
    messagesList.innerHTML = '<div class="loading">Error loading messages</div>';
  }
}

async function sendNewMessage(content, recipientId, productId = null) {
  try {
    const message = await sendMessage({
      recipient: recipientId,
      content,
      productId
    });

    const item = document.createElement("div");
    item.className = "message-item sent";
    const time = formatMessageTime(new Date());

    item.innerHTML = `
      <div class="message-bubble">${content}</div>
      <div class="message-time">${time}</div>
    `;

    messagesList.appendChild(item);
    messagesList.scrollTop = messagesList.scrollHeight;

    await loadConversations();

    return message;
  } catch (err) {
    console.error("Error sending message:", err);
    throw err;
  }
}

function toggleTab(mode = "login") {
  const isLogin = mode === "login";
  showLoginTab.classList.toggle("active", isLogin);
  showSignupTab.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);
}

function openAuthModal(mode = "login") {
  toggleTab(mode);
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const messageUserId = urlParams.get('message');
  const productId = urlParams.get('product');

  if (messageUserId && isLoggedIn) {
    currentChatUserId = messageUserId;
    currentProductId = productId;
    startConversationModal.classList.remove("hidden");
    initialMessage.focus();
  }
}

loginBtn.addEventListener("click", () => openAuthModal("login"));
refreshBtn.addEventListener("click", loadConversations);

logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  logoutBtn.disabled = true;
  const originalText = logoutBtn.textContent;
  logoutBtn.textContent = "Logging out...";

  try {
    await logout();
    isLoggedIn = false;
    currentUser = null;
    currentChatUserId = null;
    currentProductId = null;
    showLoggedOutUI();

    setTimeout(() => {
      window.location.href = "/html/index.html";
    }, 100);

  } catch (err) {
    console.error("Logout error:", err);
    logoutBtn.disabled = false;
    logoutBtn.textContent = originalText;
    setTimeout(() => {
      window.location.href = "/html/index.html";
    }, 100);
  }
});

closeChatBtn.addEventListener("click", () => {
  activeChat.classList.add("hidden");
  chatInterface.classList.remove("hidden");
  currentChatUserId = null;
  currentProductId = null;

  document.querySelectorAll(".conversation-item").forEach(item => {
    item.classList.remove("active");
  });
});

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = messageInput.value.trim();
  if (!content || !currentChatUserId) return;

  const sendBtn = messageForm.querySelector(".send-btn");
  sendBtn.disabled = true;
  messageInput.value = "";

  try {
    await sendNewMessage(content, currentChatUserId, currentProductId);
    updateUnreadCount();
  } catch (err) {
    alert("Error sending message");
    messageInput.value = content;
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
  }
});

closeModalBtn.addEventListener("click", closeAuthModal);
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});

showLoginTab.addEventListener("click", () => toggleTab("login"));
showSignupTab.addEventListener("click", () => toggleTab("signup"));

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    email: loginForm.loginEmail.value.trim().toLowerCase(),
    password: loginForm.loginPassword.value,
  };

  try {
    const res = await login(body);
    if (res.user) {
      showLoggedInUI(res.user);
      authModal.classList.add("hidden");
      loginForm.reset();
      await loadConversations();
      checkUrlParameters();
    } else {
      alert(res?.msg || res?.errors?.[0]?.msg || "Login failed.");
    }
  } catch (err) {
    alert("Login failed. Please try again.");
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    name: signupForm.signupName.value.trim(),
    email: signupForm.signupEmail.value.trim().toLowerCase(),
    password: signupForm.signupPassword.value,
    captchaToken: getTurnstileToken(),
  };

  try {
    const res = await signup(body);
    if (res.user) {
      showLoggedInUI(res.user);
      authModal.classList.add("hidden");
      signupForm.reset();
      await loadConversations();
      checkUrlParameters();
    } else {
      alert(res?.msg || res?.errors?.[0]?.msg || "Signup failed.");
    }
  } catch (err) {
    alert("Signup failed. Please try again.");
  }
});

closeStartConversationModal.addEventListener("click", () => {
  startConversationModal.classList.add("hidden");
  currentChatUserId = null;
  currentProductId = null;
});

startConversationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = initialMessage.value.trim();
  if (!content || !currentChatUserId) return;

  const submitBtn = startConversationForm.querySelector(".btn-primary");
  submitBtn.disabled = true;

  try {
    await sendNewMessage(content, currentChatUserId, currentProductId);
    startConversationModal.classList.add("hidden");
    initialMessage.value = "";

    await loadConversations();

    const conv = conversations.find(c => c.otherUser.id === currentChatUserId);
    if (conv) {
      await openChat(conv.otherUser.id, conv.otherUser.name, conv.product);
    }

  } catch (err) {
    alert("Error sending message");
  } finally {
    submitBtn.disabled = false;
  }
});

window.startConversation = (sellerId, sellerName, productId) => {
  if (!isLoggedIn) {
    openAuthModal("login");
    return;
  }

  currentChatUserId = sellerId;
  currentProductId = productId;
  chatUserName.textContent = sellerName;
  startConversationModal.classList.remove("hidden");
  initialMessage.focus();
};

(async () => {
  try {
    const user = await me();
    if (user && user.id) {
      showLoggedInUI(user);
      await loadConversations();
      checkUrlParameters();
    } else {
      showLoggedOutUI();
    }
  } catch (err) {
    showLoggedOutUI();
  }
})();

setInterval(async () => {
  if (isLoggedIn) {
    await updateUnreadCount();

    if (!activeChat.classList.contains("hidden")) {
      if (currentChatUserId) {
        await loadMessages(currentChatUserId);
      }
    } else {
      await loadConversations();
    }
  }
}, 30000);


function updateButtonTextForMobile() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (window.innerWidth <= 768) {
    if (loginBtn && !loginBtn.classList.contains("hidden")) {
      loginBtn.textContent = "Login";
    }
    if (logoutBtn && !logoutBtn.classList.contains("hidden")) {
      logoutBtn.textContent = "Logout";
    }
  } else {
    if (loginBtn && !loginBtn.classList.contains("hidden")) {
      loginBtn.textContent = "Sign up | Log in";
    }
    if (logoutBtn && !logoutBtn.classList.contains("hidden")) {
      logoutBtn.textContent = "Logout";
    }
  }
}

window.addEventListener('resize', updateButtonTextForMobile);
window.addEventListener('load', updateButtonTextForMobile);

const originalShowLoggedInUI = showLoggedInUI;
const originalShowLoggedOutUI = showLoggedOutUI;

if (typeof showLoggedInUI === 'function') {
  showLoggedInUI = function (user) {
    originalShowLoggedInUI(user);
    setTimeout(updateButtonTextForMobile, 10);
  };
}

if (typeof showLoggedOutUI === 'function') {
  showLoggedOutUI = function () {
    originalShowLoggedOutUI();
    setTimeout(updateButtonTextForMobile, 10);
  };
}