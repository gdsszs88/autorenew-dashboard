import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: fetch with automatic HTTP fallback when HTTPS has cert issues
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

// Generate random string
function randomStr(len: number, charset: string): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => charset[b % charset.length]).join("");
}

// Generate random UUID v4
function randomUUID(): string {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "缺少 orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get order - must be paid/fulfilled and type "new"
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "订单不存在" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["paid", "fulfilled"].includes(order.status)) {
      return new Response(JSON.stringify({ error: "订单未支付" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin config
    const { data: config } = await supabase.from("admin_config").select("*").limit(1).single();
    if (!config) {
      return new Response(JSON.stringify({ error: "系统配置未初始化" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const salesInboundId = (config as any).sales_inbound_id ?? 1;
    const salesProtocol = (config as any).sales_protocol ?? "mixed";

    // Login to 3x-ui
    const cookie = await login3xui(config.panel_url, config.panel_user, config.panel_pass);
    if (!cookie) {
      return new Response(JSON.stringify({ error: "无法连接到面板" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = config.panel_url.replace(/\/+$/, "");

    // Get current inbound to understand its structure
    const inboundRes = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/get/${salesInboundId}`, {
      headers: { Cookie: cookie, Accept: "application/json" },
    });
    const inboundData = await inboundRes.json();
    if (!inboundData?.success || !inboundData?.obj) {
      return new Response(JSON.stringify({ error: `入站 #${salesInboundId} 不存在` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inbound = inboundData.obj;
    const protocol = inbound.protocol; // actual protocol of the inbound

    // Calculate expiry: order.months * 30 days from now
    const expiryTime = Date.now() + order.months * 30 * 24 * 60 * 60 * 1000;

    // Remark/email for the new client
    const remark = `新购_${order.trade_no || order.id.substring(0, 8)}`;

    let credentials: Record<string, string> = {};
    let clientSettings: any;

    if (protocol === "socks" || salesProtocol === "mixed") {
      // SOCKS5 / mixed: generate username + password
      const username = randomStr(8, "abcdefghijklmnopqrstuvwxyz0123456789");
      const password = randomStr(10, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
      credentials = { protocol: "socks", username, password };

      // For SOCKS5, add to accounts array
      const settings = JSON.parse(inbound.settings || "{}");
      const accounts = Array.isArray(settings.accounts) ? settings.accounts : [];
      accounts.push({ user: username, pass: password });
      settings.accounts = accounts;

      // Update inbound with new account
      const formData = new URLSearchParams();
      formData.append("up", String(inbound.up));
      formData.append("down", String(inbound.down));
      formData.append("total", String(inbound.total));
      formData.append("remark", inbound.remark || "");
      formData.append("enable", String(inbound.enable));
      formData.append("expiryTime", String(expiryTime));
      formData.append("listen", inbound.listen || "");
      formData.append("port", String(inbound.port));
      formData.append("protocol", protocol);
      formData.append("settings", JSON.stringify(settings));
      formData.append("streamSettings", inbound.streamSettings || "");
      formData.append("sniffing", inbound.sniffing || "");
      formData.append("allocate", inbound.allocate || "");

      const updateRes = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/update/${salesInboundId}`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
      const updateBody = await updateRes.json();
      console.log("SOCKS5 add account result:", updateBody);

      if (!updateBody?.success) {
        return new Response(JSON.stringify({ error: "添加用户到面板失败" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // VMESS / VLESS / Trojan: generate UUID and use addClient API
      const clientId = randomUUID();
      credentials = { protocol, uuid: clientId };

      clientSettings = {
        clients: [
          {
            id: clientId,
            alterId: 0,
            email: remark,
            limitIp: 0,
            totalGB: 0,
            expiryTime: expiryTime,
            enable: true,
            tgId: "",
            subId: "",
          },
        ],
      };

      const addClientBody = {
        id: salesInboundId,
        settings: JSON.stringify(clientSettings),
      };

      const addRes = await fetchUnsafe(`${baseUrl}/panel/api/inbounds/addClient`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(addClientBody),
      });
      const addBody = await addRes.json();
      console.log("addClient result:", addBody);

      if (!addBody?.success) {
        return new Response(JSON.stringify({ error: "添加客户端到面板失败: " + (addBody?.msg || "") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update order status to fulfilled
    await supabase
      .from("orders")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        credentials,
        remark,
        expiryTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-client error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
