"use client";

const KEY = "ebid_tenant_id";

export const setTenantId = (id: string) =>
  localStorage.setItem(KEY, id);

export const getTenantId = () =>
  localStorage.getItem(KEY);

export const clearTenantId = () =>
  localStorage.removeItem(KEY);
