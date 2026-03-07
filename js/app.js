/**
 * Aplicación Principal
 * Verificador de Billetes Bolivia - PWA
 */

import { loadBlacklist } from './db.js';
import { validateSerialNumber, cleanSerialNumber, formatSerialNumber } from './validator.js';
import { 
    initScanner, 
    startCamera, 
    stopCamera, 
    scanAndExtract, 
    isCameraSupported 
} from './scanner.js';

// Estado de la aplicación
const state = {
    currentDenomination: null,
    currentScreen: 'welcome'
};

// Elementos del DOM
const elements = {
    // Pantallas
    screenWelcome: null,
    screenScan: null,
    screenResult: null,
    
    // Botones de denominación
    btnDenominations: null,
    
    // Pantalla de escaneo
    btnBackScan: null,
    denominationTitle: null,
    cameraPreview: null,
    captureCanvas: null,
    cameraStatus: null,
    btnRetryCamera: null,
    btnCapture: null,
    manualInput: null,
    btnVerifyManual: null,
    loadingOverlay: null,
    
    // Pantalla de resultado
    resultCard: null,
    resultIcon: null,
    resultTitle: null,
    resultNumber: null,
    resultDescription: null,
    btnScanAnother: null,
    btnBackHome: null
};

/**
 * Inicializa la aplicación
 */
async function init() {
    console.log('Iniciando Verificador de Billetes Bolivia...');
    
    // Cachear elementos del DOM
    cacheElements();
    
    // Cargar datos de billetes inhabilitados
    try {
        await loadBlacklist();
        console.log('Datos cargados correctamente');
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showError('Error al cargar los datos. Verifica tu conexión.');
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Registrar Service Worker
    registerServiceWorker();
    
    // Verificar soporte de cámara
    if (!isCameraSupported()) {
        console.warn('Cámara no soportada en este navegador');
    }
    
    console.log('Aplicación lista');
}

/**
 * Cachea referencias a elementos del DOM
 */
function cacheElements() {
    // Pantallas
    elements.screenWelcome = document.getElementById('screen-welcome');
    elements.screenScan = document.getElementById('screen-scan');
    elements.screenResult = document.getElementById('screen-result');
    
    // Botones de denominación
    elements.btnDenominations = document.querySelectorAll('.btn-denomination');
    
    // Pantalla de escaneo
    elements.btnBackScan = document.getElementById('btn-back-scan');
    elements.denominationTitle = document.getElementById('denomination-title');
    elements.cameraPreview = document.getElementById('camera-preview');
    elements.captureCanvas = document.getElementById('capture-canvas');
    elements.cameraStatus = document.getElementById('camera-status');
    elements.btnRetryCamera = document.getElementById('btn-retry-camera');
    elements.btnCapture = document.getElementById('btn-capture');
    elements.manualInput = document.getElementById('manual-input');
    elements.btnVerifyManual = document.getElementById('btn-verify-manual');
    elements.loadingOverlay = document.getElementById('loading-overlay');
    
    // Pantalla de resultado
    elements.resultCard = document.getElementById('result-card');
    elements.resultIcon = document.getElementById('result-icon');
    elements.resultTitle = document.getElementById('result-title');
    elements.resultNumber = document.getElementById('result-number');
    elements.resultDescription = document.getElementById('result-description');
    elements.btnScanAnother = document.getElementById('btn-scan-another');
    elements.btnBackHome = document.getElementById('btn-back-home');
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    // Botones de denominación
    elements.btnDenominations.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.value;
            selectDenomination(value);
        });
    });
    
    // Botón volver (pantalla escaneo)
    elements.btnBackScan.addEventListener('click', () => {
        goToScreen('welcome');
    });
    
    // Botón reintentar cámara
    elements.btnRetryCamera.addEventListener('click', retryCamera);
    
    // Botón capturar/escanear
    elements.btnCapture.addEventListener('click', handleCapture);
    
    // Botón verificar manual
    elements.btnVerifyManual.addEventListener('click', handleManualVerification);
    
    // Enter en input manual
    elements.manualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleManualVerification();
        }
    });
    
    // Solo permitir números en el input
    elements.manualInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    // Botón escanear otro
    elements.btnScanAnother.addEventListener('click', () => {
        goToScreen('scan');
    });
    
    // Botón volver al inicio
    elements.btnBackHome.addEventListener('click', () => {
        goToScreen('welcome');
    });
}

/**
 * Selecciona una denominación y navega a la pantalla de escaneo
 * @param {string} value - Valor de la denominación ('10', '20', '50')
 */
async function selectDenomination(value) {
    state.currentDenomination = value;
    elements.denominationTitle.textContent = `Bs ${value}`;
    elements.manualInput.value = '';
    
    goToScreen('scan');
    
    // Inicializar escáner
    initScanner(elements.cameraPreview, elements.captureCanvas);
    
    // Mostrar estado de carga
    updateCameraStatus('loading', 'Iniciando cámara...');
    
    // Intentar iniciar cámara
    try {
        await startCamera();
        updateCameraStatus('active');
    } catch (error) {
        console.warn('No se pudo iniciar la cámara:', error.message);
        updateCameraStatus('error', error.message || 'Cámara no disponible');
    }
}

/**
 * Actualiza el indicador de estado de la cámara
 * @param {string} status - Estado: 'loading', 'active', 'error'
 * @param {string} message - Mensaje a mostrar (opcional)
 */
