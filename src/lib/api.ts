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
    .select("price_month, price_quarter, price_year, price_exclusive_month, price_exclusive_quarter, price_exclusive_year, price_shared_month, price_shared_quarter, price_shared_year, hupi_wechat, hupi_alipay, crypto_usdt, crypto_trx, crypto_address")
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

export async function lookupClient(uuid: string) {
  return callEdgeFunction("proxy-3xui", { action: "lookup", uuid });
}

// Payment APIs
export async function createOrder(params: {
  uuid: string;
  planName: string;
  months: number;
  amount: number;
  paymentMethod: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
}) {
  return callEdgeFunction("payment-callback", { action: "create-order", ...params });
}

export async function checkOrderStatus(orderId: string) {
  return callEdgeFunction("payment-callback", { action: "check-order", orderId });
}

export async function verifyCryptoPayment(orderId: string) {
  return callEdgeFunction("crypto-verify", { action: "verify", orderId });
}

// Plans APIs
export async function getPlans() {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function adminGetPlans(token: string) {
  return callEdgeFunction("admin-plans", { action: "list", token });
}

export async function adminCreatePlan(token: string, plan: object) {
  return callEdgeFunction("admin-plans", { action: "create", token, plan });
}

export async function adminUpdatePlan(token: string, plan: object) {
  return callEdgeFunction("admin-plans", { action: "update", token, plan });
}

export async function adminDeletePlan(token: string, planId: string) {
  return callEdgeFunction("admin-plans", { action: "delete", token, plan: { id: planId } });
}

// Admin orders
export async function adminGetOrders(token: string, params?: { page?: number; pageSize?: number; search?: string; statusFilter?: string }) {
  return callEdgeFunction("admin-orders", { action: "list", token, ...params });
}

export async function adminDeleteOrder(token: string, orderId: string) {
  return callEdgeFunction("admin-orders", { action: "delete", token, orderId });
}

export async function adminBatchDeleteOrders(token: string, orderIds: string[]) {
  return callEdgeFunction("admin-orders", { action: "batch-delete", token, orderIds });
}

// Get orders for a UUID
export async function getOrders(uuid: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("uuid", uuid)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}
