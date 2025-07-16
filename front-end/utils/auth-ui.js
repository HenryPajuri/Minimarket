import { getUnreadCount } from "./api.js";

let isLoggedIn = false;
let currentUser = null;

let elements = {};

export function initAuthUI() {
  elements = {
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    navUser: document.getElementById("navUser"),
    unreadBadge: document.getElementById("unreadBadge"),
    messagesNavItem: document.getElementById("messagesNavItem"),
    myItemsNavItem: document.getElementById("myItemsNavItem"),
    authModal: document.getElementById("authModal"),
    loginForm: document.getElementById("loginForm"),
    signupForm: document.getElementById("signupForm"),
    showLoginTab: document.getElementById("showLogin"),
    showSignupTab: document.getElementById("showSignup"),
    closeModalBtn: document.getElementById("closeModal")
  };
}

export function showLoggedInUI(user) {
  isLoggedIn = true;
  currentUser = user;
  
  if (elements.navUser) elements.navUser.textContent = `Hi, ${user.name || "User"}`;
  if (elements.loginBtn) elements.loginBtn.classList.add("hidden");
  if (elements.logoutBtn) elements.logoutBtn.classList.remove("hidden");
  if (elements.messagesNavItem) elements.messagesNavItem.classList.remove("hidden");
  if (elements.myItemsNavItem) elements.myItemsNavItem.classList.remove("hidden");
  
  updateUnreadCount();
  updateButtonTextForMobile();
}

export function showLoggedOutUI() {
  isLoggedIn = false;
  currentUser = null;
  
  if (elements.navUser) elements.navUser.textContent = "";
  if (elements.loginBtn) elements.loginBtn.classList.remove("hidden");
  if (elements.logoutBtn) elements.logoutBtn.classList.add("hidden");
  if (elements.messagesNavItem) elements.messagesNavItem.classList.add("hidden");
  if (elements.myItemsNavItem) elements.myItemsNavItem.classList.add("hidden");
  if (elements.unreadBadge) elements.unreadBadge.classList.add("hidden");
  
  updateButtonTextForMobile();
}

export async function updateUnreadCount() {
  if (!isLoggedIn) return;
  try {
    const { count } = await getUnreadCount();
    if (elements.unreadBadge) {
      if (count > 0) {
        elements.unreadBadge.textContent = count;
        elements.unreadBadge.classList.remove("hidden");
      } else {
        elements.unreadBadge.classList.add("hidden");
      }
    }
  } catch (err) {
    console.error("Error updating unread count:", err);
  }
}

export function toggleTab(mode = "login") {
  const isLogin = mode === "login";
  if (elements.showLoginTab) elements.showLoginTab.classList.toggle("active", isLogin);
  if (elements.showSignupTab) elements.showSignupTab.classList.toggle("active", !isLogin);
  if (elements.loginForm) elements.loginForm.classList.toggle("hidden", !isLogin);
  if (elements.signupForm) elements.signupForm.classList.toggle("hidden", isLogin);
}

export function openAuthModal(mode = "login") {
  toggleTab(mode);
  if (elements.authModal) elements.authModal.classList.remove("hidden");
}

export function closeAuthModal() {
  if (elements.authModal) elements.authModal.classList.add("hidden");
}

function updateButtonTextForMobile() {
  if (window.innerWidth <= 768) {
    if (elements.loginBtn && !elements.loginBtn.classList.contains("hidden")) {
      elements.loginBtn.textContent = "Login";
    }
    if (elements.logoutBtn && !elements.logoutBtn.classList.contains("hidden")) {
      elements.logoutBtn.textContent = "Logout";
    }
  } else {
    if (elements.loginBtn && !elements.loginBtn.classList.contains("hidden")) {
      elements.loginBtn.textContent = "Sign up | Log in";
    }
    if (elements.logoutBtn && !elements.logoutBtn.classList.contains("hidden")) {
      elements.logoutBtn.textContent = "Logout";
    }
  }
}


window.addEventListener('resize', updateButtonTextForMobile);
window.addEventListener('load', updateButtonTextForMobile);

export function startUnreadPolling() {
  setInterval(updateUnreadCount, 30000);
}

export function getCurrentUser() {
  return currentUser;
}

export function getIsLoggedIn() {
  return isLoggedIn;
}