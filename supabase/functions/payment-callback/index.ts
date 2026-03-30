import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// MD5 HMAC using Web Crypto API
async function hmacMd5(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "MD5" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: fetch with automatic HTTP fallback
async function fetchUnsafe(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const errStr = String(err);
    if (errStr.includes("certificate") || errStr.includes("SSL") || errStr.includes("TLS")) {
      const httpUrl = url.replace(/^https:\/\//, "http://");
      if (httpUrl !== url) return await fetch(httpUrl, init);
    }
    throw err;
  }
}

// Login to 3x-ui and get session cookie
async function login3xui(panelUrl: string, username: string, password: string): Promise<string | null> {
  const baseUrl = panelUrl.replace(/\/+$/, "");
  try {
    const res = await fetchUnsafe(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return null;
    const match = setCookie.match(/([^=]+=[^;]+)/);
    const cookie = match ? match[1] : null;
    const body = await res.json();
    return body.success && cookie ? cookie : null;
  } catch (err) {
    console.error("3x-ui login failed:", err);
    return null;
  }
}

// Find client UUID in inbounds and return inbound ID + client email
async function findClient(panelUrl: string, cookie: string, uuid: string) {
  const baseUrl = panelUrl.replace(/\/+$/, "");
  const res = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/list`, {
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  const data = await res.json();
  if (!data?.success || !data?.obj) return null;

  for (const inbound of data.obj) {
    try {
      const settings = JSON.parse(inbound.settings || "{}");
      for (const client of settings.clients || []) {
        if (client.id === uuid || client.password === uuid) {
          return {
            inboundId: inbound.id,
            email: client.email,
            expiryTime: client.expiryTime || 0,
          };
        }
      }
    } catch {}
  }
  return null;
}

// Extend client expiry via 3x-ui API
async function extendExpiry(panelUrl: string, cookie: string, inboundId: number, email: string, currentExpiry: number, months: number): Promise<boolean> {
  const baseUrl = panelUrl.replace(/\/+$/, "");
  
  // Calculate new expiry: if current expiry is 0 or in the past, start from now
  const now = Date.now();
  const baseTime = (currentExpiry > 0 && currentExpiry > now) ? currentExpiry : now;
  const newExpiry = baseTime + months * 30 * 24 * 60 * 60 * 1000;

  // Reset traffic for the client
  const resetRes = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/${inboundId}/resetClientTraffic/${encodeURIComponent(email)}`, {
    method: "POST",
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  const resetBody = await resetRes.json();
  console.log("Reset traffic result:", resetBody);

  // Update client expiry time
  // We need to get the inbound first, modify the client, then update
  const inboundRes = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/get/${inboundId}`, {
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  const inboundData = await inboundRes.json();
  if (!inboundData?.success || !inboundData?.obj) return false;

  const inbound = inboundData.obj;
  const settings = JSON.parse(inbound.settings || "{}");
  const clients = settings.clients || [];
  
  let found = false;
  for (const client of clients) {
    if (client.email === email) {
      client.expiryTime = newExpiry;
      found = true;
      break;
    }
  }
  if (!found) return false;

  settings.clients = clients;

  // Update the inbound with new settings
  const formData = new URLSearchParams();
  formData.append("up", String(inbound.up));
  formData.append("down", String(inbound.down));
  formData.append("total", String(inbound.total));
  formData.append("remark", inbound.remark || "");
  formData.append("enable", String(inbound.enable));
  formData.append("expiryTime", String(inbound.expiryTime || 0));
  formData.append("listen", inbound.listen || "");
  formData.append("port", String(inbound.port));
  formData.append("protocol", inbound.protocol);
  formData.append("settings", JSON.stringify(settings));
  formData.append("streamSettings", inbound.streamSettings || "");
  formData.append("sniffing", inbound.sniffing || "");
  formData.append("allocate", inbound.allocate || "");

  const updateRes = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/update/${inboundId}`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  const updateBody = await updateRes.json();
  console.log("Update inbound result:", updateBody);
  return updateBody?.success === true;
}

// Verify Hupi signature
async function verifyHupiSign(params: Record<string, string>, appSecret: string): Promise<boolean> {
  const keys = Object.keys(params).filter(k => k !== "hash" && params[k] !== "").sort();
  const signStr = keys.map(k => `${k}=${params[k]}`).join("&");
  const expectedHash = await hmacMd5(appSecret, signStr);
  return expectedHash.toLowerCase() === (params.hash || "").toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const source = url.searchParams.get("source"); // "hupi" or "crypto-check"

    // === HUPI CALLBACK (POST from Hupi server) ===
    if (source === "hupi") {
      const formData = await req.formData();
      const params: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        params[key] = String(value);
      }

      console.log("Hupi callback params:", JSON.stringify(params));

      const tradeOrderNo = params.trade_order_no || ""; // Our order ID
      const status = params.status || "";

      if (status !== "OD") {
        return new Response("fail", { headers: corsHeaders });
      }

      // Get order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("trade_no", tradeOrderNo)
        .eq("status", "pending")
        .single();

      if (orderError || !order) {
        console.error("Order not found:", tradeOrderNo);
        return new Response("fail", { headers: corsHeaders });
      }

      // Get config for signature verification and panel access
      const { data: config } = await supabase.from("admin_config").select("*").limit(1).single();
      if (!config) return new Response("fail", { headers: corsHeaders });

      // Determine which app secret to use
      const appSecret = order.payment_method === "wechat"
        ? config.hupi_wechat_app_secret
        : config.hupi_alipay_app_secret;

      if (appSecret && !(await verifyHupiSign(params, appSecret))) {
        console.error("Invalid Hupi signature");
        return new Response("fail", { headers: corsHeaders });
      }

      // Mark order as paid
      await supabase.from("orders").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        notify_data: params,
      }).eq("id", order.id);

      // Extend expiry via 3x-ui
      const cookie = await login3xui(config.panel_url, config.panel_user, config.panel_pass);
      if (cookie) {
        const client = await findClient(config.panel_url, cookie, order.uuid);
        if (client) {
          const success = await extendExpiry(config.panel_url, cookie, client.inboundId, client.email, client.expiryTime, order.months);
          if (success) {
            await supabase.from("orders").update({ status: "fulfilled", fulfilled_at: new Date().toISOString() }).eq("id", order.id);
          } else {
            await supabase.from("orders").update({ status: "paid_unfulfilled" }).eq("id", order.id);
          }
        }
      }

      return new Response("success", { headers: corsHeaders });
    }

    // === CREATE ORDER (from frontend) ===
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "create-order") {
        const { uuid, planName, months, amount, paymentMethod, cryptoAmount, cryptoCurrency } = body;

        if (!uuid || !planName || !months || !amount || !paymentMethod) {
          return new Response(JSON.stringify({ error: "缺少必要参数" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const tradeNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const { data: order, error } = await supabase.from("orders").insert({
          uuid,
          plan_name: planName,
          months,
          amount,
          payment_method: paymentMethod,
          trade_no: tradeNo,
          crypto_amount: cryptoAmount || null,
          crypto_currency: cryptoCurrency || null,
          status: "pending",
        }).select().single();

        if (error) {
          return new Response(JSON.stringify({ error: "创建订单失败" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // If Hupi payment, create payment URL
        if (paymentMethod === "wechat" || paymentMethod === "alipay") {
          const { data: config } = await supabase.from("admin_config").select("*").limit(1).single();
          if (!config) {
            return new Response(JSON.stringify({ error: "系统配置未初始化" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const appId = paymentMethod === "wechat" ? config.hupi_wechat_app_id : config.hupi_alipay_app_id;
          const appSecret = paymentMethod === "wechat" ? config.hupi_wechat_app_secret : config.hupi_alipay_app_secret;

          if (!appId || !appSecret) {
            return new Response(JSON.stringify({ error: "支付配置未完成" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Build Hupi payment request
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const notifyUrl = `${supabaseUrl}/functions/v1/payment-callback?source=hupi`;

          const hupiParams: Record<string, string> = {
            version: "1.1",
            appid: appId,
            trade_order_id: tradeNo,
            total_fee: String(amount),
            title: `节点续费 - ${planName}`,
            time: String(Math.floor(Date.now() / 1000)),
            notify_url: notifyUrl,
            nonce_str: Math.random().toString(36).substring(2, 15),
          };

          // Generate signature
          const sortedKeys = Object.keys(hupiParams).filter(k => hupiParams[k] !== "").sort();
          const signStr = sortedKeys.map(k => `${k}=${hupiParams[k]}`).join("&");
          const hash = await hmacMd5(appSecret, signStr);
          hupiParams.hash = hash;

          // Call Hupi API
          const hupiUrl = paymentMethod === "wechat"
            ? "https://api.xunhupay.com/payment/do.html"
            : "https://api.xunhupay.com/payment/do.html";

          try {
            const hupiRes = await fetch(hupiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(hupiParams).toString(),
            });
            const hupiData = await hupiRes.json();
            console.log("Hupi create payment response:", hupiData);

            if (hupiData.openid || hupiData.url || hupiData.url_qrcode) {
              return new Response(JSON.stringify({
                success: true,
                orderId: order.id,
                tradeNo,
                payUrl: hupiData.url || hupiData.url_qrcode || "",
                qrCode: hupiData.url_qrcode || "",
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } else {
              return new Response(JSON.stringify({
                success: false,
                error: hupiData.errmsg || hupiData.errcode || "支付创建失败",
                orderId: order.id,
                tradeNo,
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch (err) {
            console.error("Hupi API error:", err);
            return new Response(JSON.stringify({
              success: false,
              error: "虎皮椒接口调用失败",
              orderId: order.id,
              tradeNo,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // For crypto payments, return order info for manual flow
        return new Response(JSON.stringify({
          success: true,
          orderId: order.id,
          tradeNo,
          cryptoAmount,
          cryptoCurrency,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // === CHECK ORDER STATUS ===
      if (action === "check-order") {
        const { orderId } = body;
        const { data: order } = await supabase.from("orders").select("status, fulfilled_at").eq("id", orderId).single();
        return new Response(JSON.stringify({ status: order?.status || "unknown" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Payment callback error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
