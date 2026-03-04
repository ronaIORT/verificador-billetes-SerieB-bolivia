# 💵 Verificador de Billetes Bolivia - PWA

Una Progressive Web App que permite verificar si un billete de la Serie B de Bolivia está inhabilitado según las listas oficiales del Banco Central de Bolivia (BCB).

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

## 📱 Características

- **✅ Verificación instantánea** - Compara el número de serie contra las listas oficiales
- **📷 Escaneo OCR** - Usa la cámara para leer automáticamente el número de serie
- **⌨️ Entrada manual** - Opción alternativa si el OCR falla
- **📱 Instalable** - Se puede agregar a la pantalla de inicio como app nativa
- **🔌 Modo offline** - Funciona sin conexión a internet
- **🎨 Diseño responsive** - Optimizado para móviles

## 🚀 Demo

Abre la aplicación en: `[URL de producción]`

## 📋 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Cámara (opcional, para escaneo OCR)
- Conexión a internet solo para la primera carga

## 🛠️ Tecnologías

| Tecnología       | Uso                                    |
| ---------------- | -------------------------------------- |
| HTML5            | Estructura semántica                   |
| CSS3             | Estilos y diseño responsive            |
| JavaScript ES6+  | Lógica de la aplicación                |
| Tesseract.js v5  | Motor OCR para reconocimiento de texto |
| Service Worker   | Funcionalidad offline                  |
| Web App Manifest | Instalabilidad PWA                     |

## 📁 Estructura del Proyecto

```
verificador-bolivia-pwa/
├── index.html            # Página principal (SPA)
├── manifest.json         # Configuración PWA
├── sw.js                 # Service Worker
├── README.md             # Documentación
│
├── css/
│   └── style.css         # Estilos
│
├── js/
│   ├── app.js            # Lógica principal
│   ├── db.js             # Carga de datos
│   ├── scanner.js        # OCR y cámara
│   └── validator.js      # Validación de rangos
│
├── data/
│   └── blacklist.json    # Rangos de billetes inhabilitados
│
└── icons/
    ├── icon-192x192.png  # Ícono para Android/Chrome
    └── icon-512x512.png  # Ícono para Splash Screen
```

## 🚀 Instalación y Uso Local

### Opción 1: Servidor simple con Node.js

```bash
# Clonar o descargar el proyecto
cd verificador-bolivia-pwa

# Instalar serve globalmente (solo una vez)
npm install -g serve

# Iniciar servidor
serve .
```

### Opción 2: Live Server (VS Code)

1. Instalar la extensión "Live Server" en VS Code
2. Clic derecho en `index.html` → "Open with Live Server"

### Opción 3: Python

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Luego abre: `http://localhost:8000`

## 📊 Datos de Billetes Inhabilitados

Los datos provienen del documento oficial del BCB y Ministerio de Economía. Incluye:

### Billetes de 10 Bolivianos

- 12 rangos de números inhabilitados
- Rango principal: 77100001 - 109850000

### Billetes de 20 Bolivianos

- 16 rangos de números inhabilitados
- Rango principal: 87280145 - 120950000

### Billetes de 50 Bolivianos

- 10 rangos de números inhabilitados
- Rango principal: 67250001 - 92250000

## 🔧 Cómo Funciona

1. **Selección**: El usuario selecciona la denominación del billete (10, 20 o 50 Bs)
2. **Entrada**: Escanea con la cámara o ingresa manualmente el número de serie
3. **Validación**: El sistema compara contra los rangos inhabilitados
4. **Resultado**:
   - 🟢 **Verde**: Billete operativo
   - 🔴 **Rojo**: Billete inhabilitado

## 📱 Instalación en Móvil

### Android (Chrome)

1. Abre la app en Chrome
2. Toca el menú (tres puntos)
3. Selecciona "Agregar a pantalla de inicio"

### iOS (Safari)

1. Abre la app en Safari
2. Toca el botón "Compartir"
3. Selecciona "Agregar a pantalla de inicio"

## 🔒 Privacidad

- **Sin recolección de datos**: La app no envía información a servidores externos
- **Procesamiento local**: Todo el procesamiento OCR ocurre en el dispositivo
- **Sin cookies**: No se utilizan cookies de seguimiento

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT.

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:

- Abre un issue en el repositorio
- Contacta al equipo de desarrollo

## 🙏 Agradecimientos

- Banco Central de Bolivia (BCB) por los datos oficiales
- Ministerio de Economía y Finanzas Públicas de Bolivia
- Tesseract.js por el motor OCR

---

**Nota**: Esta aplicación es una herramienta de ayuda. Para verificación oficial, consulta siempre los listados del BCB.

<div align="center">
  <p>Hecho con ❤️ para Bolivia</p>
</div>
