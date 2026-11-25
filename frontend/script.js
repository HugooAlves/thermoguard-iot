
// ========================================
// CONFIGURACOES
// ========================================

const API_URL =
    "https://jgohxukmfujgnwqwkizt.supabase.co/functions/v1/telemetry";

const UPDATE_INTERVAL = 5000;
const STALE_LIMIT = 15000;
const TEMPERATURE_LIMIT = 30;

let lastReading = null;
let apiError = false;
let updating = false;

const $ = (id) => document.getElementById(id);

// ========================================
// CONFIGURACAO DOS GRAFICOS
// ========================================

Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "#263449";

function createChart(id, label, color, temperature = false) {

    const datasets = [
        {
            label: label,
            data: [],
            borderColor: color,
            backgroundColor: color + "18",
            fill: true,
            tension: 0.25,
            pointRadius: 2,
            borderWidth: 2
        }
    ];

    if (temperature) {
        datasets.push({
            label: "Limite de alerta",
            data: [],
            borderColor: "#f87171",
            borderDash: [6, 5],
            pointRadius: 0,
            borderWidth: 1.5
        });
    }

    return new Chart($(id), {
        type: "line",

        data: {
            labels: [],
            datasets: datasets
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 7
                    },
                    grid: {
                        display: false
                    }
                },

                y: temperature
                    ? {
                        title: {
                            display: true,
                            text: "Temperatura (°C)"
                        }
                    }
                    : {
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: "Umidade (%)"
                        }
                    }
            }
        }
    });
}

const temperatureChart = createChart(
    "temperatureChart",
    "Temperatura",
    "#38bdf8",
    true
);

const humidityChart = createChart(
    "humidityChart",
    "Umidade",
    "#2dd4bf"
);

// ========================================
// COMUNICACAO COM A API
// ========================================

async function fetchData(endpoint) {

    const response = await fetch(
        API_URL + endpoint,
        {
            cache: "no-store",
            signal: AbortSignal.timeout(8000)
        }
    );

    if (!response.ok) {
        throw new Error(
            `Erro HTTP: ${response.status}`
        );
    }

    return await response.json();
}

// ========================================
// FORMATACAO
// ========================================

function formatNumber(value) {

    if (value === null || value === undefined) {
        return "--";
    }

    return Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

function formatTime(value) {

    return new Date(value).toLocaleTimeString(
        "pt-BR"
    );
}

// ========================================
// ATUALIZACAO DOS INDICADORES
// ========================================

function updateCards(reading) {

    if (!reading) {
        lastReading = null;

        $("temperature").textContent = "--";
        $("humidity").textContent = "--";
        $("thermal").textContent = "--";
        $("thermal").className = "value status-value";
        $("last-update").textContent = "--:--:--";

        return;
    }

    lastReading = reading;

    $("temperature").textContent =
        formatNumber(reading.temperature);

    $("humidity").textContent =
        formatNumber(reading.humidity);

    $("last-update").textContent =
        formatTime(reading.created_at);

    $("last-update").title =
        new Date(reading.created_at)
            .toLocaleString("pt-BR");

    const alert =
        reading.temperature >= TEMPERATURE_LIMIT;

    $("thermal").textContent =
        alert ? "Alerta" : "Normal";

    $("thermal").className =
        "value status-value " +
        (alert ? "danger" : "normal");

    $("temperature").style.color =
        alert ? "#f87171" : "#38bdf8";
}

// ========================================
// STATUS DE CONEXAO E ALERTAS
// ========================================

function updateStatus() {

    const connection = $("connection");
    const notification = $("notification");

    if (!lastReading) {

        connection.textContent =
            apiError ? "API indisponível" : "Sem dados";

        connection.className = "badge offline";

        $("data-age").textContent =
            "Aguardando leitura";

        notification.className = "notification stale";
        notification.textContent =
            "Nenhuma leitura disponível.";

        return;
    }

    const age = Math.max(
        0,
        Date.now() -
        new Date(lastReading.created_at).getTime()
    );

    const seconds = Math.floor(age / 1000);

    $("data-age").textContent =
        `Recebida há ${seconds} s`;

    // Dados desatualizados ou falha na consulta
    if (apiError || age > STALE_LIMIT) {

        connection.textContent = "Desatualizado";
        connection.className = "badge offline";

        notification.className = "notification stale";

        notification.textContent = apiError
            ? "Falha ao consultar a API. Exibindo os últimos dados recebidos."
            : "Transmissão interrompida ou atrasada. Exibindo a última leitura.";

        return;
    }

    connection.textContent = "Online";
    connection.className = "badge online";

    // Alerta termico
    if (lastReading.temperature >= TEMPERATURE_LIMIT) {

        notification.className = "notification alert";

        notification.textContent =
            "ALERTA TÉRMICO: temperatura igual ou superior a 30 °C.";

    } else {

        notification.className = "notification success";

        notification.textContent =
            "Sistema operacional. Temperatura dentro do limite definido.";
    }
}

// ========================================
// ATUALIZACAO DOS GRAFICOS
// ========================================

function updateCharts(history) {

    const labels = history.map(
        item => formatTime(item.created_at)
    );

    temperatureChart.data.labels = labels;

    temperatureChart.data.datasets[0].data =
        history.map(item => item.temperature);

    temperatureChart.data.datasets[1].data =
        history.map(() => TEMPERATURE_LIMIT);

    humidityChart.data.labels = labels;

    humidityChart.data.datasets[0].data =
        history.map(item => item.humidity);

    temperatureChart.update("none");
    humidityChart.update("none");
}

// ========================================
// ESTATISTICAS
// ========================================

function updateStats(stats) {

    $("average").textContent =
        stats.average == null
            ? "--"
            : formatNumber(stats.average) + " °C";

    $("maximum").textContent =
        stats.maximum == null
            ? "--"
            : formatNumber(stats.maximum) + " °C";

    $("minimum").textContent =
        stats.minimum == null
            ? "--"
            : formatNumber(stats.minimum) + " °C";

    $("alerts").textContent = stats.alerts ?? 0;
}

// ========================================
// HISTORICO EM TABELA
// ========================================

function updateTable(history) {

    const tbody = $("history-body");

    tbody.replaceChildren();

    const recent = [...history]
        .reverse()
        .slice(0, 10);

    recent.forEach(reading => {

        const row = document.createElement("tr");

        const values = [
            formatTime(reading.created_at),
            reading.device_id,
            formatNumber(reading.temperature) + " °C",
            formatNumber(reading.humidity) + "%",
            reading.alert ? "Alerta" : "Normal"
        ];

        values.forEach((value, index) => {

            const cell = document.createElement("td");

            cell.textContent = value;

            if (index === 4) {
                cell.className =
                    reading.alert ? "danger" : "normal";
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

// ========================================
// ATUALIZACAO GERAL DO PAINEL
// ========================================

async function updateDashboard() {

    if (updating) return;

    updating = true;

    try {

        const [latest, history, stats] =
            await Promise.all([
                fetchData("/latest"),
                fetchData("/history?limit=50"),
                fetchData("/stats")
            ]);

        updateCards(latest);
        updateCharts(history);
        updateStats(stats);
        updateTable(history);

        apiError = false;

    } catch (error) {

        apiError = true;

        console.error(
            "Erro ao atualizar dashboard:",
            error
        );

    } finally {

        updating = false;

        updateStatus();
    }
}

// ========================================
// INICIALIZACAO
// ========================================

updateDashboard();

setInterval(
    updateDashboard,
    UPDATE_INTERVAL
);

setInterval(
    updateStatus,
    1000
);
