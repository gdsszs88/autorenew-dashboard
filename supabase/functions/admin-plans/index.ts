import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, token, plan } = await req.json();

    const configId = verifyToken(token);
    if (!configId) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "list") {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ plans: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const { data, error } = await supabase
        .from("plans")
        .insert({
          title: plan.title || "新套餐",
          category: plan.category || "exclusive",
          duration_months: plan.duration_months || 1,
          duration_days: plan.duration_days || 30,
          price: plan.price || 0,
          description: plan.description || "",
          sort_order: plan.sort_order || 99,
          featured: plan.featured || false,
          enabled: plan.enabled !== false,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, plan: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { error } = await supabase
        .from("plans")
        .update({
          title: plan.title,
          category: plan.category,
          duration_months: plan.duration_months,
          duration_days: plan.duration_days,
          price: plan.price,
          description: plan.description,
          sort_order: plan.sort_order,
          featured: plan.featured,
          enabled: plan.enabled,
        })
        .eq("id", plan.id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("plans")
        .delete()
        .eq("id", plan.id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
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
