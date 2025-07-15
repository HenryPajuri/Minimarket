window.onloadTurnstileCallback = function () {
  try {
    window.turnstileWidgetId = window.turnstile.render('#turnstile-container', {
      sitekey: '0x4AAAAAABkfTVCE9npIwrA-', 
      callback: function(token) {
        window.latestToken = token;
        
        if (typeof window.onTurnstileSuccess === 'function') {
          window.onTurnstileSuccess(token);
        }
      },
      'error-callback': function(error) {
        window.latestToken = "";
      },
      'expired-callback': function() {
        window.latestToken = "";
      }
    });
  } catch (error) {
    // Silent fail - widget will not work but app continues
  }
};