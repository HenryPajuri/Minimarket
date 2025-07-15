import { signup, login, logout, me, getUnreadCount } from "../utils/api.js";

let isLoggedIn = false;
let currentUser = null;
let allProducts = [];



let latestToken = "";


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

const productGrid = document.getElementById("productGrid");
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
const sellModal = document.getElementById("sellModal");
const sellForm = document.getElementById("sellForm");
const closeSellModal = document.getElementById("closeSellModal");
const showLoginTab = document.getElementById("showLogin");
const showSignupTab = document.getElementById("showSignup");
const closeModalBtn = document.getElementById("closeModal");

const selectedImages = [];
const thumbRow = document.getElementById("thumbPreview");

sellForm.itemImages.addEventListener("change", () => {
  const files = [...sellForm.itemImages.files];
  files.forEach((file) => {
    if (selectedImages.length >= 3) {
      alert("Max 3 images");
      return;
    }
    selectedImages.push(file);
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = url;
    thumbRow.appendChild(img);
  });
  sellForm.itemImages.value = "";
});

const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const list = q ? allProducts.filter(p => p.name.toLowerCase().includes(q)) : allProducts;
  displayProducts(list);
});

function displayProducts(list) {
  productGrid.innerHTML = "";
  list.forEach((p) => {
    productGrid.insertAdjacentHTML("beforeend",
      `<a class="product-card" href="/html/item.html?id=${p._id}">
         <img src="${p.image}" alt="${p.name}">
         <div class="product-info">
           <h4>${p.name}</h4><p>€${p.price}</p>
         </div>
       </a>`
    );
  });
}

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

async function fetchProducts() {
  const res = await fetch("/api/products", { credentials: "include" });
  if (!res.ok) throw new Error("Unable to load products");
  return res.json();
}

async function refreshProducts() {
  allProducts = await fetchProducts();
  displayProducts(allProducts);
}

function filterItems(cat) {
  const list = cat === "all" ? allProducts : allProducts.filter((p) => p.category === cat);
  displayProducts(list);
}

document.querySelectorAll(".filters [data-cat]").forEach((btn) =>
  btn.addEventListener("click", () => filterItems(btn.dataset.cat))
);

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

loginBtn.addEventListener("click", () => openAuthModal("login"));
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
  const res = await login(body);
  if (res.user) {
    showLoggedInUI(res.user);
    authModal.classList.add("hidden");
    loginForm.reset();
  } else {
    alert(res?.msg || res?.errors?.[0]?.msg || "Login failed.");
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
  const res = await signup(body);
  if (res.user) {
    showLoggedInUI(res.user);
    authModal.classList.add("hidden");
    signupForm.reset();
  } else {
    alert(res?.msg || res?.errors?.[0]?.msg || "Signup failed.");
  }
});

sellBtn.addEventListener("click", () => {
  if (isLoggedIn) {
    sellModal.classList.remove("hidden");
  } else {
    openAuthModal("login");
  }
});

closeSellModal.addEventListener("click", () => sellModal.classList.add("hidden"));

sellForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (selectedImages.length === 0) {
    return alert("Please add at least one image.");
  }

  const { csrfToken } = await fetch("/api/csrf", { credentials: "include" }).then(r => r.json());
  const fd = new FormData();
  fd.append("name", sellForm.itemName.value.trim());
  fd.append("price", sellForm.itemPrice.value);
  fd.append("category", sellForm.itemCategory.value);
  fd.append("description", sellForm.itemDesc.value.trim());
  selectedImages.forEach((file) => fd.append("images", file));

  const res = await fetch("/api/products", {
    method: "POST",
    body: fd,
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken }
  });

  if (res.ok) {
    sellForm.reset();
    thumbRow.innerHTML = "";
    selectedImages.length = 0;
    sellModal.classList.add("hidden");
    await refreshProducts();
  } else {
    const data = await res.json();
    alert(data?.errors?.[0]?.msg || data?.msg || "Error adding product");
  }
});

if (messagesLink) {
  messagesLink.addEventListener("click", (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      openAuthModal("login");
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
  
  await refreshProducts();
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('sell') === 'true') {
    if (isLoggedIn) {
      sellModal.classList.remove("hidden");
    } else {
      openAuthModal("login");
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();

setInterval(updateUnreadCount, 30000);


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
  showLoggedInUI = function(user) {
    originalShowLoggedInUI(user);
    setTimeout(updateButtonTextForMobile, 10);
  };
}

if (typeof showLoggedOutUI === 'function') {
  showLoggedOutUI = function() {
    originalShowLoggedOutUI();
    setTimeout(updateButtonTextForMobile, 10);
  };
}