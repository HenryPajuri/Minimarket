window.onloadTurnstileCallback = function () {
  console.log("🚀 Turnstile API loaded, rendering widget...");
  
  try {
    window.turnstileWidgetId = window.turnstile.render('#turnstile-container', {
      sitekey: '0x4AAAAAABkfTVCE9npIwrA-',  
      callback: function(token) {
        console.log('✅ Explicit render success! Token:', token);
        window.latestToken = token;
        
        // Also try to call the global callback if it exists
        if (typeof window.onTurnstileSuccess === 'function') {
          window.onTurnstileSuccess(token);
        }
      },
      'error-callback': function(error) {
        console.error('❌ Explicit render error:', error);
        window.latestToken = "";
      },
      'expired-callback': function() {
        console.log('⏰ Token expired');
        window.latestToken = "";
      }
    });
    console.log('✅ Widget rendered with ID:', window.turnstileWidgetId);
  } catch (error) {
    console.error('💥 Failed to render Turnstile:', error);
  }
};