/**
 * Módulo de Escáner
 * Gestiona el acceso a la cámara y el reconocimiento OCR con Tesseract.js
 */

// Estado del escáner
let videoStream = null;
let videoElement = null;
let canvasElement = null;

/**
 * Inicializa el escáner con los elementos del DOM
 * @param {HTMLVideoElement} video - Elemento video para la vista previa
 * @param {HTMLCanvasElement} canvas - Elemento canvas para captura
 */
export function initScanner(video, canvas) {
    videoElement = video;
    canvasElement = canvas;
}

/**
 * Inicia la cámara trasera del dispositivo
 * @returns {Promise<boolean>} true si se inició correctamente
 */
export async function startCamera() {
    try {
        // Verificar contexto seguro
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            throw new Error('La cámara requiere conexión segura (HTTPS).');
        }
        
        // Detener cualquier stream anterior
        stopCamera();
        
        // Verificar soporte de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a la cámara.');
        }
        
        // Solicitar acceso a la cámara trasera
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoElement) {
            videoElement.srcObject = videoStream;
            // Forzar reproducción con muted para dispositivos móviles
            videoElement.muted = true;
            await videoElement.play();
        }
        
        console.log('Cámara iniciada correctamente');
        return true;
    } catch (error) {
        console.error('Error al iniciar cámara:', error);
        
        if (error.name === 'NotAllowedError') {
            throw new Error('Permiso denegado. Habilita la cámara en configuración.');
        } else if (error.name === 'NotFoundError') {
            throw new Error('No se encontró cámara en el dispositivo.');
        } else if (error.name === 'NotReadableError') {
            throw new Error('La cámara está en uso por otra aplicación.');
        } else if (error.name === 'OverconstrainedError') {
            throw new Error('Cámara no compatible con los requisitos.');
        } else if (error.name === 'SecurityError') {
            throw new Error('Acceso a cámara bloqueado por seguridad.');
        } else {
            throw new Error(error.message || 'Error al acceder a la cámara.');
        }
    }
}

/**
 * Detiene la cámara y libera recursos
 */
export function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

/**
 * Captura una imagen del video
 * @returns {Promise<string>} Base64 de la imagen capturada
 */
export async function captureImage() {
    if (!videoElement || !canvasElement) {
        throw new Error('Escáner no inicializado');
    }
    
    const video = videoElement;
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    
    // Configurar dimensiones del canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Capturar frame actual del video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Retornar como base64
    return canvas.toDataURL('image/png');
}

/**
 * Realiza OCR sobre una imagen usando Tesseract.js
 * @param {string} imageData - Imagen en base64 o URL
 * @param {Function} onProgress - Callback para progreso (opcional)
 * @returns {Promise<string>} Texto reconocido
 */
export async function performOCR(imageData, onProgress = null) {
    try {
        // Verificar que Tesseract está disponible
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js no está cargado. Verifica tu conexión a internet.');
        }
        
        console.log('Iniciando OCR...');
        
        const result = await Tesseract.recognize(imageData, 'eng', {
            logger: (m) => {
                if (onProgress && m.status === 'recognizing text') {
                    onProgress(Math.round(m.progress * 100));
                }
                console.log(`OCR: ${m.status} - ${Math.round((m.progress || 0) * 100)}%`);
            }
        });
        
        console.log('OCR completado:', result.data.text);
        return result.data.text;
    } catch (error) {
        console.error('Error en OCR:', error);
        throw new Error('Error al procesar la imagen. Intenta nuevamente.');
    }
}

/**
 * Extrae el número de serie del texto reconocido
 * @param {string} text - Texto del OCR
 * @returns {string|null} Número de serie extraído o null
 */
export function extractSerialNumber(text) {
    if (!text) return null;
    
    // Limpiar el texto
    const cleanText = text.trim();
    
    // Buscar secuencias de 7-9 dígitos (típico de números de serie)
    const patterns = [
        /\b(\d{8,9})\b/g,           // 8-9 dígitos seguidos
        /\b(\d{7,9})\b/g,           // 7-9 dígitos
        /(\d{8})/g,                  // Exactamente 8 dígitos
        /(\d{9})/g,                  // Exactamente 9 dígitos
    ];
    
    for (const pattern of patterns) {
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
            // Tomar el match más largo
            const longest = matches.reduce((a, b) => a.length >= b.length ? a : b);
            console.log(`Número de serie extraído: ${longest}`);
            return longest;
        }
    }
    
    // Si no encontramos con patrones, intentar extraer todos los dígitos
    const allDigits = cleanText.replace(/\D/g, '');
    if (allDigits.length >= 7 && allDigits.length <= 9) {
        console.log(`Número extraído de dígitos: ${allDigits}`);
        return allDigits;
    }
    
    console.warn('No se pudo extraer un número de serie válido');
    return null;
}

/**
 * Proceso completo: captura, OCR y extracción
 * @param {Function} onProgress - Callback para progreso
 * @returns {Promise<string|null>} Número de serie o null
 */
export async function scanAndExtract(onProgress = null) {
    // Capturar imagen
    if (onProgress) onProgress(0, 'Capturando imagen...');
    const imageData = await captureImage();
    
    // Realizar OCR
    if (onProgress) onProgress(10, 'Procesando imagen...');
    const ocrText = await performOCR(imageData, (percent) => {
        if (onProgress) onProgress(10 + (percent * 0.8), 'Reconociendo texto...');
    });
    
    // Extraer número
    if (onProgress) onProgress(95, 'Extrayendo número...');
    const serialNumber = extractSerialNumber(ocrText);
    
    if (onProgress) onProgress(100, 'Completado');
    
    return serialNumber;
}

/**
 * Verifica si el dispositivo tiene cámara
 * @returns {Promise<boolean>}
 */
export async function hasCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
    } catch {
        return false;
    }
}

/**
 * Verifica si el navegador soporta acceso a cámara
 * @returns {boolean}
 */
export function isCameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}