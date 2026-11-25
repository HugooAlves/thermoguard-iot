# ThermoGuard IoT

![ESP32](https://img.shields.io/badge/ESP32-IoT-red)
![C++](https://img.shields.io/badge/C%2B%2B-Firmware-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-API-3178C6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Hosting-F38020)

## Sobre o projeto

O ThermoGuard IoT é um sistema de monitoramento ambiental voltado para ambientes de servidores, desenvolvido como atividade acadêmica da disciplina de Arquitetura de Computadores.

O projeto integra um dispositivo IoT simulado, uma API REST, um banco de dados relacional e um dashboard web para acompanhamento de temperatura e umidade.

## Objetivo

Monitorar condições ambientais de infraestrutura computacional, identificando temperaturas elevadas e permitindo o acompanhamento remoto das informações coletadas.

## Arquitetura

```text
DHT22
  |
  v
ESP32 (Wokwi)
  |
  | HTTPS POST
  v
API REST (Supabase Edge Function)
  |
  v
PostgreSQL

Dashboard Web <-- HTTPS GET --> API REST
```

## Funcionalidades

- Coleta periódica de temperatura e umidade.
- Validação das leituras.
- Identificação de alertas térmicos.
- Comunicação por HTTPS.
- Armazenamento persistente no PostgreSQL.
- Consulta à última leitura e ao histórico.
- Dashboard responsivo.
- Gráficos de temperatura e umidade.
- Detecção de dados desatualizados.
- Atualização automática do painel.

## Configurações do sistema

| Parâmetro | Valor |
|---|---|
| Dispositivo | SRV-001 |
| Microcontrolador | ESP32 |
| Sensor | DHT22 |
| Intervalo de coleta | 5 segundos |
| Limite de alerta | 30 °C |
| Limite de desatualização | 15 segundos |
| Comunicação | HTTPS |

Os limites utilizados possuem finalidade acadêmica e demonstrativa.

## Endpoints da API

| Método | Endpoint | Descrição |
|---|---|---|
| POST | /telemetry | Receber leituras |
| GET | /telemetry/latest | Consultar última leitura |
| GET | /telemetry/history | Consultar histórico |
| GET | /telemetry/stats | Consultar estatísticas recentes |

As requisições POST exigem autenticação pelo cabeçalho `x-device-key`.

As consultas GET disponibilizam exclusivamente os dados simulados do dispositivo.

## Como reproduzir

### 1. Banco de dados

- Criar um projeto no Supabase.
- Executar o arquivo `database/schema.sql` no SQL Editor.

### 2. API REST

- Criar uma Edge Function chamada `telemetry`.
- Inserir o código disponível em `supabase/functions/telemetry/index.ts`.
- Configurar o secret `DEVICE_API_KEY` com uma chave aleatória.
- Desabilitar a verificação JWT da função, conforme o arquivo `config.toml`.
- Publicar a função e copiar sua URL.

### 3. Simulação IoT

- Criar um projeto ESP32 no Wokwi.
- Copiar os arquivos disponíveis na pasta `wokwi`.
- Configurar a URL da API no firmware.
- Iniciar a simulação.
- Informar a chave do dispositivo pelo monitor serial.
- Verificar o retorno HTTP 201.

### 4. Frontend

- Configurar a URL da API no arquivo `frontend/script.js`.
- Abrir um terminal na pasta `frontend`.
- Executar:

```bash
python -m http.server 8000
```

- Acessar `http://localhost:8000`.

## Relação com Arquitetura de Computadores

O projeto aplica conceitos de processamento, memória RAM, memória Flash, interfaces GPIO, entrada e saída de dados, comunicação em rede, temporização e arquitetura distribuída.

## Segurança

As credenciais privilegiadas do PostgreSQL permanecem exclusivamente no backend. A chave de autenticação do dispositivo não deve ser publicada no repositório.

## Limitações e status

- Projeto desenvolvido em ambiente simulado.
- Dependência da disponibilidade do gateway de internet do Wokwi.
- Ausência de armazenamento local das leituras durante falhas de conexão.
- Validação do certificado TLS pendente no firmware.
- Teste completo da transmissão ESP32–API–frontend pendente de validação.

## Links

- Simulação Wokwi: [https://wokwi.com/projects/481529673802472449]
- Dashboard publicado: [https://thermoguard-iot.hugoalvesdasilva49.workers.dev/]
- API REST: [http://127.0.0.1:5500/index.html]
- Vídeo de demonstração: [Inserir link]

## Contexto acadêmico

Universidade de Marília — Unimar

Curso de Inteligência Artificial

Disciplina: Arquitetura de Computadores

Desenvolvedor: [Hugo Alves da Silva, João Daniel, Gabriel Saes, Gabriel Marques]