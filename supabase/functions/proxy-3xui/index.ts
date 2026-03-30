import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Create HTTP client that skips SSL certificate verification
// (needed for self-signed certs commonly used by 3x-ui panels)
let unsafeClient: Deno.HttpClient | undefined;
try {
  unsafeClient = Deno.createHttpClient({ caCerts: [] });
} catch {
  console.warn("Could not create unsafe HTTP client, falling back to default");
}

function fetchUnsafe(url: string, init?: RequestInit): Promise<Response> {
  if (unsafeClient) {
    return fetch(url, { ...init, client: unsafeClient } as any);
  }
  return fetch(url, init);
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function verifyToken(token: string): string | null {
  try {
    const decoded = atob(token);
    const [id] = decoded.split(":");
    return id || null;
  } catch {
    return null;
  }
}

// Helper: Login to 3x-ui panel and get session cookie
async function login3xui(panelUrl: string, username: string, password: string): Promise<{ cookie: string | null; error?: string }> {
  const baseUrl = panelUrl.replace(/\/+$/, "");
  const loginUrl = `${baseUrl}/login`;
  console.log("Attempting 3x-ui login at:", loginUrl);
  try {
    const res = await fetchUnsafe(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });

    console.log("3x-ui login response status:", res.status);
    const resBody = await res.text();
    console.log("3x-ui login response body:", resBody.substring(0, 500));

    // Extract Set-Cookie header
    const setCookie = res.headers.get("set-cookie");
    console.log("3x-ui set-cookie:", setCookie);

    let cookie: string | null = null;
    if (setCookie) {
      const match = setCookie.match(/([^=]+=[^;]+)/);
      cookie = match ? match[1] : null;
    }

    // Parse response body
    try {
      const json = JSON.parse(resBody);
      if (json.success === false) {
        return { cookie: null, error: json.msg || "登录失败：账号或密码错误" };
      }
      if (json.success === true && cookie) {
        return { cookie };
      }
      // If success but no cookie, try to find it in response headers
      if (json.success === true) {
        return { cookie: null, error: "登录成功但未获取到 Session Cookie" };
      }
    } catch {
      // Not JSON response
    }

    if (cookie) return { cookie };
    return { cookie: null, error: `面板返回状态码 ${res.status}，未获取到登录凭证` };
  } catch (err) {
    console.error("3x-ui login failed:", err);
    return { cookie: null, error: `无法连接到面板: ${String(err).substring(0, 200)}` };
  }
}

// Helper: Get all inbounds from 3x-ui
async function getInbounds(panelUrl: string, cookie: string) {
  const baseUrl = panelUrl.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/panel/api/inbounds/list`, {
    method: "GET",
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  return await res.json();
}

// Find client by UUID in all inbounds
function findClientByUuid(inboundsData: any, uuid: string) {
  if (!inboundsData?.success || !inboundsData?.obj) return null;

  for (const inbound of inboundsData.obj) {
    try {
      const settings = JSON.parse(inbound.settings || "{}");
      const clients = settings.clients || [];
      for (const client of clients) {
        if (client.id === uuid || client.password === uuid) {
          // Found the client - get traffic stats
          const clientStats = inbound.clientStats?.find(
            (s: any) => s.email === client.email
          );
          return {
            found: true,
            email: client.email,
            expiryTime: client.expiryTime || inbound.expiryTime || 0,
            up: clientStats?.up || 0,
            down: clientStats?.down || 0,
            total: client.totalGB ? client.totalGB * 1073741824 : clientStats?.total || 0,
            inboundId: inbound.id,
            enable: clientStats?.enable ?? client.enable ?? true,
          };
        }
      }
    } catch {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, token, uuid } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "test") {
      // Verify admin token
      const configId = verifyToken(token);
      if (!configId) {
        return new Response(JSON.stringify({ error: "未授权" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use panel params from request body (form values), not DB
      const testUrl = body.panelUrl || "";
      const testUser = body.panelUser || "";
      const testPass = body.panelPass || "";

      if (!testUrl) {
        return new Response(JSON.stringify({ success: false, error: "请输入面板 URL" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await login3xui(testUrl, testUser, testPass);
      if (result.cookie) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: result.error || "无法连接到面板" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "lookup") {
      if (!uuid || typeof uuid !== "string") {
        return new Response(JSON.stringify({ error: "请提供有效的 UUID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get config from DB for lookup
      const { data: configData, error: configError } = await supabase.from("admin_config").select("*").limit(1).single();
      if (configError || !configData) {
        return new Response(JSON.stringify({ error: "系统配置未初始化" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { panel_url, panel_user, panel_pass } = configData;

      // Login to 3x-ui
      const loginResult = await login3xui(panel_url, panel_user, panel_pass);
      if (!loginResult.cookie) {
        return new Response(JSON.stringify({ success: false, error: loginResult.error || "无法连接到 3x-ui 面板" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cookie = loginResult.cookie;

      // Get inbounds and search for UUID
      const inboundsData = await getInbounds(panel_url, cookie);
      const client = findClientByUuid(inboundsData, uuid);

      if (!client) {
        return new Response(JSON.stringify({ success: false, error: "未找到该 UUID 对应的节点用户" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate traffic in GB
      const trafficUsedGB = (client.up + client.down) / 1073741824;
      const trafficTotalGB = client.total > 0 ? client.total / 1073741824 : 999;

      return new Response(JSON.stringify({
        success: true,
        email: client.email,
        expiryDate: client.expiryTime,
        trafficUsed: Math.round(trafficUsedGB * 100) / 100,
        trafficTotal: Math.round(trafficTotalGB * 100) / 100,
        enable: client.enable,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
