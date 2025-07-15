const BASE = "/api";

let _cachedToken = null;

async function getCsrfToken() {
  if (_cachedToken) return _cachedToken;
  
  try {
    const response = await fetch(`${BASE}/csrf`, { credentials: "include" });
    if (!response.ok) {
      console.error("CSRF token request failed:", response.status, response.statusText);
      throw new Error("Failed to get CSRF token");
    }
    const { csrfToken } = await response.json();
    _cachedToken = csrfToken;
    console.log("CSRF token obtained successfully");
    return csrfToken;
  } catch (err) {
    console.error("Error getting CSRF token:", err);
    throw err;
  }
}

async function request(path, method = "GET", data) {
  const opts = { method, credentials: "include", headers: {} };

  if (data !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.headers["X-CSRF-Token"] = await getCsrfToken();
    opts.body = JSON.stringify(data);
  }

  console.log("Making request:", method, `${BASE}${path}`, opts);

  const response = await fetch(`${BASE}${path}`, opts);
  
  if (!response.ok) {
    console.error("Request failed:", response.status, response.statusText);
    
    try {
      const errorData = await response.json();
      console.error("Error response body:", errorData);
      
      
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map(err => err.msg).join(', ');
        throw new Error(errorMessages);
      }
      
      throw new Error(errorData.msg || `HTTP ${response.status}`);
    } catch (parseError) {
      if (parseError.message.includes('HTTP')) {
        throw parseError; 
      }
      console.error("Could not parse error response:", parseError);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
  
  return response.status === 204 ? null : response.json();
}

export const signup = body => {
  console.log("Signup called with:", body);
  return request("/auth/signup", "POST", body);
};
export const login = body => request("/auth/login", "POST", body);
export const logout = async () => {
  try {
    const result = await request("/auth/logout", "POST", {});
    _cachedToken = null;
    return result;
  } catch (err) {
    _cachedToken = null;
    throw err;
  }
};
export const me = () => request("/auth/me");

export const listProducts = () => request("/products");
export const createProduct = product => request("/products", "POST", product);

export const getConversations = () => request("/messages");
export const getMessages = userId => request(`/messages/${userId}`);
export const sendMessage = message => request("/messages", "POST", message);
export const markAsRead = msgId => request(`/messages/${msgId}/read`, "PUT");
export const getUnreadCount = () => request("/messages/unread/count");