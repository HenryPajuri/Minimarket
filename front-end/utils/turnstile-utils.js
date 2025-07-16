let latestToken = "";

window.onTurnstileSuccess = function(token) {
  latestToken = token;
};

export function getTurnstileToken() {
  let token = latestToken || window.latestToken || "";

  if (!token && window.turnstileWidgetId && window.turnstile) {
    try {
      token = window.turnstile.getResponse(window.turnstileWidgetId);
    } catch (e) {
    }
  }
  
  return token;
}

export function clearTurnstileToken() {
  latestToken = "";
  window.latestToken = "";
}

window.onloadTurnstileCallback = function() {
  try {
    window.turnstileWidgetId = window.turnstile.render('#turnstile-container', {
      sitekey: '0x4AAAAAABkfTVCE9npIwrA-', 
      callback: function(token) {
        latestToken = token;
        window.latestToken = token;
        
        if (typeof window.onTurnstileSuccess === 'function') {
          window.onTurnstileSuccess(token);
        }
      },
      'error-callback': function(error) {
        latestToken = "";
        window.latestToken = "";
      },
      'expired-callback': function() {
        latestToken = "";
        window.latestToken = "";
      }
    });
  } catch (error) {
  }
};