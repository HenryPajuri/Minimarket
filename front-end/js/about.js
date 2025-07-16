import { initAuthUI, startUnreadPolling, openAuthModal, getCurrentUser, getIsLoggedIn } from "../utils/auth-ui.js";
import { initNavigation } from "../utils/navigation.js";
import { initCommonHandlers, initUserAuth } from "../utils/common-handlers.js";

function setupPageSpecificHandlers() {
  const signupLink = document.getElementById("signupLink");
  
  if (signupLink) {
    signupLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (getIsLoggedIn()) {
        window.location.href = "/html/index.html";
      } else {
        openAuthModal("signup");
      }
    });
  }
}

(async () => {
  initAuthUI();
  initNavigation();
  initCommonHandlers();
  
  setupPageSpecificHandlers();
  
  await initUserAuth();
  
  startUnreadPolling();
})();