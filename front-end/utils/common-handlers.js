import { signup, login, logout, me } from "./api.js";
import { showLoggedInUI, showLoggedOutUI, openAuthModal, closeAuthModal, toggleTab } from "./auth-ui.js";
import { getTurnstileToken } from "./turnstile-utils.js";

export function initCommonHandlers() {
  setupAuthHandlers();
  setupModalHandlers();
  setupSellButtonHandler();
  setupMessagesLinkHandler();
}

function setupAuthHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

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
          closeAuthModal();
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
        captchaToken: getTurnstileToken(),
      };
      
      try {
        const res = await signup(body);
        if (res.user) {
          showLoggedInUI(res.user);
          closeAuthModal();
          signupForm.reset();
        } else {
          alert(res?.msg || res?.errors?.[0]?.msg || "Signup failed.");
        }
      } catch (err) {
        alert("Signup failed. Please try again.");
      }
    });
  }
}

function setupModalHandlers() {
  const authModal = document.getElementById("authModal");
  const closeModalBtn = document.getElementById("closeModal");
  const showLoginTab = document.getElementById("showLogin");
  const showSignupTab = document.getElementById("showSignup");

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
}

function setupSellButtonHandler() {
  const sellBtn = document.getElementById("sellBtn");
  
  if (sellBtn) {
    sellBtn.addEventListener("click", (e) => {
      e.preventDefault();
      
      import("./auth-ui.js").then(({ getCurrentUser, getIsLoggedIn }) => {
        if (getIsLoggedIn()) {
          window.location.href = "/html/index.html?sell=true";
        } else {
          openAuthModal("login");
        }
      });
    });
  }
}

function setupMessagesLinkHandler() {
  const messagesLink = document.getElementById("messagesLink");
  
  if (messagesLink) {
    messagesLink.addEventListener("click", (e) => {
      import("./auth-ui.js").then(({ getIsLoggedIn }) => {
        if (!getIsLoggedIn()) {
          e.preventDefault();
          openAuthModal("login");
        }
      });
    });
  }
}

export async function initUserAuth() {
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
}