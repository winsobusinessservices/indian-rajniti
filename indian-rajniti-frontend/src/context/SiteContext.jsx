"use client";

import { createContext, useContext } from "react";

const DEFAULT_SITE = {
  name: "Indian Rajneeti",
  description: "Authoritative Indian political news and analysis.",
  primary_color: "#002068",
  secondary_color: "#8f4e00",
};

const SiteContext = createContext(DEFAULT_SITE);

export function SiteProvider({ site, children }) {
  return <SiteContext.Provider value={{ ...DEFAULT_SITE, ...(site || {}) }}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}

