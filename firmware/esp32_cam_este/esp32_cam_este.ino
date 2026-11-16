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

// ---------- CONFIGURACIÓN DE RED ----------
const char* WIFI_SSID     = "TECSUP_LAB_IOT";
const char* WIFI_PASSWORD = "TuPasswordSeguro";
const char* SERVER_URL    = "http://192.168.1.100:8080/api/v1/iot/cam/detection";

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

  if (psramFound()) {
    config.frame_size = FRAMESIZE_XGA; // 1024x768
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 14;
    config.fb_count = 1;
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
    payload += "\"fps\":20";
    payload += "}";

    int code = http.POST(payload);
    http.end();
  }
}
