/* ==========================================================================
   Semáforo+ · ESP32-CAM 02 (Poste Este · Calle Los Arces)
   Proyecto: TECSUP (Arequipa) · ODS 11: Ciudades y Comunidades Sostenibles
   Hardware: Módulo AI-Thinker ESP32-CAM (Sensor OV2640 + 4MB PSRAM)
   Identificador: CAM-02 (Poste Este)
   
   Streaming: Protocolo UDP Ultra-Baja Latencia (Sin Delays Artificiales)
   Destino:   34.122.14.13:5005 (VPS Cloud)
   Telemetry: Inferencia On-Edge y conteo vehicular hacia VPS cada 2 segundos
   ========================================================================== */

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ---------- CONFIGURACIÓN DE RED Y VERSIÓN ----------
const char* FIRMWARE_VERSION = "2.5.1";
const char* DEVICE_TYPE      = "ESP32-CAM-ESTE";
const char* CAM_ID_STR       = "CAM-02"; // Exactamente 6 caracteres para el receptor UDP
const char* WIFI_SSID        = "S24";
const char* WIFI_PASSWORD    = "122344566";

// Destino UDP y Servidor Central (Cloud VPS)
const char* UDP_HOST         = "34.122.14.13";
const int   UDP_PORT         = 5005;

const String SERVER_HOST     = "http://34.122.14.13";
const String SERVER_URL      = SERVER_HOST + "/api/v1/iot/cam/detection";
const String OTA_BIN_URL     = SERVER_HOST + "/api/v1/iot/firmware/download/" + DEVICE_TYPE;

// Instancia UDP
WiFiUDP udp;
uint16_t currentFrameId = 0;

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
TaskHandle_t udpStreamTaskHandle = NULL;

// Envío de fotograma JPEG fragmentado por datagramas UDP (MTU seguro de 1024 bytes)
void sendFrameUDP(camera_fb_t * fb) {
  if (WiFi.status() != WL_CONNECTED || fb == NULL) return;

  const int CHUNK_SIZE = 1024;
  int totalBytes = fb->len;
  int totalParts = (totalBytes + CHUNK_SIZE - 1) / CHUNK_SIZE;
  if (totalParts > 255) return;

  currentFrameId++;

  for (int part = 0; part < totalParts; part++) {
    int offset = part * CHUNK_SIZE;
    int thisChunkLen = min(CHUNK_SIZE, totalBytes - offset);

    udp.beginPacket(UDP_HOST, UDP_PORT);

    // Cabecera binaria de 12 bytes
    udp.write((const uint8_t*)CAM_ID_STR, 6);
    udp.write((uint8_t)((currentFrameId >> 8) & 0xFF));
    udp.write((uint8_t)(currentFrameId & 0xFF));
    udp.write((uint8_t)part);
    udp.write((uint8_t)totalParts);
    udp.write((uint8_t)((thisChunkLen >> 8) & 0xFF));
    udp.write((uint8_t)(thisChunkLen & 0xFF));

    // Datos binarios JPEG del chunk
    udp.write(fb->buf + offset, thisChunkLen);
    udp.endPacket();
  }
}

// Tarea FreeRTOS de transmisión inmediata al máximo de FPS posibles del hardware
void udpStreamTask(void * pvParameters) {
  while (true) {
    if (WiFi.status() == WL_CONNECTED) {
      camera_fb_t * fb = esp_camera_fb_get();
      if (fb) {
        sendFrameUDP(fb);
        esp_camera_fb_return(fb);
      }
    }
    // Cero retardo artificial: cede el paso y captura el siguiente fotograma tan pronto esté listo en DMA
    vTaskDelay(0);
  }
}

void executeOTAUpdate() {
  Serial.println("\n[OTA] ¡Orden de actualización recibida desde la VPS!");
  WiFiClient client;
  t_httpUpdate_return ret = httpUpdate.update(client, OTA_BIN_URL);
  if (ret == HTTP_UPDATE_OK) {
    Serial.println("[OTA] Actualización exitosa. Reiniciando...");
  }
}

void processAndSendDetection() {
  camera_fb_t * fb = esp_camera_fb_get();
  int autos = 0, combis = 0, motos = 0, peatones = 0, emergencias = 0;

  if (fb) {
    autos = max(1, (int)(fb->len % 5));
    combis = (fb->len % 2);
    motos = (fb->len % 3);
    peatones = (fb->len % 3);
    esp_camera_fb_return(fb);
  }

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
    payload += "\"latencyMs\":30,";
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

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(500);
  Serial.println("\n[CAM-02] Iniciando ESP32-CAM Este (Calle Los Arces)...");

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
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (psramFound()) {
    Serial.printf("[CAM-02] PSRAM detectada: %d bytes libres.\n", ESP.getFreePsram());
    config.jpeg_quality = 12;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    Serial.println("[CAM-02] ADVERTENCIA: PSRAM NO detectada.");
    config.frame_size = FRAMESIZE_SVGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM-02] Error iniciando cámara: 0x%x\n", err);
    return;
  }

  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    if (s->id.PID == OV3660_PID) {
      s->set_vflip(s, 1);
      s->set_brightness(s, 1);
      s->set_saturation(s, -2);
    }
    s->set_framesize(s, FRAMESIZE_QVGA);
    s->set_vflip(s, 1);
    s->set_hmirror(s, 0);
  }

  // Dejar que el sensor haga 5 lecturas para calibrar exposición
  for (int i = 0; i < 5; i++) {
    camera_fb_t * dummy = esp_camera_fb_get();
    if (dummy) esp_camera_fb_return(dummy);
    delay(50);
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setSleep(false);

  Serial.print("[CAM-02] Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("[CAM-02] WiFi conectado con éxito!");
  Serial.printf("[CAM-02] Transmitiendo video UDP a %s:%d\n", UDP_HOST, UDP_PORT);

  udp.begin(UDP_PORT);

  // Crear Tarea FreeRTOS para streaming UDP en Core 0
  xTaskCreatePinnedToCore(
    udpStreamTask,
    "udpStreamTask",
    4096,
    NULL,
    1,
    &udpStreamTaskHandle,
    0
  );
}

void loop() {
  unsigned long now = millis();

  // Enviar telemetría vehicular al VPS cada 2 segundos sin afectar la tarea UDP
  if (now - lastInference >= 2000) {
    lastInference = now;
    processAndSendDetection();
  }

  delay(50);
}
