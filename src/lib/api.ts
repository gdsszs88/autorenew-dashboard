import { supabase } from "@/integrations/supabase/client";

const getProjectId = () => import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function callEdgeFunction(name: string, body?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });
  if (error) throw error;
  return data;
}

// Admin APIs
export async function adminLogin(password: string) {
  return callEdgeFunction("admin-auth", { action: "login", password });
}

export async function getAdminConfig(token: string) {
  return callEdgeFunction("admin-config", { action: "get", token });
}

export async function saveAdminConfig(token: string, config: object) {
  return callEdgeFunction("admin-config", { action: "save", token, config });
}

export async function testPanelConnection(token: string, panelUrl: string, panelUser: string, panelPass: string) {
  return callEdgeFunction("proxy-3xui", { action: "test", token, panelUrl, panelUser, panelPass });
}

// Client APIs
export async function getPublicConfig() {
  const { data, error } = await supabase
    .from("admin_config")
    .select("price_month, price_quarter, price_year, hupi_wechat, hupi_alipay, crypto_usdt, crypto_trx, crypto_address")
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

export async function lookupClient(uuid: string) {
  return callEdgeFunction("proxy-3xui", { action: "lookup", uuid });
}
