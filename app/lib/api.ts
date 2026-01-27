import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  // Keep in sync with frontend/app/lib/authClient.ts + tenantClient.ts
  localStorage.removeItem("ebid_access_token");
  localStorage.removeItem("ebid_tenant_id");
  // Force navigation to login/root.
  window.location.href = "/";
}

function withAuthHeaders(init: RequestInit = {}): RequestInit {
  const token = getToken();
  if (!token) return init;

  return {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, withAuthHeaders());

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text();

    // Try to parse NestJS error envelope and surface only the business message
    try {
      const data = text ? JSON.parse(text) : null;
      const msg = data && (data.message || data.error)
        ? (data.message || data.error)
        : text && !text.startsWith("{")
        ? text
        : "API error";
      throw new Error(msg as string);
    } catch {
      throw new Error(text || "API error");
    }
  }
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthHeaders({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text();

    try {
      const data = text ? JSON.parse(text) : null;
      const msg = data && (data.message || data.error)
        ? (data.message || data.error)
        : text && !text.startsWith("{")
        ? text
        : "API error";
      throw new Error(msg as string);
    } catch {
      throw new Error(text || "API error");
    }
  }

  return res.json();
}

export async function apiPut(path: string, body: any) {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthHeaders({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text();

    try {
      const data = text ? JSON.parse(text) : null;
      const msg = data && (data.message || data.error)
        ? (data.message || data.error)
        : text && !text.startsWith("{")
        ? text
        : "API error";
      throw new Error(msg as string);
    } catch {
      throw new Error(text || "API error");
    }
  }

  return res.json();
}

export async function apiDelete(path: string) {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthHeaders({
      method: "DELETE",
    })
  );

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text();

    try {
      const data = text ? JSON.parse(text) : null;
      const msg = data && (data.message || data.error)
        ? (data.message || data.error)
        : text && !text.startsWith("{")
        ? text
        : "API error";
      throw new Error(msg as string);
    } catch {
      throw new Error(text || "API error");
    }
  }

  // Some endpoints might return empty body.
  const text = await res.text();
  return text ? JSON.parse(text) : { ok: true };
}

export async function apiUpload(path: string, formData: FormData) {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthHeaders({
      method: "POST",
      body: formData,
    })
  );

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text();

    try {
      const data = text ? JSON.parse(text) : null;
      const msg = data && (data.message || data.error)
        ? (data.message || data.error)
        : text && !text.startsWith("{")
        ? text
        : "API error";
      throw new Error(msg as string);
    } catch {
      throw new Error(text || "API error");
    }
  }

  return res.json();
}

// Fetch a binary/blob response (e.g. PDF) with auth headers.
export async function apiGetBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, withAuthHeaders());

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text();
    try {
      const data = text ? JSON.parse(text) : null;
      const msg = data && (data.message || data.error)
        ? (data.message || data.error)
        : text && !text.startsWith("{")
        ? text
        : "API error";
      throw new Error(msg as string);
    } catch {
      throw new Error(text || "API error");
    }
  }

  return res.blob();
}
