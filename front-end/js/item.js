import { signup, login, logout, me, getUnreadCount, deleteProduct } from "../utils/api.js";

let isLoggedIn = false;
let currentUser = null;
let currentItem = null;
let latestToken = "";

function highlightCurrentPage() {
  document.querySelectorAll('.nav-bar a').forEach(link => {
    link.classList.remove('active');
  });

  const currentPath = window.location.pathname;
  
  const navMap = {
    '/html/index.html': 'a[href="/html/index.html"]',
    '/': 'a[href="/html/index.html"]', 
    '/html/messages.html': 'a[href="/html/messages.html"]',
    '/html/useritems.html': 'a[href="/html/useritems.html"]', 
    '/html/about.html': 'a[href="/html/about.html"]',
    '/html/item.html': 'a[href="/html/index.html"]'
  };

  const selector = navMap[currentPath];
  if (selector) {
    const activeLink = document.querySelector(selector);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
}


window.onTurnstileSuccess = function(token) {
  latestToken = token;
};

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


const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const navUser = document.getElementById("navUser");
const unreadBadge = document.getElementById("unreadBadge");
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showLoginTab = document.getElementById("showLogin");
const showSignupTab = document.getElementById("showSignup");
const closeModalBtn = document.getElementById("closeModal");


const deleteModal = document.getElementById("deleteModal");
const deleteBtn = document.getElementById("deleteBtn");
const closeDeleteModal = document.getElementById("closeDeleteModal");
const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");

function showLoggedInUI(user) {
  const myItemsNavItem = document.getElementById("myItemsNavItem");
  isLoggedIn = true;
  currentUser = user;
  navUser.textContent = `Hi, ${user.name || "User"}`;
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  if (messagesNavItem) messagesNavItem.classList.remove("hidden");
  if (myItemsNavItem) myItemsNavItem.classList.remove("hidden");
  updateUnreadCount();
}

function showLoggedOutUI() {
  isLoggedIn = false;
  currentUser = null;
  navUser.textContent = "";
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  if (messagesNavItem) messagesNavItem.classList.add("hidden");
  if (myItemsNavItem) myItemsNavItem.classList.add("hidden");
  unreadBadge.classList.add("hidden");

  if (currentItem) {
    updateButtonStates();
  }
}

function updateButtonStates() {
  const msgBtn = document.getElementById("msgBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  
  if (!msgBtn || !currentItem) return;
  
  const isOwnItem = currentUser && currentUser.id === currentItem.owner?._id;
  
  if (isOwnItem) {
  
    msgBtn.textContent = "Your Item";
    msgBtn.disabled = true;
    msgBtn.style.opacity = "0.5";
    msgBtn.style.cursor = "not-allowed";
    

    deleteBtn.classList.remove("hidden");
  } else {

    msgBtn.textContent = "Message Seller";
    msgBtn.disabled = false;
    msgBtn.style.opacity = "1";
    msgBtn.style.cursor = "pointer";
    

    deleteBtn.classList.add("hidden");
  }
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

async function loadProduct() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    document.body.innerHTML = "<div class='container'><p>Invalid link.</p></div>";
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
      document.body.innerHTML = "<div class='container'><p>Item not found.</p></div>";
      return;
    }
    
    currentItem = await res.json();
    displayProduct(currentItem);
    updateButtonStates();
    
  } catch (err) {
    console.error("Error loading product:", err);
    document.body.innerHTML = "<div class='container'><p>Error loading item.</p></div>";
  }
}

function displayProduct(item) {
  const mainImg = document.getElementById("mainImage");
  const thumbs = document.getElementById("thumbsContainer");

  if (item.images && item.images.length > 0) {
    mainImg.src = item.images[0];
    item.images.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      if (i === 0) img.classList.add("selected");

      img.addEventListener("click", () => {
        mainImg.src = src;
        thumbs.querySelectorAll("img").forEach(el => el.classList.remove("selected"));
        img.classList.add("selected");
      });

      thumbs.appendChild(img);
    });
  } else {
    mainImg.src = "/placeholder.jpg";
  }
  
  document.querySelectorAll("#itemName").forEach(el => el.textContent = item.name);
  document.getElementById("itemPrice").textContent = `€${item.price}`;
  document.getElementById("itemDescription").textContent = item.description || "No description.";
  const seller = item.owner?.name || "Unknown seller";
  const sellerEl = document.getElementById("sellerName");
  if (sellerEl) sellerEl.textContent = seller;

  document.getElementById("buyBtn").onclick = () => alert("Checkout flow TBD");
  document.getElementById("offerBtn").onclick = () => alert("Offer flow TBD");
  
  document.getElementById("msgBtn").onclick = () => {
    if (!currentUser) {
      alert("Please log in to message the seller.");
      openAuthModal("login");
      return;
    }
    
    const isOwnItem = currentUser.id === item.owner?._id;
    if (isOwnItem) {
      alert("You cannot message yourself!");
      return;
    }
    
    if (!item.owner || !item.owner._id) {
      alert("Seller information not available.");
      return;
    }
    
    const messagesUrl = `/html/messages.html?message=${item.owner._id}&product=${item._id}`;
    window.location.href = messagesUrl;
  };
}


function openDeleteModal() {
  deleteModal.classList.remove("hidden");
}

function closeDeleteModalFn() {
  deleteModal.classList.add("hidden");
}

async function handleDeleteProduct() {
  if (!currentItem || !currentItem._id) return;
  
  const deleteBtn = document.getElementById("confirmDelete");
  const originalText = deleteBtn.textContent;
  deleteBtn.textContent = "Deleting...";
  deleteBtn.disabled = true;
  
  try {
    await deleteProduct(currentItem._id);
    alert("Item deleted successfully!");
    
    window.location.href = "/html/index.html";
  } catch (err) {
    alert("Error deleting item: " + err.message);
    deleteBtn.textContent = originalText;
    deleteBtn.disabled = false;
  }
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
      captchaToken: getTurnstileToken(),
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

if (deleteBtn) {
  deleteBtn.addEventListener("click", openDeleteModal);
}

if (closeDeleteModal) {
  closeDeleteModal.addEventListener("click", closeDeleteModalFn);
}

if (cancelDelete) {
  cancelDelete.addEventListener("click", closeDeleteModalFn);
}

if (confirmDelete) {
  confirmDelete.addEventListener("click", handleDeleteProduct);
}

if (deleteModal) {
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModalFn();
  });
}

(async () => {
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
  
  await loadProduct();
})();
 setTimeout(highlightCurrentPage, 10);
setInterval(updateUnreadCount, 30000);