const BASE = "/api";

let _cachedToken = null;

async function getCsrfToken() {
  if (_cachedToken) return _cachedToken;
  const response = await fetch(`${BASE}/csrf`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to get CSRF token");
  const { csrfToken } = await response.json();
  _cachedToken = csrfToken;
  return csrfToken;
}

async function request(path, method = "GET", data) {
  const opts = { method, credentials: "include", headers: {} };

  if (data !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.headers["X-CSRF-Token"] = await getCsrfToken();
    opts.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE}${path}`, opts);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: "Request failed" }));
    throw new Error(errorData.msg || `HTTP ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

export const signup = body => request("/auth/signup", "POST", body);
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