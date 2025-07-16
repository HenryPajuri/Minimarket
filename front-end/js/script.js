import { initAuthUI, startUnreadPolling, openAuthModal, getCurrentUser, getIsLoggedIn } from "../utils/auth-ui.js";
import { initNavigation } from "../utils/navigation.js";
import { initCommonHandlers, initUserAuth } from "../utils/common-handlers.js";

let allProducts = [];
const selectedImages = [];

async function fetchProducts() {
  const res = await fetch("/api/products", { credentials: "include" });
  if (!res.ok) throw new Error("Unable to load products");
  return res.json();
}

async function refreshProducts() {
  allProducts = await fetchProducts();
  displayProducts(allProducts);
}

function displayProducts(list) {
  const productGrid = document.getElementById("productGrid");
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

function filterItems(cat) {
  const list = cat === "all" ? allProducts : allProducts.filter((p) => p.category === cat);
  displayProducts(list);
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      const list = q ? allProducts.filter(p => p.name.toLowerCase().includes(q)) : allProducts;
      displayProducts(list);
    });
  }
}

function setupFilters() {
  document.querySelectorAll(".filters [data-cat]").forEach((btn) =>
    btn.addEventListener("click", () => filterItems(btn.dataset.cat))
  );
}

function setupSellModal() {
  const sellModal = document.getElementById("sellModal");
  const sellForm = document.getElementById("sellForm");
  const closeSellModal = document.getElementById("closeSellModal");
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

  if (closeSellModal) {
    closeSellModal.addEventListener("click", () => sellModal.classList.add("hidden"));
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
  }
}

function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('sell') === 'true') {
    if (getIsLoggedIn()) {
      document.getElementById("sellModal").classList.remove("hidden");
    } else {
      openAuthModal("login");
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

(async () => {
  initAuthUI();
  initNavigation();
  initCommonHandlers();
  
  setupSearch();
  setupFilters();
  setupSellModal();
  
  await initUserAuth();
  
  await refreshProducts();
  
  handleUrlParameters();
  
  startUnreadPolling();
})();