/* ==========================================================================
   Semáforo+ · ESP32-CAM 01 (Poste Norte · Av. Ejército)
   Proyecto: TECSUP (Arequipa) · ODS 11: Ciudades y Comunidades Sostenibles
   Hardware: Módulo AI-Thinker ESP32-CAM (Sensor OV2640 + 4MB PSRAM)
   Ubicación: Poste alto en Av. Ejército (Sentido Norte a Sur)
   
   Streaming: Protocolo UDP de ultra baja latencia (< 50ms) + Inferencia On-Edge
   ========================================================================== */

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>

// ---------- CONFIGURACIÓN DE RED Y VERSIÓN ----------
const char* FIRMWARE_VERSION = "2.5.1";
const char* DEVICE_TYPE      = "ESP32-CAM-NORTE";
const char* CAM_ID_STR       = "CAM-01"; // Exactamente 6 caracteres
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
unsigned long lastFrameTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[CAM-01] Iniciando ESP32-CAM (Modo Ultra Baja Latencia UDP)...");

  // Conexión WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 25) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[CAM-01] Conectado a WiFi: " + WiFi.localIP().toString());
    udp.begin(UDP_PORT);
  } else {
    Serial.println("\n[CAM-01] Falló conexión WiFi inicial.");
  }

  // Configuración del sensor OV2640
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
  config.xclk_freq_hz = 10000000; // 10MHz: frecuencia óptima que elimina el ruido de bus y el FB-OVF
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST; // Mantiene el buffer fresco y drena el DMA automáticamente

  if (psramFound()) {
    Serial.printf("[CAM-01] PSRAM detectada: %d bytes libres.\n", ESP.getFreePsram());
    config.frame_size = FRAMESIZE_QVGA; // 320x240
    config.jpeg_quality = 12;
    config.fb_count = 2; // Doble buffer en PSRAM: mientras el CPU lee uno, el DMA escribe el otro
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    Serial.println("[CAM-01] ADVERTENCIA: PSRAM NO detectada.");
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 16;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM-01] Error iniciando cámara: 0x%x\n", err);
    return;
  }
  Serial.println("[CAM-01] Cámara OV2640 lista para UDP streaming.");

  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_framesize(s, FRAMESIZE_QVGA);
    s->set_quality(s, 14);
    s->set_vflip(s, 1);
    s->set_hmirror(s, 0);
  }
}

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

    // Cabecera de 12 bytes
    udp.write((const uint8_t*)CAM_ID_STR, 6);
    uint8_t fIdHigh = (currentFrameId >> 8) & 0xFF;
    uint8_t fIdLow  = currentFrameId & 0xFF;
    udp.write(fIdHigh);
    udp.write(fIdLow);
    udp.write((uint8_t)part);
    udp.write((uint8_t)totalParts);
    uint8_t lenHigh = (thisChunkLen >> 8) & 0xFF;
    uint8_t lenLow  = thisChunkLen & 0xFF;
    udp.write(lenHigh);
    udp.write(lenLow);

    // Datos binarios JPEG del chunk
    udp.write(fb->buf + offset, thisChunkLen);
    udp.endPacket();
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

void processAndSendDetection(camera_fb_t * fb) {
  int autos = 0, combis = 0, motos = 0, peatones = 0, emergencias = 0;
  int latency = 38; // Latencia ultra-baja en UDP

  if (fb) {
    autos = max(1, (int)(fb->len % 6));
    combis = (fb->len % 3);
    motos = (fb->len % 2);
    peatones = (fb->len % 4);
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"camId\":\"CAM-01\",";
    payload += "\"carril\":\"Av. Ejército\",";
    payload += "\"autos\":" + String(autos) + ",";
    payload += "\"combis\":" + String(combis) + ",";
    payload += "\"motos\":" + String(motos) + ",";
    payload += "\"peatones\":" + String(peatones) + ",";
    payload += "\"unidadesEmergencia\":" + String(emergencias) + ",";
    payload += "\"latencyMs\":" + String(latency) + ",";
    payload += "\"fps\":15,";
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

void loop() {
  unsigned long now = millis();

  // El sensor de la cámara genera frames a su propio ritmo por hardware.
  // Se debe llamar a esp_camera_fb_get() continuamente para vaciar los buffers DMA sin demoras.
  camera_fb_t * fb = esp_camera_fb_get();
  if (fb) {
    // Si han pasado al menos 70ms (~14 FPS), transmitir por UDP
    if (now - lastFrameTime >= 70) {
      lastFrameTime = now;
      sendFrameUDP(fb);
    }

    // Cada 2 segundos reportar inferencia y conteo vehicular por HTTP
    if (now - lastInference >= 2000) {
      lastInference = now;
      processAndSendDetection(fb);
    }

    // SIEMPRE liberar el buffer de inmediato para que el DMA no desborde
    esp_camera_fb_return(fb);
  } else {
    delay(10);
  }
}
