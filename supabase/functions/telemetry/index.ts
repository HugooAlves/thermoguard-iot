
import { createClient } from "npm:@supabase/supabase-js@2";

// Configuracoes do banco de dados
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SUPABASE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(
    Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"
  ).default;

const DEVICE_API_KEY = Deno.env.get("DEVICE_API_KEY");

// Configuracoes do projeto
const TABLE_NAME = "readings";
const DEVICE_ID = "SRV-001";

// Cliente do Supabase
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Configuracao de acesso pelo frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-device-key",
};

// Funcao auxiliar para respostas JSON
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// Funcao principal da API
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.split("/telemetry")[1] || "/";

  // Permite requisicoes do navegador
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {

    // =====================================
    // POST /telemetry
    // Receber e armazenar leituras
    // =====================================

    if (req.method === "POST" && route === "/") {

      const deviceKey = req.headers.get("x-device-key");

      if (!DEVICE_API_KEY || deviceKey !== DEVICE_API_KEY) {
        return response({
          error: "Dispositivo nao autorizado",
        }, 401);
      }

      let body;

      try {
        body = await req.json();
      } catch {
        return response({
          error: "JSON invalido",
        }, 400);
      }

      if (!body || typeof body !== "object") {
        return response({
          error: "Corpo da requisicao invalido",
        }, 400);
      }

      const { device_id, temperature, humidity } = body;

      // Validacao do dispositivo
      if (device_id !== DEVICE_ID) {
        return response({
          error: "Dispositivo invalido",
        }, 400);
      }

      // Validacao da temperatura
      if (
        typeof temperature !== "number" ||
        !Number.isFinite(temperature) ||
        temperature < -40 ||
        temperature > 80
      ) {
        return response({
          error: "Temperatura invalida",
        }, 400);
      }

      // Validacao da umidade
      if (
        typeof humidity !== "number" ||
        !Number.isFinite(humidity) ||
        humidity < 0 ||
        humidity > 100
      ) {
        return response({
          error: "Umidade invalida",
        }, 400);
      }

      // Insercao no PostgreSQL
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({
          device_id,
          temperature,
          humidity,
        })
        .select()
        .single();

      if (error) throw error;

      console.log("Leitura recebida:", data);

      return response({
        message: "Leitura armazenada com sucesso",
        reading: data,
      }, 201);
    }

    // =====================================
    // GET /telemetry/latest
    // Retornar a leitura mais recente
    // =====================================

    if (req.method === "GET" && route === "/latest") {

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("device_id", DEVICE_ID)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return response(data);
    }

    // =====================================
    // GET /telemetry/history
    // Retornar o historico de leituras
    // =====================================

    if (req.method === "GET" && route === "/history") {

      const limit = Number(
        url.searchParams.get("limit") ?? "50"
      );

      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 200
      ) {
        return response({
          error: "Limite deve estar entre 1 e 200",
        }, 400);
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("device_id", DEVICE_ID)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return response(data.reverse());
    }

    // =====================================
    // GET /telemetry/stats
    // Estatisticas das ultimas 100 leituras
    // =====================================

    if (req.method === "GET" && route === "/stats") {

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("temperature, alert")
        .eq("device_id", DEVICE_ID)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(100);

      if (error) throw error;

      const temperatures = data.map(
        item => item.temperature
      );

      const total = temperatures.length;

      return response({
        total,
        average: total
          ? Number((
              temperatures.reduce((a, b) => a + b, 0)
              / total
            ).toFixed(2))
          : null,
        maximum: total ? Math.max(...temperatures) : null,
        minimum: total ? Math.min(...temperatures) : null,
        alerts: data.filter(item => item.alert).length,
      });
    }

    return response({
      error: "Rota nao encontrada",
    }, 404);

  } catch (error) {

    console.error("Erro interno:", error);

    return response({
      error: "Erro interno do servidor",
    }, 500);
  }
});