function updateCameraStatus(status, message = '') {
    const statusEl = elements.cameraStatus;
    const retryBtn = elements.btnRetryCamera;
    if (!statusEl) return;
    
    statusEl.classList.remove('active', 'loading', 'error');
    
    if (status === 'active') {
        statusEl.classList.add('active');
        if (retryBtn) retryBtn.style.display = 'none';
    } else if (status === 'loading') {
        statusEl.classList.add('loading');
        statusEl.querySelector('.camera-status-text').textContent = message || 'Cargando...';
        if (retryBtn) retryBtn.style.display = 'none';
    } else if (status === 'error') {
        statusEl.classList.add('error');
        statusEl.querySelector('.camera-status-text').textContent = message || 'Error de cámara';
        if (retryBtn) retryBtn.style.display = 'inline-block';
    }
}

/**
 * Reintenta iniciar la cámara
 */
async function retryCamera() {
    updateCameraStatus('loading', 'Reintentando...');
    
    try {
        await startCamera();
        updateCameraStatus('active');
    } catch (error) {
        console.warn('Error al reintentar cámara:', error.message);
        updateCameraStatus('error', error.message || 'Cámara no disponible');
    }
}

/**
 * Maneja el evento de captura/escaneo
 */
async function handleCapture() {
    showLoading(true);
    
    try {
        const serialNumber = await scanAndExtract((percent, message) => {
            updateLoadingMessage(message);
        });
        
        if (serialNumber) {
            processSerialNumber(serialNumber);
        } else {
            showError('No se pudo leer el número de serie. Intenta con la entrada manual.');
            showLoading(false);
        }
    } catch (error) {
        console.error('Error en captura:', error);
        showError(error.message || 'Error al procesar la imagen.');
        showLoading(false);
    }
}

/**
 * Maneja la verificación manual
 */
function handleManualVerification() {
    const input = elements.manualInput.value.trim();
    const serialNumber = cleanSerialNumber(input);
    
    if (!serialNumber) {
        showError('Ingresa un número de serie válido.');
        return;
    }
    
    if (serialNumber.length < 7) {
        showError('El número de serie debe tener al menos 7 dígitos.');
        return;
    }
    
    processSerialNumber(serialNumber);
}

/**
 * Procesa un número de serie y muestra el resultado
 * @param {string} serialNumber - Número de serie a validar
 */
function processSerialNumber(serialNumber) {
    const result = validateSerialNumber(state.currentDenomination, serialNumber);
    showResult(result);
}

/**
 * Muestra el resultado de la validación
 * @param {Object} result - Resultado de la validación
 */
function showResult(result) {
    showLoading(false);
    
    // Configurar tarjeta de resultado
    elements.resultCard.classList.remove('success', 'danger');
    
    if (result.status === 'VALID') {
        elements.resultCard.classList.add('success');
        elements.resultIcon.textContent = '✓';
        elements.resultTitle.textContent = 'BILLETE OPERATIVO';
        elements.resultDescription.textContent = 'Este billete se encuentra en circulación válida.';
    } else if (result.status === 'DISABLED') {
        elements.resultCard.classList.add('danger');
        elements.resultIcon.textContent = '✗';
        elements.resultTitle.textContent = 'BILLETE INHABILITADO';
        elements.resultDescription.textContent = 'NO ACEPTAR - Este billete no tiene valor según el BCB.';
    } else {
        elements.resultCard.classList.add('danger');
        elements.resultIcon.textContent = '!';
        elements.resultTitle.textContent = 'ERROR';
        elements.resultDescription.textContent = result.message;
    }
    
    elements.resultNumber.textContent = `Serie: ${formatSerialNumber(result.serialNumber)}`;
    
    goToScreen('result');
}

/**
 * Navega a una pantalla específica
 * @param {string} screenName - Nombre de la pantalla ('welcome', 'scan', 'result')
 */
async function goToScreen(screenName) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Detener cámara si salimos de la pantalla de escaneo
    if (state.currentScreen === 'scan' && screenName !== 'scan') {
        stopCamera();
    }
    
    // Mostrar la pantalla destino
    const screenId = `screen-${screenName}`;
    const targetScreen = document.getElementById(screenId);
    
    if (targetScreen) {
        targetScreen.classList.add('active');
        state.currentScreen = screenName;
    }
    
    // Reiniciar cámara si volvemos a escaneo
    if (screenName === 'scan' && state.currentDenomination) {
        updateCameraStatus('loading', 'Iniciando cámara...');
        try {
            await startCamera();
            updateCameraStatus('active');
        } catch (error) {
            updateCameraStatus('error', error.message || 'Cámara no disponible');
        }
    }
}

/**
 * Muestra/oculta el overlay de carga
 * @param {boolean} show - true para mostrar, false para ocultar
 */
function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

/**
 * Actualiza el mensaje del overlay de carga
 * @param {string} message - Mensaje a mostrar
 */
function updateLoadingMessage(message) {
    const text = elements.loadingOverlay.querySelector('p');
    if (text) {
        text.textContent = message || 'Procesando...';
    }
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 */
function showError(message) {
    // Por ahora usamos alert, pero se puede mejorar con un toast
    alert(message);
}

/**
 * Registra el Service Worker para funcionalidad offline
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registrado:', registration.scope);
            
            // Detectar actualizaciones disponibles
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification();
                        }
                    });
                }
            });
            
            // Verificar si ya hay una actualización esperando
            if (registration.waiting) {
                showUpdateNotification();
            }
        } catch (error) {
            console.error('Error al registrar Service Worker:', error);
        }
    }
}

/**
 * Muestra notificación de actualización disponible
 */
function showUpdateNotification() {
    const existingBanner = document.getElementById('update-banner');
    if (existingBanner) return;
    
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
        <span>Nueva versión disponible</span>
        <button id="btn-update-app">Actualizar</button>
    `;
    document.body.appendChild(banner);
    
    document.getElementById('btn-update-app').addEventListener('click', () => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    });
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exportar para debugging
window.app = {
    state,
    goToScreen,
    validateSerialNumber
};