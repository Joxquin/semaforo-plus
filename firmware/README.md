# Firmware ESP32 & ESP32-CAM · Semáforo+ (TECSUP Arequipa)

Este directorio contiene el código fuente nativo de Arduino (`.ino`) para el hardware embebido del sistema adaptativo **Semáforo+**:

```
firmware/
├── esp32_central_controller/
│   └── esp32_central_controller.ino     # Firmware del ESP32 Central ("Cerebro del Cruce")
├── esp32_cam_norte/
│   └── esp32_cam_norte.ino              # Firmware de CAM-01 (Poste Norte · Av. Ejército)
├── esp32_cam_este/
│   └── esp32_cam_este.ino               # Firmware de CAM-02 (Poste Este · Calle Los Arces)
└── README.md
```

---

## 1. ESP32 Central Controller (`esp32_central_controller.ino`)
Controla directamente los **2 semáforos** del cruce físico y procesa el algoritmo adaptativo de manera **100% local**:

### Asignación de Pines (GPIOs):
| Dispositivo / Función | Pin GPIO (ESP32) | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **SEM-01 Rojo (Av. Ejército)** | `GPIO 23` | Salida Digital | Luz roja carril principal |
| **SEM-01 Amarillo (Av. Ejército)** | `GPIO 22` | Salida Digital | Luz ámbar carril principal |
| **SEM-01 Verde (Av. Ejército)** | `GPIO 21` | Salida Digital | Luz verde carril principal |
| **SEM-02 Rojo (Los Arces)** | `GPIO 19` | Salida Digital | Luz roja carril secundario |
| **SEM-02 Amarillo (Los Arces)** | `GPIO 18` | Salida Digital | Luz ámbar carril secundario |
| **SEM-02 Verde (Los Arces)** | `GPIO 5` | Salida Digital | Luz verde carril secundario |
| **Sensor Voltaje Batería Solar** | `GPIO 34` | Entrada Analógica | Divisor resistivo 100k/33k LiFePO4 |

### Parámetros de Seguridad:
- **Tiempo verde mínimo**: 15 segundos (garantía de cruce peatonal seguro).
- **Tiempo verde máximo**: 60 segundos (evita congestionamiento indefinido).
- **Tiempo ámbar / amarillo**: 3 segundos.
- **Despeje todo rojo**: 2 segundos.
- **Failover**: Si se pierde la conexión WiFi o a internet, el ESP32 **continúa operando localmente** sin pausas.

---

## 2. Módulos ESP32-CAM (`esp32_cam_norte.ino` y `esp32_cam_este.ino`)
- Hardware: Placa AI-Thinker ESP32-CAM con sensor OV2640 y PSRAM.
- Resolución configurada: `1024×768 (XGA)` a 20 FPS.
- Transmite los conteos clasificados hacia el servidor:
  `POST http://<IP_SERVIDOR>:8080/api/v1/iot/cam/detection`

---

## 3. Instrucciones de Compilación y Flasheo

1. **Requisitos en Arduino IDE**:
   - Instalar el paquete de placas ESP32 por Espressif (`https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`).
   - Para el controlador central: Seleccionar placa `ESP32 Dev Module`.
   - Para las cámaras: Seleccionar placa `AI Thinker ESP32-CAM` (deshabilitar Brownout detector si la fuente de 5V tiene caída).
2. **Configuración de Variables de Red**:
   En cada `.ino`, actualizar:
   ```cpp
   const char* WIFI_SSID     = "Tu_Red_WiFi";
   const char* WIFI_PASSWORD = "Tu_Password_WiFi";
   const char* SERVER_URL    = "http://<IP_VPS_O_SERVIDOR>:8080/api/v1/iot/...";
   ```
3. **Flashear vía USB**:
   - Conectar mediante convertidor USB-TTL (FTDI a 3.3V o 5V según el módulo).
   - En el ESP32-CAM, puentear `GPIO 0` con `GND` para entrar en modo *Flash*.
