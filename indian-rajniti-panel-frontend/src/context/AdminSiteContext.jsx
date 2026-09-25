"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { sitesApi } from "@/lib/api";

const AdminSiteContext = createContext({ sites: [], activeSite: null, activeSiteId: "", features: {}, setActiveSiteId: () => {} });

export function AdminSiteProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState([]);
  const [activeSiteId, setActiveSiteIdState] = useState("");
  const [features, setFeatures] = useState({});

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    const ownSite = user.site ? [user.site] : [];
    const request = user.role === "ADMIN" ? sitesApi.list().then((data) => data.sites || []) : Promise.resolve(ownSite);
    request.then((available) => {
      if (!active) return;
      const selected = String(available[0]?.id || user.siteId || "");
      setSites(available);
      setActiveSiteIdState(selected);
    }).catch(() => {
      if (active) { setSites(ownSite); setActiveSiteIdState(String(user.siteId || "")); }
    });
    return () => { active = false; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!activeSiteId || !user) return;
    let active = true;
    const loadFeatures = () => sitesApi.features().then((data) => { if (active) setFeatures(data.features || {}); }).catch(() => { if (active) setFeatures({}); });
    loadFeatures();
    window.addEventListener("panel-site-features-changed", loadFeatures);
    return () => { active = false; window.removeEventListener("panel-site-features-changed", loadFeatures); };
  }, [activeSiteId, user]);

  useEffect(() => {
    const updateSite = (event) => {
      const site = event.detail?.site;
      if (!site) return;
      setSites([site]);
      setActiveSiteIdState(String(site.id));
    };
    window.addEventListener("panel-site-settings-changed", updateSite);
    return () => window.removeEventListener("panel-site-settings-changed", updateSite);
  }, []);

  const activeSite = sites.find((site) => String(site.id) === String(activeSiteId)) || user?.site || null;
  const value = useMemo(() => ({ sites, activeSite, activeSiteId, features, setActiveSiteId: () => {} }), [sites, activeSite, activeSiteId, features]);
  return <AdminSiteContext.Provider value={value}>{children}</AdminSiteContext.Provider>;
}

export function useAdminSite() {
  return useContext(AdminSiteContext);
}
