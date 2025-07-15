import { signup, login, logout, me, getUnreadCount } from "../utils/api.js";

let isLoggedIn = false;
let currentUser = null;
let latestToken = "";

window.onTurnstileSuccess = (token) => {
  latestToken = token;
};

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sellBtn = document.getElementById("sellBtn");
const messagesLink = document.getElementById("messagesLink");
const messagesNavItem = document.getElementById("messagesNavItem");
const navUser = document.getElementById("navUser");
const unreadBadge = document.getElementById("unreadBadge");
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showLoginTab = document.getElementById("showLogin");
const showSignupTab = document.getElementById("showSignup");
const closeModalBtn = document.getElementById("closeModal");
const signupLink = document.getElementById("signupLink");

function showLoggedInUI(user) {
  isLoggedIn = true;
  currentUser = user;
  navUser.textContent = `Hi, ${user.name || "User"}`;
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  if (messagesNavItem) messagesNavItem.classList.remove("hidden");
  updateUnreadCount();
}

function showLoggedOutUI() {
  isLoggedIn = false;
  currentUser = null;
  navUser.textContent = "";
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  if (messagesNavItem) messagesNavItem.classList.add("hidden");
  unreadBadge.classList.add("hidden");
}

async function updateUnreadCount() {
  if (!isLoggedIn) return;
  try {
    const { count } = await getUnreadCount();
    if (count > 0) {
      unreadBadge.textContent = count;
      unreadBadge.classList.remove("hidden");
    } else {
      unreadBadge.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error updating unread count:", err);
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

if (loginBtn) {
  loginBtn.addEventListener("click", () => openAuthModal("login"));
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await logout();
      showLoggedOutUI();
    } catch (err) {
      console.error("Logout error:", err);
      showLoggedOutUI();
    }
  });
}

if (sellBtn) {
  sellBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      window.location.href = "/html/index.html?sell=true";
    } else {
      openAuthModal("login");
    }
  });
}

if (messagesLink) {
  messagesLink.addEventListener("click", (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      openAuthModal("login");
    }
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeAuthModal);
}

if (authModal) {
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
  });
}

if (showLoginTab) {
  showLoginTab.addEventListener("click", () => toggleTab("login"));
}

if (showSignupTab) {
  showSignupTab.addEventListener("click", () => toggleTab("signup"));
}

if (loginForm) {
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
      } else {
        alert(res?.msg || res?.errors?.[0]?.msg || "Login failed.");
      }
    } catch (err) {
      alert("Login failed. Please try again.");
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      name: signupForm.signupName.value.trim(),
      email: signupForm.signupEmail.value.trim().toLowerCase(),
      password: signupForm.signupPassword.value,
      captchaToken: latestToken,
    };
    
    try {
      const res = await signup(body);
      if (res.user) {
        showLoggedInUI(res.user);
        authModal.classList.add("hidden");
        signupForm.reset();
      } else {
        alert(res?.msg || res?.errors?.[0]?.msg || "Signup failed.");
      }
    } catch (err) {
      alert("Signup failed. Please try again.");
    }
  });
}

if (signupLink) {
  signupLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      window.location.href = "/html/index.html";
    } else {
      openAuthModal("signup");
    }
  });
}

(async () => {
  if (messagesNavItem) messagesNavItem.classList.add("hidden");
  
  try {
    const user = await me();
    if (user && user.id) {
      showLoggedInUI(user);
    } else {
      showLoggedOutUI();
    }
  } catch (err) {
    showLoggedOutUI();
  }
})();

setInterval(updateUnreadCount, 30000);