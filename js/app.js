/**
 * Aplicación Principal
 * Verificador de Billetes Bolivia - PWA
 * Interfaz Unificada
 */

import { loadBlacklist } from './db.js';
import { validateSerialNumber, cleanSerialNumber, formatSerialNumber } from './validator.js';
import { 
    initScanner, 
    startCamera, 
    stopCamera, 
    scanAndExtract, 
    isCameraSupported,
    toggleFlash,
    isFlashEnabled,
    canUseFlash
} from './scanner.js';

const state = {
    selectedDenomination: null,
    showingResults: false
};

const elements = {
    cameraPreview: null,
    captureCanvas: null,
    cameraStatus: null,
    btnRetryCamera: null,
    btnCapture: null,
    btnFlash: null,
    btnDenominations: null,
    denominationSelector: null,
    resultsContainer: null,
    resultCards: null,
    manualInput: null,
    btnVerifyManual: null,
    loadingOverlay: null,
    btnReset: null,
    serialDisplay: null,
    serialNumber: null
};

async function init() {
    console.log('Iniciando Verificador de Billetes Bolivia...');
    
    cacheElements();
    
    try {
        await loadBlacklist();
        console.log('Datos cargados correctamente');
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showError('Error al cargar los datos. Verifica tu conexión.');
    }
    
    setupEventListeners();
    registerServiceWorker();
    
    if (!isCameraSupported()) {
        console.warn('Cámara no soportada en este navegador');
    }
    
    await initCamera();
    
    console.log('Aplicación lista');
}

function cacheElements() {
    elements.cameraPreview = document.getElementById('camera-preview');
    elements.captureCanvas = document.getElementById('capture-canvas');
    elements.cameraStatus = document.getElementById('camera-status');
    elements.btnRetryCamera = document.getElementById('btn-retry-camera');
    elements.btnCapture = document.getElementById('btn-capture');
    elements.btnFlash = document.getElementById('btn-flash');
    elements.btnDenominations = document.querySelectorAll('.btn-denomination');
    elements.denominationSelector = document.getElementById('denomination-selector');
    elements.resultsContainer = document.getElementById('results-container');
    elements.resultCards = document.querySelectorAll('.result-card');
    elements.manualInput = document.getElementById('manual-input');
    elements.btnVerifyManual = document.getElementById('btn-verify-manual');
    elements.loadingOverlay = document.getElementById('loading-overlay');
    elements.btnReset = document.getElementById('btn-reset');
    elements.serialDisplay = document.getElementById('serial-display');
    elements.serialNumber = document.getElementById('serial-number');
}

function setupEventListeners() {
    elements.btnRetryCamera.addEventListener('click', retryCamera);
    
    elements.btnCapture.addEventListener('click', handleCapture);
    
    elements.btnFlash.addEventListener('click', handleFlashToggle);
    
    elements.btnDenominations.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.value;
            toggleDenomination(value);
        });
    });
    
    elements.btnVerifyManual.addEventListener('click', handleManualVerification);
    
    elements.manualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleManualVerification();
        }
    });
    
    elements.manualInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    elements.btnReset.addEventListener('click', resetScanner);
}

async function initCamera() {
    initScanner(elements.cameraPreview, elements.captureCanvas);
    
    updateCameraStatus('loading', 'Iniciando cámara...');
    
    try {
        await startCamera();
        updateCameraStatus('active');
        
        const hasFlash = await canUseFlash();
        if (!hasFlash) {
            elements.btnFlash.style.display = 'none';
        }
    } catch (error) {
        console.warn('No se pudo iniciar la cámara:', error.message);
        updateCameraStatus('error', error.message || 'Cámara no disponible');
    }
}

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

async function handleFlashToggle() {
    const success = await toggleFlash();
    if (success) {
        elements.btnFlash.classList.toggle('active', isFlashEnabled());
    }
}

function toggleDenomination(value) {
    elements.btnDenominations.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    if (state.selectedDenomination === value) {
        state.selectedDenomination = null;
    } else {
        state.selectedDenomination = value;
        const selectedBtn = document.querySelector(`.btn-denomination[data-value="${value}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
    }
}

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

function processSerialNumber(serialNumber) {
    if (state.selectedDenomination) {
        const result = validateSerialNumber(state.selectedDenomination, serialNumber);
        showSingleResult(result);
    } else {
        const results = validateAllDenominations(serialNumber);
        showAllResults(results);
    }
}

function validateAllDenominations(serialNumber) {
    const denominations = ['10', '20', '50'];
    const results = {};
    
    for (const denom of denominations) {
        results[denom] = validateSerialNumber(denom, serialNumber);
    }
    
    return results;
}

function showSingleResult(result) {
    showLoading(false);
    
    elements.serialNumber.textContent = formatSerialNumber(result.serialNumber);
    elements.serialDisplay.style.display = 'block';
    
    const cards = ['10', '20', '50'];
    elements.resultCards.forEach((card, index) => {
        const denom = cards[index];
        const statusEl = card.querySelector('.result-status');
        
        if (denom === result.denomination) {
            card.classList.remove('success', 'danger', 'highlighted');
            card.classList.add(result.status === 'VALID' ? 'success' : 'danger');
            card.classList.add('highlighted');
            statusEl.textContent = result.status === 'VALID' ? 'OPERATIVO' : 'INHABILITADO';
        } else {
            card.classList.remove('success', 'danger', 'highlighted');
            statusEl.textContent = '—';
        }
    });
    
    elements.denominationSelector.style.display = 'none';
    elements.resultsContainer.style.display = 'grid';
    elements.btnReset.style.display = 'flex';
    
    state.showingResults = true;
}

function showAllResults(results) {
    showLoading(false);
    
    const serialNum = Object.values(results)[0].serialNumber;
    elements.serialNumber.textContent = formatSerialNumber(serialNum);
    elements.serialDisplay.style.display = 'block';
    
    const cards = ['10', '20', '50'];
    elements.resultCards.forEach((card, index) => {
        const denom = cards[index];
        const result = results[denom];
        const statusEl = card.querySelector('.result-status');
        
        card.classList.remove('success', 'danger', 'highlighted');
        card.classList.add(result.status === 'VALID' ? 'success' : 'danger');
        statusEl.textContent = result.status === 'VALID' ? 'OPERATIVO' : 'INHABILITADO';
    });
    
    elements.denominationSelector.style.display = 'none';
    elements.resultsContainer.style.display = 'grid';
    elements.btnReset.style.display = 'flex';
    
    state.showingResults = true;
}

function resetScanner() {
    elements.denominationSelector.style.display = 'grid';
    elements.resultsContainer.style.display = 'none';
    elements.btnReset.style.display = 'none';
    elements.serialDisplay.style.display = 'none';
    elements.manualInput.value = '';
    
    elements.btnDenominations.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    state.selectedDenomination = null;
    state.showingResults = false;
}

function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

function updateLoadingMessage(message) {
    const text = elements.loadingOverlay.querySelector('p');
    if (text) {
        text.textContent = message || 'Procesando...';
    }
}

function showError(message) {
    alert(message);
}

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registrado:', registration.scope);
            
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
            
            if (registration.waiting) {
                showUpdateNotification();
            }
        } catch (error) {
            console.error('Error al registrar Service Worker:', error);
        }
    }
}

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.app = {
    state,
    validateSerialNumber,
    resetScanner
};
