import { signup, login, logout, me, getUnreadCount, getMyItems, deleteProduct, createProduct } from "../utils/api.js";

let isLoggedIn = false;
let currentUser = null;
let latestToken = "";
let currentDeleteItem = null;

window.onTurnstileSuccess = function(token) {
  latestToken = token;
};

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
const messagesNavItem = document.getElementById("messagesNavItem");
const myItemsNavItem = document.getElementById("myItemsNavItem");
const itemsGrid = document.getElementById("itemsGrid");
const addItemBtn = document.getElementById("addItemBtn");
const sellBtn = document.getElementById("sellBtn");
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showLoginTab = document.getElementById("showLogin");
const showSignupTab = document.getElementById("showSignup");
const closeModalBtn = document.getElementById("closeModal");

const deleteModal = document.getElementById("deleteModal");
const closeDeleteModal = document.getElementById("closeDeleteModal");
const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");

const sellModal = document.getElementById("sellModal");
const sellForm = document.getElementById("sellForm");
const closeSellModal = document.getElementById("closeSellModal");

const selectedImages = [];
const thumbRow = document.getElementById("thumbPreview");

if (sellForm && sellForm.itemImages) {
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
}

function showLoggedInUI(user) {
  console.log("Showing logged in UI for user:", user);
  isLoggedIn = true;
  currentUser = user;
  navUser.textContent = `Hi, ${user.name || "User"}`;
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  if (messagesNavItem) messagesNavItem.classList.remove("hidden");
  if (myItemsNavItem) myItemsNavItem.classList.remove("hidden");
  updateUnreadCount();
  loadUserItems();
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
  
  itemsGrid.innerHTML = `
    <div class="empty-state">
      <h3>Please log in</h3>
      <p>You need to log in to see your items.</p>
      <button onclick="openAuthModal('login')" class="btn-primary">Log In</button>
    </div>
  `;
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

async function loadUserItems() {
  if (!isLoggedIn) {
    console.log("User not logged in, skipping item load");
    return;
  }
  
  console.log("Loading user items...");
  itemsGrid.innerHTML = '<div class="loading">Loading your items...</div>';
  
  try {
    const items = await getMyItems();
    console.log("Loaded items:", items);
    displayUserItems(items);
  } catch (err) {
    console.error("Error loading user items:", err);
    itemsGrid.innerHTML = `
      <div class="loading">
        <h3>Error loading items</h3>
        <p>${err.message}</p>
        <button onclick="loadUserItems()" class="btn-primary">Try Again</button>
      </div>
    `;
  }
}

function displayUserItems(items) {
  if (items.length === 0) {
    itemsGrid.innerHTML = `
      <div class="empty-state">
        <h3>No items yet</h3>
        <p>You haven't listed any items for sale.</p>
      </div>
    `;
    return;
  }
  
  itemsGrid.innerHTML = "";
  
  items.forEach(item => {
    const itemCard = document.createElement("div");
    itemCard.className = "user-item-card";
    
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : "/placeholder.jpg";
    const createdDate = new Date(item.createdAt).toLocaleDateString();
    
    itemCard.innerHTML = `
      <img src="${imageUrl}" alt="" class="user-item-image">
      <div class="user-item-info">
        <h3 class="user-item-name"></h3>
        <div class="user-item-price">€${item.price}</div>
        <div class="user-item-description"></div>
        <div class="user-item-meta">
          <span class="item-category">${item.category}</span>
          <span>Listed ${createdDate}</span>
        </div>
        <div class="user-item-actions">
          <button class="btn-small btn-view">View</button>
          <button class="btn-small btn-delete">Delete</button>
        </div>
      </div>
    `;
    
    const nameEl = itemCard.querySelector('.user-item-name');
    const descEl = itemCard.querySelector('.user-item-description');
    const imgEl = itemCard.querySelector('.user-item-image');
    
    nameEl.textContent = item.name;
    imgEl.alt = item.name;
    
    if (item.description) {
      descEl.textContent = item.description;
    } else {
      descEl.remove();
    }
    
    const itemImage = itemCard.querySelector('.user-item-image');
    const itemName = itemCard.querySelector('.user-item-name');
    const viewBtn = itemCard.querySelector('.btn-view');
    const deleteBtn = itemCard.querySelector('.btn-delete');
    
    itemImage.style.cursor = 'pointer';
    itemName.style.cursor = 'pointer';
    itemImage.addEventListener('click', () => viewItem(item._id));
    itemName.addEventListener('click', () => viewItem(item._id));
    viewBtn.addEventListener('click', () => viewItem(item._id));
    
    deleteBtn.addEventListener('click', () => {
      deleteItem(item._id, item.name, imageUrl, item.price);
    });
    
    itemsGrid.appendChild(itemCard);
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

function viewItem(itemId) {
  console.log("Viewing item:", itemId);
  window.location.href = `/html/item.html?id=${itemId}`;
}

function deleteItem(itemId, itemName, itemImage, itemPrice) {
  console.log("Delete item called with:", { itemId, itemName, itemImage, itemPrice });
  
  currentDeleteItem = {
    id: itemId,
    name: itemName,
    image: itemImage,
    price: itemPrice
  };
  
  const nameEl = document.getElementById("deleteItemName");
  const priceEl = document.getElementById("deleteItemPrice");
  const imageEl = document.getElementById("deleteItemImage");
  
  if (nameEl) nameEl.textContent = itemName;
  if (priceEl) priceEl.textContent = `€${itemPrice}`;
  if (imageEl) {
    imageEl.src = itemImage;
    imageEl.alt = itemName;
  }
  
  deleteModal.classList.remove("hidden");
}

async function confirmDeleteItem() {
  if (!currentDeleteItem) return;
  
  const deleteBtn = document.getElementById("confirmDelete");
  const originalText = deleteBtn.textContent;
  deleteBtn.textContent = "Deleting...";
  deleteBtn.disabled = true;
  
  try {
    await deleteProduct(currentDeleteItem.id);
    deleteModal.classList.add("hidden");
    currentDeleteItem = null;
    
    await loadUserItems();
    
    showSuccessMessage("Item deleted successfully!");
  } catch (err) {
    alert("Error deleting item: " + err.message);
  } finally {
    deleteBtn.textContent = originalText;
    deleteBtn.disabled = false;
  }
}

function showSuccessMessage(message) {
  const successDiv = document.createElement("div");
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4bb6ac;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1001;
    animation: slideIn 0.3s ease;
  `;
  successDiv.textContent = message;
  
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

function openSellModal() {
  sellModal.classList.remove("hidden");
}

function closeSellModalFn() {
  sellModal.classList.add("hidden");
  sellForm.reset();
  thumbRow.innerHTML = "";
  selectedImages.length = 0;
}

function closeDeleteModalFn() {
  deleteModal.classList.add("hidden");
  currentDeleteItem = null;
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

window.openSellModal = openSellModal;
window.openAuthModal = openAuthModal;
window.loadUserItems = loadUserItems;

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

if (addItemBtn) {
  addItemBtn.addEventListener("click", openSellModal);
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

if (closeDeleteModal) {
  closeDeleteModal.addEventListener("click", closeDeleteModalFn);
}

if (cancelDelete) {
  cancelDelete.addEventListener("click", closeDeleteModalFn);
}

if (confirmDelete) {
  confirmDelete.addEventListener("click", confirmDeleteItem);
}

if (deleteModal) {
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModalFn();
  });
}

if (closeSellModal) {
  closeSellModal.addEventListener("click", closeSellModalFn);
}

if (sellForm) {
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
      closeSellModalFn();
      await loadUserItems();
      showSuccessMessage("Item added successfully!");
    } else {
      const data = await res.json();
      alert(data?.errors?.[0]?.msg || data?.msg || "Error adding product");
    }
  });
}

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
setTimeout(highlightCurrentPage, 10);

const originalShowLoggedInUI = showLoggedInUI;
const originalShowLoggedOutUI = showLoggedOutUI;

showLoggedInUI = function(user) {
  originalShowLoggedInUI(user);
  setTimeout(updateButtonTextForMobile, 10);
};

showLoggedOutUI = function() {
  originalShowLoggedOutUI();
  setTimeout(updateButtonTextForMobile, 10);
};

window.addEventListener('resize', updateButtonTextForMobile);
window.addEventListener('load', updateButtonTextForMobile);

(async () => {
  console.log("Initializing useritems page...");
  try {
    const user = await me();
    console.log("User check result:", user);
    if (user && user.id) {
      showLoggedInUI(user);
    } else {
      console.log("No user found, showing logged out UI");
      showLoggedOutUI();
    }
  } catch (err) {
    console.error("Error during initialization:", err);
    showLoggedOutUI();
  }
})();

setInterval(updateUnreadCount, 30000);