export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ebid_access_token");
}

export function isAuthenticated() {
  return !!getToken();
}
