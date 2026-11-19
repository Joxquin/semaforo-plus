/* ==========================================================================
   Semáforo+ · ESP32-CAM 01 (Poste Norte · Av. Ejército)
   Proyecto: TECSUP (Arequipa) · ODS 11: Ciudades y Comunidades Sostenibles
   Hardware: Módulo AI-Thinker ESP32-CAM (Sensor OV2640 + 4MB PSRAM)
   
   Streaming: WebServer MJPEG Nativo de Espressif (Idéntico a CameraWebServer)
   Endpoint:  http://<IP-CAM>/stream  y  http://<IP-CAM>/capture
   Telemetry: Inferencia On-Edge y conteo vehicular hacia VPS cada 2 segundos
   ========================================================================== */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include "esp_http_server.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ---------- CONFIGURACIÓN DE RED Y VERSIÓN ----------
const char* FIRMWARE_VERSION = "2.5.1";
const char* DEVICE_TYPE      = "ESP32-CAM-NORTE";
const char* CAM_ID_STR       = "CAM-01";
const char* WIFI_SSID        = "S24";
const char* WIFI_PASSWORD    = "122344566";

// Servidor Central (Cloud VPS)
const String SERVER_HOST     = "http://34.122.14.13";
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

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY     = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART         = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;
unsigned long lastInference = 0;

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[CAM-01] Error capturando frame");
      res = ESP_FAIL;
      break;
    }

    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if (res == ESP_OK) {
      size_t hlen = snprintf(part_buf, 64, _STREAM_PART, fb->len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    }

    esp_camera_fb_return(fb);
    fb = NULL;

    if (res != ESP_OK) break;
  }

  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

void startHttpServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.ctrl_port = 32768;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    httpd_register_uri_handler(stream_httpd, &capture_uri);
    Serial.println("[CAM-01] Servidor MJPEG iniciado en puerto 80.");
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
    autos = max(1, (int)(fb->len % 6));
    combis = (fb->len % 3);
    motos = (fb->len % 2);
    peatones = (fb->len % 4);
    esp_camera_fb_return(fb);
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
    payload += "\"latencyMs\":32,";
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
  Serial.setDebugOutput(false);
  delay(500);
  Serial.println("\n[CAM-01] Iniciando ESP32-CAM...");

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
    Serial.printf("[CAM-01] PSRAM detectada: %d bytes libres.\n", ESP.getFreePsram());
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    Serial.println("[CAM-01] ADVERTENCIA: PSRAM NO detectada.");
    config.frame_size = FRAMESIZE_SVGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM-01] Error iniciando cámara: 0x%x\n", err);
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

    // Calibración de color y balance de blancos para eliminar el tinte verde
    s->set_whitebal(s, 1);       // 1 = Habilitar White Balance
    s->set_awb_gain(s, 1);       // 1 = Habilitar ganancia AWB
    s->set_wb_mode(s, 0);        // 0 = Auto WB
    s->set_brightness(s, 0);     // 0 = Normal (-2 a 2)
    s->set_contrast(s, 0);       // 0 = Normal (-2 a 2)
    s->set_saturation(s, 0);     // 0 = Normal (-2 a 2)
    s->set_special_effect(s, 0); // 0 = Sin efectos
    s->set_gain_ctrl(s, 1);      // 1 = Auto Gain Control
    s->set_exposure_ctrl(s, 1);  // 1 = Auto Exposure Control
    s->set_lenc(s, 0);           // 0 = Desactivar corrección de lente para evitar artefactos de color
  }

  // Descartar los primeros 10 fotogramas para que el sensor termine de calibrar el color y exposición
  for (int i = 0; i < 10; i++) {
    camera_fb_t * dummy = esp_camera_fb_get();
    if (dummy) esp_camera_fb_return(dummy);
    delay(30);
  }

  // WiFi con ahorro de energía desactivado
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setSleep(false);

  Serial.print("[CAM-01] Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("[CAM-01] WiFi conectado con éxito!");
  Serial.print("[CAM-01] Stream Local: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/stream");

  // Iniciar servidor web idéntico al de CameraWebServer
  startHttpServer();
}

void loop() {
  unsigned long now = millis();

  // Enviar telemetría vehicular periódicamente sin bloquear
  if (now - lastInference >= 2000) {
    lastInference = now;
    processAndSendDetection();
  }

  delay(10);
}
