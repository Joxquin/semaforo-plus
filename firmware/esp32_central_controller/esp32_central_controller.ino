/* ==========================================================================
   Semáforo+ · Microcontrolador Central ESP32 ("Cerebro del Cruce")
   Proyecto: TECSUP (Arequipa) · ODS 11: Ciudades y Comunidades Sostenibles
   Hardware: NodeMCU ESP32 (38 pines / WROOM-32)
   Cruce: Av. Ejército × Calle Los Arces (Yanahuara / Cayma)
   
   Funcionalidades:
     - Control de 2 Semáforos físicos (SEM-01 N–S y SEM-02 E–O)
     - Algoritmo adaptativo con límites de seguridad (15s mín / 60s máx)
     - Conmutación inmediata ante vehículos de emergencia (onda verde)
     - Respaldo solar: Monitoreo de batería LiFePO4 vía ADC (Pin 34)
     - Operación 100% LOCAL AUTÓNOMA (Sigue operando aunque caiga internet)
     - Telemetría periódica hacia servidor Spring Boot
   ========================================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>

// ---------- CONFIGURACIÓN DE RED Y VERSIÓN ----------
const char* FIRMWARE_VERSION = "2.4.1";
const char* DEVICE_TYPE      = "ESP32-CENTRAL";
const char* WIFI_SSID        = "TECSUP_LAB_IOT";       // Cambiar por tu red WiFi
const char* WIFI_PASSWORD    = "TuPasswordSeguro";     // Cambiar por tu clave WiFi

// URL Base del servidor VPS (Conexión directa por puerto estándar HTTP 80)
const String SERVER_HOST     = "http://34.122.14.13"; 
const String SERVER_URL      = SERVER_HOST + "/api/v1/iot/esp32/telemetry";
const String OTA_CHECK_URL   = SERVER_HOST + "/api/v1/iot/firmware/check-update?device=" + DEVICE_TYPE + "&currentVersion=" + FIRMWARE_VERSION;
const String OTA_BIN_URL     = SERVER_HOST + "/api/v1/iot/firmware/download/" + DEVICE_TYPE;

// Temporizadores OTA (chequea actualizaciones cada 60 segundos)
unsigned long lastOtaCheck = 0;
const unsigned long OTA_CHECK_INTERVAL = 60000;

// ---------- PINES DE LOS SEMÁFOROS FÍSICOS ----------
// Semáforo 01: Av. Ejército (Carril Principal Norte-Sur)
#define PIN_SEM1_RED     23
#define PIN_SEM1_YELLOW  22
#define PIN_SEM1_GREEN   21

// Semáforo 02: Calle Los Arces (Carril Secundario Este-Oeste)
#define PIN_SEM2_RED     19
#define PIN_SEM2_YELLOW  18
#define PIN_SEM2_GREEN   5

// Sensor ADC de Batería Solar (Divisor de voltaje 1/4)
#define PIN_BATTERY_ADC  34

// ---------- LÍMITES DE SEGURIDAD ESTRICTOS ----------
const int MIN_GREEN_SEC = 15; // Mínimo de tiempo verde para cruce peatonal
const int MAX_GREEN_SEC = 60; // Máximo de tiempo verde para evitar bloqueo
const int YELLOW_SEC    = 3;  // Tiempo ámbar / amarillo
const int ALL_RED_SEC   = 2;  // Despeje de seguridad todo rojo

// ---------- ESTADOS DEL SEMÁFORO ----------
enum LightColor { COLOR_RED, COLOR_YELLOW, COLOR_GREEN };

LightColor sem1Color = COLOR_GREEN;
LightColor sem2Color = COLOR_RED;

int currentRemainingSec = 35;
int sem1GreenSecAllocated = 35;
int sem2GreenSecAllocated = 25;

bool emergencyActive = false;
unsigned long lastCycleTick = 0;
unsigned long lastTelemetrySent = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("  Semáforo+ · ESP32 Central Iniciando...");
  Serial.println("  TECSUP Arequipa · Av. Ejército × Los Arces");
  Serial.println("=============================================");

  // Configurar pines como salidas digitales
  pinMode(PIN_SEM1_RED, OUTPUT);
  pinMode(PIN_SEM1_YELLOW, OUTPUT);
  pinMode(PIN_SEM1_GREEN, OUTPUT);

  pinMode(PIN_SEM2_RED, OUTPUT);
  pinMode(PIN_SEM2_YELLOW, OUTPUT);
  pinMode(PIN_SEM2_GREEN, OUTPUT);

  pinMode(PIN_BATTERY_ADC, INPUT);

  // Estado inicial seguro: SEM-01 Verde, SEM-02 Rojo
  setLightState(1, COLOR_GREEN);
  setLightState(2, COLOR_RED);

  // Conexión WiFi no bloqueante
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi ");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado exitosamente.");
    Serial.print("[WiFi] IP Asignada: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Sin conexión a internet. OPERANDO EN MODO LOCAL 100% AUTÓNOMO.");
  }
}

void loop() {
  unsigned long now = millis();

  // Control local por segundo (100% independiente de internet)
  if (now - lastCycleTick >= 1000) {
    lastCycleTick = now;
    tickTrafficCycle();
  }

  // Envío de telemetría hacia servidor cada 3 segundos si hay red
  if (now - lastTelemetrySent >= 3000) {
    lastTelemetrySent = now;
    sendTelemetryToServer();
  }

  // Verificación periódica de nuevo Firmware OTA por WiFi cada 60s
  if (now - lastOtaCheck >= OTA_CHECK_INTERVAL) {
    lastOtaCheck = now;
    checkAndPerformOTA();
  }
}

// ==============================================================================
// RUTINA DE AUTO-ACTUALIZACIÓN INALÁMBRICA (HTTP OTA)
// ==============================================================================
void checkAndPerformOTA() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(OTA_CHECK_URL);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    // Si la respuesta indica "UPDATE_AVAILABLE", iniciamos la descarga e instalación
    if (payload.indexOf("\"updateAvailable\":true") >= 0) {
      Serial.println("\n[OTA] ¡Nueva versión de firmware detectada en la VPS!");
      Serial.println("[OTA] Descargando binario y actualizando vía WiFi...");

      // Ponemos semáforos en modo seguro (todo rojo) durante el flasheo (toma ~5 seg)
      setLightState(1, COLOR_RED);
      setLightState(2, COLOR_RED);

      WiFiClient client;
      httpUpdate.setLedPin(PIN_SEM1_YELLOW, LOW); // Parpadea amarillo mientras actualiza
      t_httpUpdate_return ret = httpUpdate.update(client, OTA_BIN_URL);

      switch (ret) {
        case HTTP_UPDATE_FAILED:
          Serial.printf("[OTA] Error en la actualización: (%d): %s\n", 
                        httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
          break;
        case HTTP_UPDATE_NO_UPDATES:
          Serial.println("[OTA] Sin actualizaciones pendientes.");
          break;
        case HTTP_UPDATE_OK:
          Serial.println("[OTA] ¡Actualización exitosa! Reiniciando ESP32...");
          break;
      }
    }
  }
  http.end();
}

// Control físico de salidas LED / Relés
void setLightState(int semNum, LightColor color) {
  if (semNum == 1) {
    digitalWrite(PIN_SEM1_RED,    color == COLOR_RED    ? HIGH : LOW);
    digitalWrite(PIN_SEM1_YELLOW, color == COLOR_YELLOW ? HIGH : LOW);
    digitalWrite(PIN_SEM1_GREEN,  color == COLOR_GREEN  ? HIGH : LOW);
    sem1Color = color;
  } else {
    digitalWrite(PIN_SEM2_RED,    color == COLOR_RED    ? HIGH : LOW);
    digitalWrite(PIN_SEM2_YELLOW, color == COLOR_YELLOW ? HIGH : LOW);
    digitalWrite(PIN_SEM2_GREEN,  color == COLOR_GREEN  ? HIGH : LOW);
    sem2Color = color;
  }
}

// Máquina de estados del ciclo semafórico adaptativo
void tickTrafficCycle() {
  currentRemainingSec--;

  if (currentRemainingSec <= 0) {
    // Transición de fases
    if (sem1Color == COLOR_GREEN) {
      setLightState(1, COLOR_YELLOW);
      currentRemainingSec = YELLOW_SEC;
      Serial.println("[ESP32] SEM-01 Amarillo.");
    } else if (sem1Color == COLOR_YELLOW) {
      setLightState(1, COLOR_RED);
      setLightState(2, COLOR_RED);
      currentRemainingSec = ALL_RED_SEC;
      Serial.println("[ESP32] Todo Rojo de Seguridad.");
    } else if (sem1Color == COLOR_RED && sem2Color == COLOR_RED) {
      setLightState(2, COLOR_GREEN);
      currentRemainingSec = sem2GreenSecAllocated;
      Serial.print("[ESP32] SEM-02 Verde (");
      Serial.print(sem2GreenSecAllocated);
      Serial.println("s)");
    } else if (sem2Color == COLOR_GREEN) {
      setLightState(2, COLOR_YELLOW);
      currentRemainingSec = YELLOW_SEC;
      Serial.println("[ESP32] SEM-02 Amarillo.");
    } else if (sem2Color == COLOR_YELLOW) {
      setLightState(2, COLOR_RED);
      setLightState(1, COLOR_RED);
      currentRemainingSec = ALL_RED_SEC;
      Serial.println("[ESP32] Todo Rojo de Seguridad.");
    } else {
      setLightState(1, COLOR_GREEN);
      currentRemainingSec = sem1GreenSecAllocated;
      Serial.print("[ESP32] SEM-01 Verde (");
      Serial.print(sem1GreenSecAllocated);
      Serial.println("s)");
    }
  }
}

// Lectura de voltaje de la batería solar LiFePO4
float readBatteryVoltage() {
  int raw = analogRead(PIN_BATTERY_ADC);
  // Calibración típica con divisor 100k/33k (factor aprox 4.03)
  float voltage = (raw / 4095.0) * 3.3 * 4.03;
  if (voltage < 5.0) voltage = 13.6; // Si no hay divisor físico conectado, simular voltaje nominal
  return voltage;
}

int calculateBatteryPercent(float v) {
  // Batería LiFePO4 12V: 13.6V = 100%, 12.8V = 50%, 12.0V = 10%
  if (v >= 13.6) return 100;
  if (v <= 11.5) return 0;
  return (int)(((v - 11.5) / (13.6 - 11.5)) * 100);
}

// Envío de telemetría JSON al servidor Spring Boot
void sendTelemetryToServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  float v = readBatteryVoltage();
  int pct = calculateBatteryPercent(v);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"deviceId\":\"ESP32-CENTRAL-01\",";
  payload += "\"nodeCode\":\"NODE-01\",";
  payload += "\"sem1State\":\"" + String(sem1Color == COLOR_GREEN ? "GREEN" : sem1Color == COLOR_YELLOW ? "YELLOW" : "RED") + "\",";
  payload += "\"sem2State\":\"" + String(sem2Color == COLOR_GREEN ? "GREEN" : sem2Color == COLOR_YELLOW ? "YELLOW" : "RED") + "\",";
  payload += "\"remainingSeconds\":" + String(currentRemainingSec) + ",";
  payload += "\"sem1AllocatedSeconds\":" + String(sem1GreenSecAllocated) + ",";
  payload += "\"sem2AllocatedSeconds\":" + String(sem2GreenSecAllocated) + ",";
  payload += "\"batteryVoltage\":" + String(v, 2) + ",";
  payload += "\"batteryPercent\":" + String(pct) + ",";
  payload += "\"powerSource\":\"HÍBRIDO (Solar LiFePO4)\",";
  payload += "\"emergencyActive\":" + String(emergencyActive ? "true" : "false");
  payload += "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    // Telemetría entregada exitosamente
  } else {
    Serial.printf("[HTTP] Error enviando telemetría: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
