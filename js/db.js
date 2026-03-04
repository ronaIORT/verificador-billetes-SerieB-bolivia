/**
 * Módulo de Base de Datos
 * Carga y gestiona los rangos de billetes inhabilitados
 */

let blacklistData = null;

/**
 * Carga los datos de la lista negra desde el archivo JSON
 * @returns {Promise<Object>} Datos de rangos inhabilitados
 */
export async function loadBlacklist() {
    if (blacklistData) {
        return blacklistData;
    }
    
    try {
        const response = await fetch('./data/blacklist.json');
        
        if (!response.ok) {
            throw new Error(`Error al cargar datos: ${response.status}`);
        }
        
        blacklistData = await response.json();
        console.log('Datos de billetes inhabilitados cargados correctamente');
        return blacklistData;
    } catch (error) {
        console.error('Error cargando blacklist:', error);
        throw error;
    }
}

/**
 * Obtiene los rangos de una denominación específica
 * @param {string} denomination - Denominación del billete ('10', '20', '50')
 * @returns {Array} Array de rangos {del, al}
 */
export function getRanges(denomination) {
    if (!blacklistData) {
        console.warn('Datos no cargados. Llama a loadBlacklist() primero.');
        return [];
    }
    
    return blacklistData[denomination] || [];
}

/**
 * Verifica si los datos están cargados
 * @returns {boolean}
 */
export function isDataLoaded() {
    return blacklistData !== null;
}