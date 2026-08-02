// Proxy para a API do M-Pesa (porta 18352).
// O runtime da aplicação só permite ligações às portas 80/443, por isso o
// pedido C2B é encaminhado a partir daqui.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { url, token, body } = await req.json();

    if (typeof url !== "string" || !/^https:\/\/api(\.sandbox)?\.vm\.co\.mz:\d+\//.test(url)) {
      return new Response(JSON.stringify({ error: "URL inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "developer.mpesa.vm.co.mz",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(
      JSON.stringify({ status: upstream.status, body: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
