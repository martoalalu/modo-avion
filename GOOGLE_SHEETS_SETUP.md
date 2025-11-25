# Configuración de Sincronización con Google Sheets

Esta guía te ayudará a configurar la sincronización automática con Google Sheets para mantener tus datos respaldados.

## Pasos para configurar Google Apps Script

1. **Crear un nuevo Google Spreadsheet**
   - Ve a [Google Sheets](https://sheets.google.com) y crea una nueva hoja de cálculo
   - Dale un nombre descriptivo como "Inventario - Sistema de Gestión"

2. **Crear las hojas necesarias**
   - Crea 3 hojas con estos nombres exactos:
     - `products`
     - `stockMovements`
     - `sales`

3. **Configurar Apps Script**
   - En tu spreadsheet, ve a **Extensiones → Apps Script**
   - Borra el código predeterminado
   - Copia y pega el siguiente código:

\`\`\`javascript
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Parse request parameters
  let sheet, action;
  
  if (e.postData) {
    // POST request with JSON body
    const data = JSON.parse(e.postData.contents);
    sheet = data.sheet;
    action = data.action;
  } else {
    // GET request with query parameters
    sheet = e.parameter.sheet;
    action = e.parameter.action || 'read';
  }

  if (action === 'read') {
    // Read data from sheet
    const sheetObj = spreadsheet.getSheetByName(sheet);
    if (!sheetObj) {
      return ContentService.createTextOutput(JSON.stringify({
        error: `Sheet ${sheet} not found`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheetObj.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({
      values: data
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'write') {
    // Write data to sheet
    const values = e.postData ? JSON.parse(e.postData.contents).values : [];
    const sheetObj = spreadsheet.getSheetByName(sheet);
    
    if (!sheetObj) {
      return ContentService.createTextOutput(JSON.stringify({
        error: `Sheet ${sheet} not found`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Clear existing data and write new data
    sheetObj.clear();
    if (values && values.length > 0) {
      sheetObj.getRange(1, 1, values.length, values[0].length).setValues(values);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    error: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}
\`\`\`

4. **Implementar como Web App**
   - Haz clic en **Implementar → Nueva implementación**
   - Selecciona **Web App**
   - Configura:
     - **Ejecutar como:** Yo (tu-email@gmail.com) ← **CRÍTICO: Debe ser "Yo" para que funcione con usuarios anónimos**
     - **Quién tiene acceso:** **Cualquier persona**
   - Haz clic en **Implementar**
   - **Autoriza los permisos**: Google te pedirá autorización
     - Haz clic en "Revisar permisos"
     - Selecciona tu cuenta
     - Si aparece "Esta aplicación no está verificada", haz clic en "Avanzado" → "Ir a [nombre del proyecto] (no seguro)"
     - Haz clic en "Permitir"
   - **IMPORTANTE:** Copia la URL del Web App que aparece (empieza con `https://script.google.com/macros/s/...`)

5. **Configurar en la aplicación**
   - Abre la consola del navegador (F12)
   - Ejecuta este comando para configurar la URL:

\`\`\`javascript
localStorage.setItem('googleSheetsConfig', JSON.stringify({
  webAppUrl: 'TU_URL_DEL_APPS_SCRIPT_AQUI'
}));
\`\`\`

   - Recarga la página


## Solución de problemas

**Error 302 (Redirect):** Asegúrate de que el script esté desplegado con acceso "Cualquier persona"

**Error 403 (Forbidden) o "Authorization required":** 
- Ve a **Implementar → Administrar implementaciones**
- Edita la implementación
- **IMPORTANTE:** Verifica que "Ejecutar como" esté configurado como **"Yo" (tu cuenta)**, NO como "Usuario que accede a la aplicación web"
- Guarda los cambios

**Usuarios anónimos no pueden escribir:**
- El script DEBE ejecutarse con TUS credenciales (el dueño de la hoja)
- Configura "Ejecutar como: Yo" en el deployment
- Esto permite que cualquier persona (incluso anónima) pueda escribir datos usando tu autorización

**Datos no aparecen:** Verifica que las 3 hojas tengan los nombres exactos: `products`, `stockMovements`, `sales`

## Nota de Seguridad

⚠️ El Apps Script se ejecuta con tus credenciales pero es accesible públicamente. Cualquier persona con la URL de tu aplicación puede leer/escribir datos. Solo comparte la URL con personas de confianza.
