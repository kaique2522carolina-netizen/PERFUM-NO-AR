/**
 * Netlify Function: /api/superfrete
 *
 * Proxy reverso para a API do SuperFrete.
 * Resolve o bloqueio de CORS: o browser chama /api/superfrete
 * e esta função chama o SuperFrete no servidor (sem restrição de CORS).
 *
 * Variável de ambiente obrigatória no painel da Netlify:
 *   SUPERFRETE_TOKEN  →  seu Bearer token do SuperFrete
 */

const SUPERFRETE_BASE =
  process.env.SUPERFRETE_ENV === "production"
    ? "https://app.superfrete.com"
    : "https://sandbox.superfrete.com";

exports.handler = async function (event) {
  /* ── CORS preflight ───────────────────────────────────────── */
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  /* ── Resolve o endpoint do SuperFrete ────────────────────── */
  // A URL chega como: /api/superfrete/api/v0/cart
  // Precisamos extrair a parte após /api/superfrete
  const prefix = "/.netlify/functions/superfrete";
  let sfPath = event.path.startsWith(prefix)
    ? event.path.slice(prefix.length)
    : event.path.replace(/^\/api\/superfrete/, "");

  if (!sfPath || sfPath === "") sfPath = "/";

  // Repassa query string, se houver
  const qs = event.rawQuery ? `?${event.rawQuery}` : "";
  const url = `${SUPERFRETE_BASE}${sfPath}${qs}`;

  /* ── Token ───────────────────────────────────────────────── */
  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "SUPERFRETE_TOKEN não configurado nas variáveis de ambiente da Netlify." }),
    };
  }

  /* ── Faz a requisição para o SuperFrete ──────────────────── */
  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "PerfumeNoAr/1.0",
      },
      body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
    });

    let body;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await response.text(); // mantém como string para repassar direto
    } else {
      body = await response.text();
    }

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType || "application/json",
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Erro ao conectar com o SuperFrete.", detail: err.message }),
    };
  }
};
