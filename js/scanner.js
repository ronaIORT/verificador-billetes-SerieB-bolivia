/**
 * Módulo de Escáner
 * Gestiona el acceso a la cámara y el reconocimiento OCR con Tesseract.js
 */

let videoStream = null;
let videoElement = null;
let canvasElement = null;
let flashEnabled = false;

export function initScanner(video, canvas) {
    videoElement = video;
    canvasElement = canvas;
}

export async function startCamera() {
    try {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            throw new Error('La cámara requiere conexión segura (HTTPS).');
        }
        
        stopCamera();
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a la cámara.');
        }
        
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
            videoElement.muted = true;
            await videoElement.play();
        }
        
        flashEnabled = false;
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

export function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (videoElement) {
        videoElement.srcObject = null;
    }
    
    flashEnabled = false;
}

export async function toggleFlash() {
    if (!videoStream) {
        return false;
    }
    
    const track = videoStream.getVideoTracks()[0];
    if (!track) {
        return false;
    }
    
    try {
        const capabilities = track.getCapabilities();
        
        if (!capabilities.torch) {
            console.warn('Flash/torch no soportado en este dispositivo');
            return false;
        }
        
        flashEnabled = !flashEnabled;
        
        await track.applyConstraints({
            advanced: [{ torch: flashEnabled }]
        });
        
        console.log(`Flash ${flashEnabled ? 'encendido' : 'apagado'}`);
        return true;
    } catch (error) {
        console.error('Error al controlar flash:', error);
        flashEnabled = false;
        return false;
    }
}

export function isFlashEnabled() {
    return flashEnabled;
}

export async function canUseFlash() {
    if (!videoStream) return false;
    
    const track = videoStream.getVideoTracks()[0];
    if (!track) return false;
    
    try {
        const capabilities = track.getCapabilities();
        return !!capabilities.torch;
    } catch {
        return false;
    }
}

export async function captureImage() {
    if (!videoElement || !canvasElement) {
        throw new Error('Escáner no inicializado');
    }
    
    const video = videoElement;
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png');
}

export async function performOCR(imageData, onProgress = null) {
    try {
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

export function extractSerialNumber(text) {
    if (!text) return null;
    
    const cleanText = text.trim();
    
    const patterns = [
        /\b(\d{8,9})\b/g,
        /\b(\d{7,9})\b/g,
        /(\d{8})/g,
        /(\d{9})/g,
    ];
    
    for (const pattern of patterns) {
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
            const longest = matches.reduce((a, b) => a.length >= b.length ? a : b);
            console.log(`Número de serie extraído: ${longest}`);
            return longest;
        }
    }
    
    const allDigits = cleanText.replace(/\D/g, '');
    if (allDigits.length >= 7 && allDigits.length <= 9) {
        console.log(`Número extraído de dígitos: ${allDigits}`);
        return allDigits;
    }
    
    console.warn('No se pudo extraer un número de serie válido');
    return null;
}

export async function scanAndExtract(onProgress = null) {
    if (onProgress) onProgress(0, 'Capturando imagen...');
    const imageData = await captureImage();
    
    if (onProgress) onProgress(10, 'Procesando imagen...');
    const ocrText = await performOCR(imageData, (percent) => {
        if (onProgress) onProgress(10 + (percent * 0.8), 'Reconociendo texto...');
    });
    
    if (onProgress) onProgress(95, 'Extrayendo número...');
    const serialNumber = extractSerialNumber(ocrText);
    
    if (onProgress) onProgress(100, 'Completado');
    
    return serialNumber;
}

export async function hasCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
    } catch {
        return false;
    }
}

export function isCameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
