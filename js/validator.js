/**
 * Módulo de Validación
 * Verifica si un número de serie está dentro de los rangos inhabilitados
 */

import { getRanges } from './db.js';

/**
 * Resultado de la validación
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - true si el billete es válido, false si está inhabilitado
 * @property {string} status - 'VALID' o 'DISABLED'
 * @property {string} message - Mensaje descriptivo del resultado
 */

/**
 * Valida un número de serie contra los rangos inhabilitados
 * @param {string} denomination - Denominación del billete ('10', '20', '50')
 * @param {string|number} serialNumber - Número de serie a validar
 * @returns {ValidationResult} Resultado de la validación
 */
export function validateSerialNumber(denomination, serialNumber) {
    // Convertir a número entero
    const serial = parseInt(serialNumber, 10);
    
    // Validar que sea un número válido
    if (isNaN(serial) || serial <= 0) {
        return {
            isValid: false,
            status: 'ERROR',
            message: 'Número de serie inválido. Ingresa solo números.'
        };
    }
    
    // Validar denominación
    const validDenominations = ['10', '20', '50'];
    if (!validDenominations.includes(denomination)) {
        return {
            isValid: false,
            status: 'ERROR',
            message: 'Denominación inválida. Selecciona Bs 10, 20 o 50.'
        };
    }
    
    // Obtener los rangos inhabilitados para esta denominación
    const ranges = getRanges(denomination);
    
    if (ranges.length === 0) {
        return {
            isValid: false,
            status: 'ERROR',
            message: 'No se encontraron datos para esta denominación.'
        };
    }
    
    // Verificar si el número está en algún rango inhabilitado
    for (const range of ranges) {
        if (serial >= range.del && serial <= range.al) {
            return {
                isValid: false,
                status: 'DISABLED',
                message: 'BILLETE INHABILITADO - NO ACEPTAR',
                serialNumber: serialNumber,
                denomination: denomination
            };
        }
    }
    
    // Si no está en ningún rango, el billete es válido
    return {
        isValid: true,
        status: 'VALID',
        message: 'BILLETE OPERATIVO',
        serialNumber: serialNumber,
        denomination: denomination
    };
}

/**
 * Limpia un número de serie removiendo caracteres no numéricos
 * @param {string} input - String de entrada posiblemente con caracteres extra
 * @returns {string} Número de serie limpio
 */
export function cleanSerialNumber(input) {
    if (!input) return '';
    // Remover todo lo que no sea dígito
    return input.replace(/\D/g, '');
}

/**
 * Formatea un número de serie para mostrar (con separadores de miles)
 * @param {string|number} serialNumber - Número de serie
 * @returns {string} Número formateado
 */
export function formatSerialNumber(serialNumber) {
    const num = parseInt(serialNumber, 10);
    if (isNaN(num)) return serialNumber;
    return num.toLocaleString('es-BO');
}