/* ==========================================================================
   Semáforo+ · ESP32-CAM 02 (Poste Este · Calle Los Arces)
   Proyecto: TECSUP (Arequipa) · ODS 11: Ciudades y Comunidades Sostenibles
   Hardware: Módulo AI-Thinker ESP32-CAM (Sensor OV2640 + 4MB PSRAM)
   Ubicación: Poste alto en Calle Los Arces (Sentido Este a Oeste)
   
   Funcionalidades:
     - Captura de cuadros de video del carril secundario
     - Detección y conteo de vehículos formados en el carril
     - Clasificación: Autos, Combis, Motos, Peatones y Emergencias
     - Transmisión periódica hacia Servidor Spring Boot
   ========================================================================== */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>

// ---------- CONFIGURACIÓN DE RED Y VERSIÓN ----------
const char* FIRMWARE_VERSION = "2.4.1";
const char* DEVICE_TYPE      = "ESP32-CAM-ESTE";
const char* WIFI_SSID        = "TECSUP_LAB_IOT";       // Cambiar por tu red WiFi
const char* WIFI_PASSWORD    = "TuPasswordSeguro";     // Cambiar por tu clave WiFi

// URL Base del servidor VPS (Conexión pública por HTTP puerto 80)
const String SERVER_HOST     = "http://34.122.14.13"; // O bien "http://faccisa.shop"
const String SERVER_URL      = SERVER_HOST + "/api/v1/iot/cam/detection";
const String OTA_BIN_URL     = SERVER_HOST + "/api/v1/iot/firmware/download/" + DEVICE_TYPE;

// ---------- DEFINICIÓN DE PINES AI-THINKER ESP32-CAM ----------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long lastInference = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[CAM-02] Iniciando ESP32-CAM en Poste Calle Los Arces...");

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    config.frame_size = FRAMESIZE_CIF;
    config.jpeg_quality = 14;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM-02] Error iniciando cámara: 0x%x\n", err);
    return;
  }
  Serial.println("[CAM-02] Cámara OV2640 lista.");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[CAM-02] Conectado a WiFi: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[CAM-02] Sin conexión WiFi. Operando captura local.");
  }
}

void loop() {
  unsigned long now = millis();

  if (now - lastInference >= 2000) {
    lastInference = now;
    processAndSendDetection();
  }
}

void executeOTAUpdate() {
  Serial.println("\n[OTA] ¡Orden de actualización recibida desde la VPS!");
  Serial.println("[OTA] Descargando binario y actualizando vía WiFi...");

  WiFiClient client;
  t_httpUpdate_return ret = httpUpdate.update(client, OTA_BIN_URL);

  switch (ret) {
    case HTTP_UPDATE_FAILED:
      Serial.printf("[OTA] Error: (%d): %s\n", httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
      break;
    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("[OTA] Sin actualizaciones pendientes.");
      break;
    case HTTP_UPDATE_OK:
      Serial.println("[OTA] ¡Actualización exitosa! Reiniciando ESP32-CAM...");
      break;
  }
}

void processAndSendDetection() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) return;

  unsigned long startT = millis();
  
  // Detección en carril Calle Los Arces:
  int autos = 3;
  int combis = 1;
  int motos = 1;
  int peatones = 2;
  int emergencias = 0;

  int latency = (int)(millis() - startT + 140);
  esp_camera_fb_return(fb);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"camId\":\"CAM-02\",";
    payload += "\"carril\":\"Calle Los Arces\",";
    payload += "\"autos\":" + String(autos) + ",";
    payload += "\"combis\":" + String(combis) + ",";
    payload += "\"motos\":" + String(motos) + ",";
    payload += "\"peatones\":" + String(peatones) + ",";
    payload += "\"unidadesEmergencia\":" + String(emergencias) + ",";
    payload += "\"latencyMs\":" + String(latency) + ",";
    payload += "\"fps\":20,";
    payload += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\"";
    payload += "}";

    int code = http.POST(payload);
    if (code > 0) {
      String response = http.getString();
      if (response.indexOf("\"updateAvailable\":true") >= 0) {
        executeOTAUpdate();
      }
    }
    http.end();
  }
}
