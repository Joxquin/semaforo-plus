#!/usr/bin/env bash
# ==============================================================================
# Semáforo+ · Script Automatizado de Flasheo y Monitor Serial (Arch Linux)
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIRMWARE_DIR="$PROJECT_ROOT/firmware"

# Colores de salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}   🚦 Semáforo+ · ESP32 Auto-Flasher (Arch Linux)     ${NC}"
echo -e "${CYAN}======================================================${NC}"

# 1. Verificar dependencias en Arch Linux
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}[ERROR] Herramienta '$1' no encontrada.${NC}"
        echo -e "${YELLOW}En Arch Linux instala con: sudo pacman -S arduino-cli esptool python-pyserial${NC}"
        exit 1
    fi
}
check_tool arduino-cli

# 2. Detección automática del puerto USB
detect_port() {
    echo -e "\n${BLUE}[1/4] Buscando dispositivos ESP32 conectados por USB...${NC}"
    PORTS=($(ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true))
    
    if [ ${#PORTS[@]} -eq 0 ]; then
        echo -e "${RED}[!] No se detectó ningún dispositivo en /dev/ttyUSB* o /dev/ttyACM*.${NC}"
        echo -e "${YELLOW}Asegúrate de tener conectado el ESP32 o el adaptador FTDI/USB.${NC}"
        read -p "Ingresa el puerto manualmente (ej: /dev/ttyUSB0): " SELECTED_PORT
    elif [ ${#PORTS[@]} -eq 1 ]; then
        SELECTED_PORT="${PORTS[0]}"
        echo -e "${GREEN}[✓] Dispositivo detectado automáticamente en: ${SELECTED_PORT}${NC}"
    else
        echo -e "${YELLOW}Se detectaron múltiples puertos USB:${NC}"
        select p in "${PORTS[@]}"; do
            if [ -n "$p" ]; then
                SELECTED_PORT="$p"
                break
            fi
        done
    fi
}

detect_port

# 3. Selección del Firmware a Flashear
echo -e "\n${BLUE}[2/4] Selecciona el firmware a compilar y flashear:${NC}"
echo "1) ESP32 Central Controller (Cerebro del Cruce - NodeMCU WROOM)"
echo "2) ESP32-CAM Norte (Av. Ejército N-S - AI-Thinker)"
echo "3) ESP32-CAM Este (Calle Los Arces E-O - AI-Thinker)"
echo "4) Solo abrir Monitor Serial en ${SELECTED_PORT}"
read -p "Opción [1-4]: " OPTION

FQBN=""
SKETCH_PATH=""

case "$OPTION" in
    1)
        SKETCH_PATH="$FIRMWARE_DIR/esp32_central_controller/esp32_central_controller.ino"
        FQBN="esp32:esp32:esp32"
        TARGET_NAME="ESP32 Central Controller"
        ;;
    2)
        SKETCH_PATH="$FIRMWARE_DIR/esp32_cam_norte/esp32_cam_norte.ino"
        FQBN="esp32:esp32:esp32cam"
        TARGET_NAME="ESP32-CAM Norte"
        ;;
    3)
        SKETCH_PATH="$FIRMWARE_DIR/esp32_cam_este/esp32_cam_este.ino"
        FQBN="esp32:esp32:esp32cam"
        TARGET_NAME="ESP32-CAM Este"
        ;;
    4)
        echo -e "\n${GREEN}[INFO] Abriendo monitor serial a 115200 baudios (Ctrl+C para salir)...${NC}"
        python3 -m serial.tools.miniterm "$SELECTED_PORT" 115200 --raw
        exit 0
        ;;
    *)
        echo -e "${RED}[ERROR] Opción inválida.${NC}"
        exit 1
        ;;
esac

# 4. Compilación
echo -e "\n${BLUE}[3/4] Compilando ${TARGET_NAME}...${NC}"
echo -e "Target: ${FQBN}"
echo -e "Ruta: ${SKETCH_PATH}"

arduino-cli compile --fqbn "$FQBN" "$(dirname "$SKETCH_PATH")"

echo -e "${GREEN}[✓] Compilación exitosa.${NC}"

# 5. Flasheo
echo -e "\n${BLUE}[4/4] Flasheando a ${SELECTED_PORT}...${NC}"
echo -e "${YELLOW}(Si es ESP32-CAM con módulo FTDI, recuerda puentear GPIO0 a GND al presionar RESET)${NC}"

arduino-cli upload -p "$SELECTED_PORT" --fqbn "$FQBN" "$(dirname "$SKETCH_PATH")"

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✓ FLASHEO COMPLETADO EXITOSAMENTE                   ${NC}"
echo -e "${GREEN}======================================================${NC}"

# 6. Monitoreo serial opcional
read -p "¿Deseas abrir el monitor serial ahora? (S/n): " OPEN_SERIAL
OPEN_SERIAL=${OPEN_SERIAL:-S}
if [[ "$OPEN_SERIAL" =~ ^[Ss]$ ]]; then
    echo -e "${CYAN}Conectando a serial 115200... Presiona Ctrl+] o Ctrl+C para salir.${NC}\n"
    python3 -m serial.tools.miniterm "$SELECTED_PORT" 115200 --raw
fi
