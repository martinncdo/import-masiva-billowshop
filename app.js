import fs from 'node:fs/promises';
import { tomarPool } from './db/config.js'
import { leerCsvProductos } from './csv/productscsv.js'
import { google } from "googleapis";
import dotenv from "dotenv";
import { mainIA } from './iafunctions.js';
import { mainImages } from './pruebaimagenes.js';
import { getDolarFlexxus } from './dolar/getDolar.js';

dotenv.config();

const CONFIG = {

    // Google Sheets
    KEY_FILE: "./billow-automatizaciones.json",

    SPREADSHEET_ID:
        process.env.SPREADSHEET_ID,

    SHEET_NAME:
        "pendientes_a_subir",


    // OpenRouter
    OPENROUTER_API_KEY:
        process.env.OPENROUTER_API_KEY,

    OPENROUTER_URL:
        "https://openrouter.ai/api/v1/chat/completions",

    MODEL:
        "openai/gpt-4o-mini",


    // IA
    TEMPERATURE:
        0,

    MAX_TOKENS:
        150,


    // Seguridad
    MIN_DIMENSION:
        5,

    MIN_WEIGHT:
        0.1,


    // Espera entre productos
    DELAY_MS:
        1000
};

async function agregarProductosCSV(productos) {
    if (productos.length === 0) {
        console.log('No hay productos nuevos para agregar al CSV.');
        return;
    }

    const rutaCSV = './csv/productos_billow.csv';

    const filas = productos.map(producto => {
        const columnas = [
            '',                         // id
            '',                         // titulo
            '',                         // slug
            '',                         // url_producto
            '',                         // tiene_variantes
            String(producto.CODIGO).trim(), // codigo
            '',                         // cantidad
            '',                         // precio_lista
            '',                         // precio_prom
            '',                         // atributo
            '',                         // atributo_nombre
            '',                         // atributo_valor
            ''                          // atributo_valor_nombre
        ];

        return columnas.join(',');
    });

    const contenidoActual = await fs.readFile(rutaCSV, 'utf8');

    const separador = contenidoActual.endsWith('\n') ? '' : '\n';

    await fs.appendFile(
        rutaCSV,
        separador + filas.join('\n') + '\n',
        'utf8'
    );

    console.log(`Se agregaron ${productos.length} códigos al CSV.`);
}

function calcularPrecio(producto, dolar) {
    let precio = Number(producto.PRECIOVENTA1);

    // Convertir dólares a pesos
    if (producto.CODIGOMONEDA === 'DOLARES') {
        precio *= dolar;
    }

    return Number(Math.round(precio));
}

function limpiarNombre(nombre) {
    return nombre
        .replace(/14��/g, '14"')
        .replace(/ESTA�O/g, 'ESTAÑO')
        .replace(/�/g, '');
}

async function subirAGoogleSheets(productos) {

    if (productos.length === 0) {
        console.log('No hay productos nuevos para subir.');
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CONFIG.KEY_FILE,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets'
        ]
    });

    const sheets = google.sheets({
        version: 'v4',
        auth
    });

    const dolar = await getDolarFlexxus();

    const values = productos.map(producto => [
        producto.CODIGO,
        limpiarNombre(producto.TITULO),
        '',
        producto.RUBRO,
        producto.MARCA,
        producto.IMPUESTO == 0.5 ? 'AR_10_5' : 'AR_21',
        '',
        '',
        '',
        '',
        '',
        '',
        calcularPrecio(producto, dolar),
        producto.REMANENTE,
        producto.GRUPO_SUPER_RUBRO,
        producto.SUPER_RUBRO,
        producto.RUBRO
    ]);

    await sheets.spreadsheets.values.append({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${CONFIG.SHEET_NAME}!A2:F`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values
        }
    });

    console.log(`Se subieron ${productos.length} productos a Google Sheets.`);
}

async function getProductsDB() {
    limpiarGoogleSheets()
    const query = await fs.readFile('consulta.sql', 'utf8');

    const productsDB = await tomarPool(query)

    const productsInBillow = await leerCsvProductos('./csv/productos_billow.csv')

    const codigosBillow = new Set(
        productsInBillow.map(producto => String(producto.codigo).trim())
    );

    const faltantes = productsDB.filter(
        producto => !codigosBillow.has(String(producto.CODIGO).trim())
    );


    await subirAGoogleSheets(faltantes)
    await agregarProductosCSV(faltantes)
    await mainIA()
    await mainImages()
}

async function limpiarGoogleSheets() {

    const auth = new google.auth.GoogleAuth({
        keyFile: CONFIG.KEY_FILE,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets'
        ]
    });

    const sheets = google.sheets({
        version: 'v4',
        auth
    });

    await sheets.spreadsheets.values.clear({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${CONFIG.SHEET_NAME}!A2:Q`
    });

    console.log('Se limpió el rango A2:Q de Google Sheets.');
}

getProductsDB()