
#include <DHT.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ===================================
// CONFIGURACOES DO SENSOR
// ===================================

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

const float LIMITE_TEMPERATURA = 30.0;
const unsigned long INTERVALO_COLETA = 5000;

// ===================================
// CONFIGURACOES DA REDE
// ===================================

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// ===================================
// CONFIGURACOES DA API
// ===================================

const char* API_URL =
  "https://jgohxukmfujgnwqwkizt.supabase.co/functions/v1/telemetry";

String deviceApiKey = "";

const char* DEVICE_ID = "SRV-001";

unsigned long ultimaColeta = 0;

// ===================================
// RECEBER CHAVE PELO MONITOR SERIAL
// ===================================

void configurarChave() {

  Serial.setTimeout(1000);

  Serial.println();
  Serial.println("Digite a DEVICE_API_KEY e pressione ENTER:");

  while (deviceApiKey.length() == 0) {

    if (Serial.available() > 0) {

      String entrada = Serial.readStringUntil('\n');

      entrada.trim();

      if (entrada.length() > 0) {
        deviceApiKey = entrada;
      }
    }

    delay(100);
  }

  Serial.println("Chave recebida com sucesso!");
}

// ===================================
// CONEXAO WIFI
// ===================================

bool conectarWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("Iniciando conexao WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  delay(1000);

  WiFi.begin("Wokwi-GUEST", "");

  unsigned long inicio = millis();

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");

    if (millis() - inicio >= 30000) {

      Serial.println("\nFalha na conexao WiFi.");
      Serial.print("Status WiFi: ");
      Serial.println(WiFi.status());

      return false;
    }
  }

  Serial.println("\nWiFi conectado!");

  Serial.print("Endereco IP: ");
  Serial.println(WiFi.localIP());

  return true;
}

// ===================================
// ENVIO DOS DADOS PARA A API
// ===================================

void enviarDados(float temperatura, float umidade) {

  if (!conectarWiFi()) {
    Serial.println("Envio cancelado: sem conexao.");
    return;
  }

  WiFiClientSecure client;

  // Apenas para a simulacao inicial.
  // Nao valida o certificado do servidor.
  client.setInsecure();

  HTTPClient http;

  if (!http.begin(client, API_URL)) {
    Serial.println("Erro ao inicializar HTTPS.");
    return;
  }

  http.setConnectTimeout(5000);
  http.setTimeout(5000);

  // Cabecalhos HTTP
  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.addHeader(
    "x-device-key",
    deviceApiKey
  );

  // Montagem do JSON
  String json = "{";

  json += "\"device_id\":\"";
  json += DEVICE_ID;
  json += "\",";

  json += "\"temperature\":";
  json += String(temperatura, 1);
  json += ",";

  json += "\"humidity\":";
  json += String(umidade, 1);

  json += "}";

  Serial.println("Enviando JSON:");
  Serial.println(json);

  // Requisicao POST
  int httpCode = http.POST(json);

  if (httpCode > 0) {

    Serial.print("Codigo HTTP: ");
    Serial.println(httpCode);

    if (httpCode == 201) {

      Serial.println(
        "Leitura armazenada com sucesso!"
      );

    } else {

      Serial.println("Resposta da API:");
      Serial.println(http.getString());

    }

  } else {

    Serial.print("Falha na transmissao: ");
    Serial.println(http.errorToString(httpCode));

  }

  // Libera os recursos da conexao
  http.end();
}

// ===================================
// INICIALIZACAO
// ===================================

void setup() {

  Serial.begin(115200);

  dht.begin();

  Serial.println("==========================");
  Serial.println("ThermoGuard IoT");
  Serial.println("Dispositivo: SRV-001");
  Serial.println("==========================");

  configurarChave();

  conectarWiFi();

  ultimaColeta = millis();
}

// ===================================
// LOOP PRINCIPAL
// ===================================

void loop() {

  unsigned long tempoAtual = millis();

  if (tempoAtual - ultimaColeta
      >= INTERVALO_COLETA) {

    ultimaColeta = tempoAtual;

    float temperatura = dht.readTemperature();
    float umidade = dht.readHumidity();

    // Validacao das leituras
    if (
      isnan(temperatura) ||
      isnan(umidade) ||
      temperatura < -40 ||
      temperatura > 80 ||
      umidade < 0 ||
      umidade > 100
    ) {

      Serial.println("Leitura invalida!");
      return;

    }

    bool alerta =
      temperatura >= LIMITE_TEMPERATURA;

    Serial.println("--------------------------");

    Serial.print("Temperatura: ");
    Serial.print(temperatura, 1);
    Serial.println(" C");

    Serial.print("Umidade: ");
    Serial.print(umidade, 1);
    Serial.println(" %");

    Serial.print("Status: ");
    Serial.println(
      alerta ? "ALERTA TERMICO" : "NORMAL"
    );

    enviarDados(temperatura, umidade);

  }

  delay(10);
}
