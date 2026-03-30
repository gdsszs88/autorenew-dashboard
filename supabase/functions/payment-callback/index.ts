import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function safeAdd(x: number, y: number) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function bitRotateLeft(num: number, cnt: number) {
  return (num << cnt) | (num >>> (32 - cnt));
}

function md5Cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5Ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5Gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5Hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5Ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn(c ^ (b | ~d), a, b, x, s, t);
}

function binlMd5(x: number[], len: number) {
  x[len >> 5] |= 0x80 << (len % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const oldA = a;
    const oldB = b;
    const oldC = c;
    const oldD = d;

    a = md5Ff(a, b, c, d, x[i], 7, -680876936);
    d = md5Ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5Ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5Ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5Ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5Ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5Ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5Ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5Ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5Ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5Ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5Ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5Ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5Ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5Ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5Ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = md5Gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5Gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5Gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5Gg(b, c, d, a, x[i], 20, -373897302);
    a = md5Gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5Gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5Gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5Gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5Gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5Gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5Gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5Gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5Gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5Gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5Gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5Gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = md5Hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5Hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5Hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5Hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5Hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5Hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5Hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5Hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5Hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5Hh(d, a, b, c, x[i], 11, -358537222);
    c = md5Hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5Hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5Hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5Hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5Hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5Hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = md5Ii(a, b, c, d, x[i], 6, -198630844);
    d = md5Ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5Ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5Ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5Ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5Ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5Ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5Ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5Ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5Ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5Ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5Ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5Ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5Ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5Ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5Ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = safeAdd(a, oldA);
    b = safeAdd(b, oldB);
    c = safeAdd(c, oldC);
    d = safeAdd(d, oldD);
  }

  return [a, b, c, d];
}

function rstr2binl(input: string) {
  const output = Array<number>(((input.length + 3) >> 2)).fill(0);
  for (let i = 0; i < input.length * 8; i += 8) {
    output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
  }
  return output;
}

function binl2rstr(input: number[]) {
  let output = "";
  for (let i = 0; i < input.length * 32; i += 8) {
    output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
  }
  return output;
}

function rstrMd5(input: string) {
  return binl2rstr(binlMd5(rstr2binl(input), input.length * 8));
}

function rstrHmacMd5(key: string, data: string) {
  let bkey = rstr2binl(key);
  if (bkey.length > 16) bkey = rstr2binl(rstrMd5(key));

  const ipad = Array<number>(16).fill(0);
  const opad = Array<number>(16).fill(0);

  for (let i = 0; i < 16; i += 1) {
    const value = bkey[i] ?? 0;
    ipad[i] = value ^ 0x36363636;
    opad[i] = value ^ 0x5c5c5c5c;
  }

  const hash = binlMd5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binlMd5(opad.concat(hash), 512 + 128));
}

function rstr2hex(input: string) {
  const hexTab = "0123456789abcdef";
  let output = "";
  for (let i = 0; i < input.length; i += 1) {
    const value = input.charCodeAt(i);
    output += hexTab.charAt((value >>> 4) & 0x0f) + hexTab.charAt(value & 0x0f);
  }
  return output;
}

function toRawString(input: string) {
  return Array.from(new TextEncoder().encode(input), (byte) => String.fromCharCode(byte)).join("");
}

async function hmacMd5(key: string, message: string): Promise<string> {
  return rstr2hex(rstrHmacMd5(toRawString(key), toRawString(message)));
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
