
import dotenv from "dotenv";
import { google } from "googleapis";
import {
    buscarAtributos,
    devolverCategoriasRelevantes
} from "./test.js";

dotenv.config();


// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {

    // Google Sheets
    KEY_FILE: "./billow-automatizaciones.json",

    SPREADSHEET_ID:
        process.env.SPREADSHEET_ID,

    SHEET_NAME:
        process.env.SHEET_NAME,


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


// ============================================================
// REFERENCIAS APROXIMADAS
// ============================================================

const REFERENCIA_DIMEN = {

    "TONER": {
        alto: 35,
        ancho: 20,
        largo: 38,
        peso: 1.800
    },

    "CARTUCHO_DE_TINTA": {
        alto: 6,
        ancho: 12,
        largo: 15,
        peso: 0.400
    },

    "TINTA_LIQUIDA": {
        alto: 8,
        ancho: 14,
        largo: 20,
        peso: 0.800
    },

    "PILAS": {
        alto: 5,
        ancho: 8,
        largo: 10,
        peso: 0.400
    },

    "CINTA_MATRICIAL": {
        alto: 8,
        ancho: 12,
        largo: 12,
        peso: 0.300
    },

    "FILAMENTO": {
        alto: 10,
        ancho: 22,
        largo: 22,
        peso: 1.300
    },

    "CABEZAL_DE_IMPRESION": {
        alto: 8,
        ancho: 12,
        largo: 15,
        peso: 0.400
    },

    "SISTEMA_CONTINUO_DE_TINTA": {
        alto: 18,
        ancho: 25,
        largo: 28,
        peso: 2.000
    },

    "ADAPTADORES_Y_CONVERSORES_DE_VIDEO": {
        alto: 6,
        ancho: 12,
        largo: 15,
        peso: 0.500
    },

    "CABLES_PERIFERICOS": {
        alto: 5,
        ancho: 15,
        largo: 20,
        peso: 0.400
    },

    "CABLES_VIDEO_AUDIO": {
        alto: 6,
        ancho: 20,
        largo: 25,
        peso: 0.600
    },

    "SOPORTES_CELULAR": {
        alto: 10,
        ancho: 12,
        largo: 15,
        peso: 0.400
    },

    "SOPORTES_PARA_TV": {
        alto: 10,
        ancho: 30,
        largo: 50,
        peso: 3.800
    },

    "TRIPODES": {
        alto: 15,
        ancho: 15,
        largo: 60,
        peso: 2.300
    },

    "CAPTURADORAS_DE_VIDEO": {
        alto: 6,
        ancho: 15,
        largo: 18,
        peso: 0.600
    },

    "CARGADORES_CELULAR_TABLET": {
        alto: 5,
        ancho: 10,
        largo: 15,
        peso: 0.400
    },

    "CARGADORES_NOTEBOOK": {
        alto: 8,
        ancho: 18,
        largo: 25,
        peso: 0.900
    },

    "POWERBANKS": {
        alto: 5,
        ancho: 12,
        largo: 18,
        peso: 0.500
    },

    "ZAPATILLAS_Y_PROLONGADORES": {
        alto: 10,
        ancho: 20,
        largo: 40,
        peso: 1.500
    },

    "PROTECCION_ESTABILIZADOR": {
        alto: 20,
        ancho: 25,
        largo: 35,
        peso: 2.800
    },

    "UPS_Y_BATERIAS": {
        alto: 30,
        ancho: 40,
        largo: 50,
        peso: 12.000
    },

    "FUENTE_DE_ALIMENTACION": {
        alto: 12,
        ancho: 20,
        largo: 25,
        peso: 2.500
    },

    "PLACA_DE_VIDEO": {
        alto: 15,
        ancho: 25,
        largo: 35,
        peso: 2.000
    },

    "MOTHERBOARD": {
        alto: 10,
        ancho: 30,
        largo: 35,
        peso: 1.500
    },

    "GABINETE_PC": {
        alto: 55,
        ancho: 35,
        largo: 60,
        peso: 10.000
    },

    "MONITOR": {
        alto: 15,
        ancho: 45,
        largo: 65,
        peso: 6.000
    },

    "IMPRESORAS": {
        alto: 45,
        ancho: 50,
        largo: 55,
        peso: 12.000
    },

    "ESCANER": {
        alto: 25,
        ancho: 45,
        largo: 55,
        peso: 7.000
    },

    "PC_DE_ESCRITORIO_ARMADA": {
        alto: 60,
        ancho: 40,
        largo: 65,
        peso: 15.000
    },

    "NOTEBOOK": {
        alto: 10,
        ancho: 40,
        largo: 50,
        peso: 3.500
    },

    "AIRE_ACONDICIONADO": {
        alto: 35,
        ancho: 40,
        largo: 100,
        peso: 13.000
    },

    "VENTILADOR_DE_PIE": {
        alto: 140,
        ancho: 55,
        largo: 55,
        peso: 7.000
    },

    "PANEL_CALEFACTOR": {
        alto: 15,
        ancho: 60,
        largo: 80,
        peso: 9.000
    }

};


// ============================================================
// IDs DE CATEGORÍAS CONOCIDOS
// ============================================================

const CATEGORIA_POR_ID = {

    "1127":
        "AIRE_COMPRIMIDO",

    "1119":
        "UPS_Y_BATERIAS",

    "1385":
        "FUENTE_DE_ALIMENTACION"

};


// ============================================================
// PALABRAS CLAVE PARA DETECTAR CATEGORÍA
// ============================================================

const PALABRAS_CLAVE = {

    "TONER": [
        "TONER",
        "TÓNER"
    ],

    "CARTUCHO_DE_TINTA": [
        "CARTUCHO"
    ],

    "TINTA_LIQUIDA": [
        "TINTA",
        "BOTELLA DE TINTA"
    ],

    "PILAS": [
        "PILA",
        "PILAS"
    ],

    "CINTA_MATRICIAL": [
        "CINTA MATRIZ",
        "CINTA MATRICIAL"
    ],

    "FILAMENTO": [
        "FILAMENTO",
        "PLA ",
        "PETG"
    ],

    "CABEZAL_DE_IMPRESION": [
        "CABEZAL"
    ],

    "SISTEMA_CONTINUO_DE_TINTA": [
        "SISTEMA CONTINUO"
    ],

    "ADAPTADORES_Y_CONVERSORES_DE_VIDEO": [
        "CONVERSOR",
        "ADAPTADOR HDMI",
        "ADAPTADOR DISPLAYPORT"
    ],

    "CABLES_PERIFERICOS": [
        "CABLE USB",
        "CABLE PERIFERICO"
    ],

    "CABLES_VIDEO_AUDIO": [
        "CABLE HDMI",
        "CABLE VGA",
        "CABLE DISPLAYPORT",
        "CABLE RCA"
    ],

    "SOPORTES_CELULAR": [
        "SOPORTE CELULAR",
        "SOPORTE PARA CELULAR"
    ],

    "SOPORTES_PARA_TV": [
        "SOPORTE TV",
        "SOPORTE PARA TV"
    ],

    "TRIPODES": [
        "TRIPODE",
        "TRÍPODE"
    ],

    "CAPTURADORAS_DE_VIDEO": [
        "CAPTURADORA",
        "CAPTURADOR DE VIDEO"
    ],

    "CARGADORES_CELULAR_TABLET": [
        "CARGADOR CELULAR",
        "CARGADOR TABLET"
    ],

    "CARGADORES_NOTEBOOK": [
        "CARGADOR NOTEBOOK",
        "CARGADOR LAPTOP"
    ],

    "POWERBANKS": [
        "POWERBANK",
        "POWER BANK"
    ],

    "ZAPATILLAS_Y_PROLONGADORES": [
        "ZAPATILLA",
        "PROLONGADOR",
        "ALARGUE"
    ],

    "PROTECCION_ESTABILIZADOR": [
        "ESTABILIZADOR",
        "PROTECTOR DE TENSION",
        "PROTECTOR DE TENSIÓN"
    ],

    "UPS_Y_BATERIAS": [
        "UPS",
        "BATERIA UPS",
        "BATERÍA UPS"
    ],

    "FUENTE_DE_ALIMENTACION": [
        "FUENTE ATX",
        "FUENTE DE ALIMENTACION",
        "FUENTE DE ALIMENTACIÓN"
    ],

    "PLACA_DE_VIDEO": [
        "PLACA DE VIDEO",
        "GPU",
        "GEFORCE",
        "RADEON"
    ],

    "MOTHERBOARD": [
        "MOTHERBOARD",
        "PLACA MADRE"
    ],

    "GABINETE_PC": [
        "GABINETE",
        "CASE PC"
    ],

    "MONITOR": [
        "MONITOR"
    ],

    "IMPRESORAS": [
        "IMPRESORA",
        "MULTIFUNCION"
    ],

    "ESCANER": [
        "ESCANER",
        "ESCÁNER"
    ],

    "PC_DE_ESCRITORIO_ARMADA": [
        "PC ARMADA",
        "COMPUTADORA ARMADA"
    ],

    "NOTEBOOK": [
        "NOTEBOOK",
        "LAPTOP"
    ],

    "AIRE_ACONDICIONADO": [
        "AIRE ACONDICIONADO"
    ],

    "VENTILADOR_DE_PIE": [
        "VENTILADOR DE PIE",
        "VENTILADOR PISO"
    ],

    "PANEL_CALEFACTOR": [
        "PANEL CALEFACTOR",
        "CALEFACTOR"
    ]

};


// ============================================================
// NORMALIZAR TEXTO
// ============================================================

function normalizarTexto(texto) {

    return String(texto || "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

}


// ============================================================
// BUSCAR REFERENCIA
// ============================================================

function obtenerReferencia(categoria, titulo) {

    const categoriaTexto =
        normalizarTexto(categoria);

    const tituloTexto =
        normalizarTexto(titulo);


    // 1. Si categoria es un ID

    const categoriaPorId =
        CATEGORIA_POR_ID[String(categoria).trim()];

    if (categoriaPorId) {

        return {
            tipo: categoriaPorId,
            referencia:
                REFERENCIA_DIMEN[categoriaPorId]
        };

    }


    // 2. Si categoria coincide con una referencia

    for (const tipo of Object.keys(REFERENCIA_DIMEN)) {

        const nombre =
            normalizarTexto(
                tipo.replaceAll("_", " ")
            );

        if (
            categoriaTexto === nombre ||
            categoriaTexto.includes(nombre)
        ) {

            return {
                tipo,
                referencia:
                    REFERENCIA_DIMEN[tipo]
            };

        }

    }


    // 3. Buscar por palabras clave

    const textoBusqueda =
        `${categoriaTexto} ${tituloTexto}`;

    for (
        const [tipo, palabras]
        of Object.entries(PALABRAS_CLAVE)
    ) {

        for (const palabra of palabras) {

            const palabraNormalizada =
                normalizarTexto(palabra);

            if (
                textoBusqueda.includes(
                    palabraNormalizada
                )
            ) {

                return {
                    tipo,
                    referencia:
                        REFERENCIA_DIMEN[tipo]
                };

            }

        }

    }


    return null;

}


// ============================================================
// LIMPIAR NÚMERO
// ============================================================

function limpiarNumero(valor, minimo) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return minimo;
    }

    const numero =
        parseFloat(
            String(valor)
                .replace(",", ".")
        );

    if (isNaN(numero)) {
        return minimo;
    }

    return Math.max(
        numero,
        minimo
    );

}


// ============================================================
// CONSULTAR OPENROUTER
// ============================================================

async function consultarOpenRouter(prompt) {

    const response =
        await fetch(
            CONFIG.OPENROUTER_URL,
            {

                method: "POST",

                headers: {

                    "Authorization":
                    `Bearer ${process.env.OPENROUTER_API_KEY}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        "http://localhost",

                    "X-Title":
                        "Dimensiones productos"

                },

                body:
                    JSON.stringify({

                        model:
                            CONFIG.MODEL,

                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],

                        temperature:
                            CONFIG.TEMPERATURE,

                        max_tokens:
                            CONFIG.MAX_TOKENS

                    })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `OpenRouter ${response.status}: ${JSON.stringify(data)}`
        );

    }


    return data;

}


// ============================================================
// GOOGLE SHEETS
// ============================================================

async function conectarSheets() {

    const auth =
        new google.auth.GoogleAuth({

            keyFile:
                CONFIG.KEY_FILE,

            scopes: [
                "https://www.googleapis.com/auth/spreadsheets"
            ]

        });


    return google.sheets({
        version: "v4",
        auth
    });

}


// ============================================================
// LEER PLANILLA
// ============================================================

async function obtenerProductos(sheets) {

    const response =
        await sheets.spreadsheets.values.get({

            spreadsheetId:
                CONFIG.SPREADSHEET_ID,

            range:
                `${CONFIG.SHEET_NAME}!A:S`

        });


    return response.data.values || [];

}


// ============================================================
// GUARDAR DIMENSIONES
// G = alto
// H = ancho
// I = largo
// J = peso
// ============================================================

async function guardarDimensiones(
    sheets,
    fila,
    dimensiones
) {

    await sheets.spreadsheets.values.update({

        spreadsheetId:
            CONFIG.SPREADSHEET_ID,

        range:
            `${CONFIG.SHEET_NAME}!G${fila}:J${fila}`,

        valueInputOption:
            "USER_ENTERED",

        requestBody: {

            values: [[

                dimensiones.alto,
                dimensiones.ancho,
                dimensiones.largo,
                dimensiones.peso

            ]]

        }

    });

}


// ============================================================
// GUARDAR CATEGORÍA
// D = categoría
// ============================================================

async function guardarCategoria(
    sheets,
    fila,
    categoria
) {

    await sheets.spreadsheets.values.update({

        spreadsheetId:
            CONFIG.SPREADSHEET_ID,

        range:
            `${CONFIG.SHEET_NAME}!D${fila}`,

        valueInputOption:
            "USER_ENTERED",

        requestBody: {

            values: [[
                categoria
            ]]

        }

    });

}


// ============================================================
// GUARDAR ATRIBUTOS
// L = atributos
// ============================================================

async function guardarAtributos(
    sheets,
    fila,
    atributos
) {

    await sheets.spreadsheets.values.update({

        spreadsheetId:
            CONFIG.SPREADSHEET_ID,

        range:
            `${CONFIG.SHEET_NAME}!M${fila}`,

        valueInputOption:
            "USER_ENTERED",

        requestBody: {

            values: [[
                atributos
            ]]

        }

    });

}


// ============================================================
// PROMPT DIMENSIONES
// ============================================================

function crearPromptDimensiones(
    titulo,
    marca,
    categoria,
    referenciaInfo
) {

    let referenciaTexto =
        "No existe una referencia disponible para este producto.";

    if (referenciaInfo) {

        const ref =
            referenciaInfo.referencia;

        referenciaTexto = `
TIPO DE PRODUCTO DETECTADO:
${referenciaInfo.tipo.replaceAll("_", " ")}

REFERENCIA ORIENTATIVA:

Alto: ${ref.alto} cm
Ancho: ${ref.ancho} cm
Largo: ${ref.largo} cm
Peso: ${ref.peso} kg
`;

    }


    return `
INDICACIONES OBLIGATORIAS:

- Devuelve únicamente JSON válido.
- No escribas explicaciones.
- No agregues texto fuera del JSON.
- Las dimensiones deben estar expresadas en centímetros.
- El peso debe estar expresado en kilogramos.
- Usa la referencia orientativa como ayuda, pero analiza el producto.

PRODUCTO:
${titulo}

MARCA:
${marca || "No especificada"}

CATEGORIA:
${categoria || "No especificada"}

${referenciaTexto}

FORMATO DE RESPUESTA:

{
    "alto": 10,
    "ancho": 20,
    "largo": 30,
    "peso": 2
}
`;

}


// ============================================================
// ACTUALIZAR DIMENSIONES
//
// ESTA FUNCIÓN SOLO ACTUALIZA G:J
//
// ARRANCA DESDE FILA 2
// ============================================================

async function actualizarDimensiones() {

    console.log(
        "\n📦 INICIANDO ACTUALIZACIÓN DE DIMENSIONES"
    );

    const sheets =
        await conectarSheets();

    const rows =
        await obtenerProductos(sheets);


    if (rows.length < 2) {

        console.log(
            "No hay productos para procesar."
        );

        return;

    }


    const headers =
        rows[0];


    const indices = {

        codigo:
            headers.indexOf("codigo"),

        titulo:
            headers.indexOf("titulo"),

        categoria:
            headers.indexOf("categoria"),

        marca:
            headers.indexOf("marca"),

        alto:
            headers.indexOf("alto"),

        ancho:
            headers.indexOf("ancho"),

        largo:
            headers.indexOf("largo"),

        peso:
            headers.indexOf("peso")

    };


    if (indices.titulo === -1) {

        throw new Error(
            'No se encontró la columna "titulo"'
        );

    }


    let procesados = 0;
    let saltados = 0;
    let errores = 0;


    // ========================================================
    // i = 1 = FILA 2 DE SHEETS
    // ========================================================

    for (
        let i = 1;
        i < rows.length;
        i++
    ) {

        const row =
            rows[i];

        const fila =
            i + 1;


        const titulo =
            String(
                row[indices.titulo] || ""
            ).trim();


        if (!titulo) {
            continue;
        }


        const codigo =
            row[indices.codigo] || "";

        const categoria =
            row[indices.categoria] || "";

        const marca =
            row[indices.marca] || "";


        // ====================================================
        // VERIFICAR DIMENSIONES
        // ====================================================

        const altoActual =
            row[indices.alto];

        const anchoActual =
            row[indices.ancho];

        const largoActual =
            row[indices.largo];

        const pesoActual =
            row[indices.peso];


        const yaTieneDimensiones =
            altoActual !== "" &&
            altoActual !== undefined &&
            anchoActual !== "" &&
            anchoActual !== undefined &&
            largoActual !== "" &&
            largoActual !== undefined &&
            pesoActual !== "" &&
            pesoActual !== undefined;


        if (yaTieneDimensiones) {

            console.log(
                `[${fila}] ⏭️ Ya tiene dimensiones: ${codigo} - ${titulo}`
            );

            saltados++;

            continue;

        }


        console.log(
            `\n[${fila}] 📦 ${codigo} - ${titulo}`
        );


        try {

            // Buscar referencia

            const referenciaInfo =
                obtenerReferencia(
                    categoria,
                    titulo
                );


            // Crear prompt

            const prompt =
                crearPromptDimensiones(
                    titulo,
                    marca,
                    categoria,
                    referenciaInfo
                );


            // IA

            const respuesta =
                await consultarOpenRouter(
                    prompt
                );


            const contenido =
                respuesta
                    .choices?.[0]
                    ?.message?.content;


            if (!contenido) {

                throw new Error(
                    "La IA no devolvió contenido"
                );

            }


            // Parsear JSON

            let json;

            try {

                json =
                    JSON.parse(
                        contenido
                            .replace(/```json/gi, "")
                            .replace(/```/g, "")
                            .trim()
                    );

            } catch {

                throw new Error(
                    `Respuesta no válida: ${contenido}`
                );

            }


            // Limpiar

            const dimensiones = {

                alto:
                    limpiarNumero(
                        json.alto,
                        CONFIG.MIN_DIMENSION
                    ),

                ancho:
                    limpiarNumero(
                        json.ancho,
                        CONFIG.MIN_DIMENSION
                    ),

                largo:
                    limpiarNumero(
                        json.largo,
                        CONFIG.MIN_DIMENSION
                    ),

                peso:
                    limpiarNumero(
                        json.peso,
                        CONFIG.MIN_WEIGHT
                    )

            };


            console.log(
                `   📦 ${dimensiones.alto} × ${dimensiones.ancho} × ${dimensiones.largo} cm`
            );

            console.log(
                `   ⚖️ ${dimensiones.peso} kg`
            );


            // Guardar G:J

            await guardarDimensiones(
                sheets,
                fila,
                dimensiones
            );


            console.log(
                "   ✅ Dimensiones guardadas en G:J"
            );


            procesados++;


        } catch (error) {

            errores++;

            console.error(
                `   ❌ Error: ${error.message}`
            );

        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    CONFIG.DELAY_MS
                )
        );

    }


    console.log(
        "\n===================================="
    );

    console.log(
        "🏁 DIMENSIONES FINALIZADAS"
    );

    console.log(
        "===================================="
    );

    console.log(
        `✅ Procesados: ${procesados}`
    );

    console.log(
        `⏭️ Saltados: ${saltados}`
    );

    console.log(
        `❌ Errores: ${errores}`
    );

}


// ============================================================
// ACTUALIZAR CATEGORÍAS
//
// ESTA FUNCIÓN SOLO ACTUALIZA D
//
// ARRANCA DESDE FILA 2
// ============================================================

async function actualizarCategoria() {

    console.log(
        "\n🏷️ INICIANDO ACTUALIZACIÓN DE CATEGORÍAS"
    );


    const sheets =
        await conectarSheets();

    const rows =
        await obtenerProductos(sheets);


    if (rows.length < 2) {

        console.log(
            "No hay productos para procesar."
        );

        return;

    }


    const headers =
        rows[0];


    const indices = {

        codigo:
            headers.indexOf("codigo"),

        titulo:
            headers.indexOf("titulo"),

        categoria:
            headers.indexOf("categoria"),

        marca:
            headers.indexOf("marca")

    };


    if (indices.titulo === -1) {

        throw new Error(
            'No se encontró la columna "titulo"'
        );

    }


    let procesados = 0;
    let saltados = 0;
    let errores = 0;


    for (
        let i = 1;
        i < rows.length;
        i++
    ) {

        const row =
            rows[i];

        const fila =
            i + 1;


        const titulo =
            String(
                row[indices.titulo] || ""
            ).trim();


        if (!titulo) {
            continue;
        }


        const codigo =
            row[indices.codigo] || "";

        const marca =
            row[indices.marca] || "";

        const categoriaActual =
            row[indices.categoria] || "";


        // Si D ya tiene algo, no tocarlo

        if (
            !isNaN(parseInt(categoriaActual))
        ) {

            console.log(
                `[${fila}] ⏭️ Ya tiene categoría: ${codigo} - ${titulo}`
            );

            saltados++;

            continue;

        }


        console.log(
            `\n[${fila}] 🏷️ ${codigo} - ${titulo}`
        );


        try {

            const categorias =
                await devolverCategoriasRelevantes(
                    titulo,
                    categoriaActual,
                    "./categorias_singular.csv"
                );


            const prompt = `
INDICACIONES OBLIGATORIAS:

- Devuelve únicamente JSON válido.
- No escribas explicaciones.
- No agregues texto fuera del JSON.
- Debes seleccionar UNA categoría.
- NO inventes códigos.
- El código debe pertenecer obligatoriamente al listado proporcionado.
- Prioriza el tipo de producto.

PRODUCTO:
${titulo}

MARCA:
${marca || "No especificada"}

CATEGORÍAS DISPONIBLES:

${categorias
                    .map(categoria =>
                        `- Código: ${categoria.codigo}
  Categoría: ${categoria.nombre}`
                    )
                    .join("\n")}

FORMATO DE RESPUESTA:

{
    "codigo_categoria": "1179"
}
`;


            const respuesta =
                await consultarOpenRouter(
                    prompt
                );


            const contenido =
                respuesta
                    .choices?.[0]
                    ?.message?.content;


            if (!contenido) {

                throw new Error(
                    "La IA no devolvió contenido"
                );

            }


            let json;

            try {

                json =
                    JSON.parse(
                        contenido
                            .replace(/```json/gi, "")
                            .replace(/```/g, "")
                            .trim()
                    );

            } catch {

                throw new Error(
                    `Respuesta no válida: ${contenido}`
                );

            }


            if (!json.codigo_categoria) {

                throw new Error(
                    "La IA no devolvió codigo_categoria"
                );

            }


            console.log(
                `   🏷️ Categoría: ${json.codigo_categoria}`
            );


            // Guardar en D

            await guardarCategoria(
                sheets,
                fila,
                json.codigo_categoria
            );


            console.log(
                "   ✅ Categoría guardada en D"
            );


            procesados++;


        } catch (error) {

            errores++;

            console.error(
                `   ❌ Error: ${error.message}`
            );

        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    CONFIG.DELAY_MS
                )
        );

    }


    console.log(
        "\n===================================="
    );

    console.log(
        "🏁 CATEGORÍAS FINALIZADAS"
    );

    console.log(
        "===================================="
    );

    console.log(
        `✅ Procesados: ${procesados}`
    );

    console.log(
        `⏭️ Saltados: ${saltados}`
    );

    console.log(
        `❌ Errores: ${errores}`
    );

}


// ============================================================
// ACTUALIZAR ATRIBUTOS
//
// ESTA FUNCIÓN SOLO ACTUALIZA L
//
// ARRANCA DESDE FILA 2
// ============================================================

async function actualizarAtributos() {

    console.log(
        "\n🔧 INICIANDO ACTUALIZACIÓN DE ATRIBUTOS"
    );


    const sheets =
        await conectarSheets();

    const rows =
        await obtenerProductos(sheets);


    if (rows.length < 2) {

        console.log(
            "No hay productos para procesar."
        );

        return;

    }


    const headers =
        rows[0];


    const indices = {

        codigo:
            headers.indexOf("codigo"),

        titulo:
            headers.indexOf("titulo"),

        categoria:
            headers.indexOf("categoria"),

        rubro:
            headers.indexOf("rubro"),

        super_rubro:
            headers.indexOf("super_rubro"),

        grupo_sr:
            headers.indexOf("grupo_sr"),

        atributos:
            headers.indexOf("atributos")

    };


    if (indices.titulo === -1) {

        throw new Error(
            'No se encontró la columna "titulo"'
        );

    }


    let procesados = 0;
    let saltados = 0;
    let errores = 0;


    for (
        let i = 1;
        i < rows.length;
        i++
    ) {

        const row =
            rows[i];

        const fila =
            i + 1;


        const titulo =
            String(
                row[indices.titulo] || ""
            ).trim();


        if (!titulo) {
            continue;
        }


        const codigo =
            row[indices.codigo] || "";

        const categoria =
            row[indices.categoria] || "";

        const rubro =
            row[indices.rubro] || "";

        const super_rubro =
            row[indices.super_rubro] || "";

        const grupo_sr =
            row[indices.grupo_sr] || "";


        const atributosActuales =
            row[indices.atributos];


        // Si L ya tiene algo, no tocarlo

        if (
            atributosActuales !== "" &&
            atributosActuales !== undefined &&
            atributosActuales !== null
        ) {

            console.log(
                `[${fila}] ⏭️ Ya tiene atributos: ${codigo} - ${titulo}`
            );

            saltados++;

            continue;

        }


        console.log(
            `\n[${fila}] 🔧 ${codigo} - ${titulo}`
        );


        try {

            // Buscar atributos

            const atributosEncontrados =
                await buscarAtributos(
                    titulo,
                    categoria,
                    {
                        grupo_sr,
                        super_rubro,
                        rubro
                    }
                );


            const prompt = `
Analiza el tipo de producto y selecciona únicamente los valores de atributos que sean realmente aplicables a ese producto. NO selecciones valores simplemente porque el nombre o las palabras del producto coincidan con una fila del listado. Primero determina qué producto es y qué características físicas/funcionales tiene. Luego relaciona únicamente los atributos que tengan sentido para ese tipo de producto. IGNORA COMPLETAMENTE las filas de atributos correspondientes a otros tipos de productos, aunque compartan palabras similares. Por ejemplo, si el producto es un TONER XEROX 3210/3220, NO debes seleccionar atributos de PUNTERO LASER, aunque 'laser' aparezca en otro contexto o exista una fila con ese texto. Si el tipo de producto no requiere un determinado atributo, no selecciones ningún valor de ese atributo. Solo puedes utilizar códigos de valor que aparezcan literalmente en el listado proporcionado. Nunca inventes códigos. No selecciones más de un valor perteneciente al mismo atributo, salvo que el producto realmente pueda tener múltiples valores simultáneos para ese atributo. Devuelve únicamente JSON válido, sin explicaciones ni texto adicional. Todos los códigos seleccionados deben devolverse en un único string separados exclusivamente por |. Si no corresponde ningún atributo, devuelve un string vacío. Los atributos seleccionados deben corresponder al tipo de producto y no a productos similares, relacionados o mencionados incidentalmente

REGLAS OBLIGATORIAS:

1. Solo puedes seleccionar códigos de valor que aparezcan literalmente en el listado.

2. Antes de seleccionar un valor, determina si el ATRIBUTO corresponde realmente al tipo de producto.

3. REGLA DE UNICIDAD ABSOLUTA:
   El campo "CÓDIGO ATRIBUTO" funciona como identificador único del atributo.
   Puedes seleccionar COMO MÁXIMO UN "CÓDIGO VALOR" por cada "CÓDIGO ATRIBUTO".

   Es decir:
   - Si seleccionas un código de valor cuyo CÓDIGO ATRIBUTO es "TAM", ya NO puedes seleccionar ningún otro código cuyo CÓDIGO ATRIBUTO sea "TAM".
   - Si hay 10 valores diferentes para TAM, debes elegir 0 o 1, nunca 2 o más.
   - Esta regla se aplica aunque los valores parezcan compatibles entre sí.

4. Los valores de un mismo atributo son ALTERNATIVAS, no valores acumulables.

5. Ejemplo:
   TAM → 116
   TAM → 124
   TAM → 13P

   Solo uno puede ser seleccionado:
   116
   O 124
   O 13P

   Nunca:
   116|124
   116|13P
   124|13P

6. Si no puedes determinar con suficiente certeza qué valor corresponde, no selecciones ninguno para ese atributo.

7. NO confundas "CÓDIGO ATRIBUTO" con "CÓDIGO VALOR":
   - CÓDIGO ATRIBUTO = grupo del atributo.
   - CÓDIGO VALOR = opción específica dentro de ese atributo.

8. La selección final debe cumplir esta condición:
   NO PUEDE EXISTIR ningún CÓDIGO ATRIBUTO repetido entre los códigos seleccionados.

9. Devuelve únicamente los CÓDIGOS VALOR seleccionados, separados exclusivamente por "|".

INFORMACIÓN DEL PRODUCTO:

Nombre:
${titulo}

Categoría:
${categoria}

Grupo Super Rubro:
${grupo_sr}

Super Rubro:
${super_rubro}

Rubro:
${rubro}

LISTADO DE ATRIBUTOS:

${JSON.stringify(atributosEncontrados)}

FORMATO DE RESPUESTA:

{
    "cod_valor": "H301|HOGR|MIXT"
}
`;


            const respuesta =
                await consultarOpenRouter(
                    prompt
                );


            const contenido =
                respuesta
                    .choices?.[0]
                    ?.message?.content;


            if (!contenido) {

                throw new Error(
                    "La IA no devolvió contenido"
                );

            }


            let json;

            try {

                json =
                    JSON.parse(
                        contenido
                            .replace(/```json/gi, "")
                            .replace(/```/g, "")
                            .trim()
                    );

            } catch {

                throw new Error(
                    `Respuesta no válida: ${contenido}`
                );

            }


            const codValor =
                json.cod_valor || "";


            if (!codValor) {

                console.log(
                    "   ⚠️ No se encontraron atributos"
                );

                saltados++;

                continue;

            }


            console.log(
                `   🔧 Atributos: ${codValor}`
            );


            // Guardar en L

            await guardarAtributos(
                sheets,
                fila,
                codValor
            );


            console.log(
                "   ✅ Atributos guardados en L"
            );


            procesados++;


        } catch (error) {

            errores++;

            console.error(
                `   ❌ Error: ${error.message}`
            );

        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    CONFIG.DELAY_MS
                )
        );

    }


    console.log(
        "\n===================================="
    );

    console.log(
        "🏁 ATRIBUTOS FINALIZADOS"
    );

    console.log(
        "===================================="
    );

    console.log(
        `✅ Procesados: ${procesados}`
    );

    console.log(
        `⏭️ Saltados: ${saltados}`
    );

    console.log(
        `❌ Errores: ${errores}`
    );

}


// ============================================================
// MAIN
// ============================================================

async function mainIA() {

    console.log(
        "\n🚀 INICIANDO PROCESO"
    );


    if (!CONFIG.OPENROUTER_API_KEY) {

        throw new Error(
            "Falta OPENROUTER_API_KEY en .env"
        );

    }


    if (!CONFIG.SPREADSHEET_ID) {

        throw new Error(
            "Falta SPREADSHEET_ID en .env"
        );

    }


    // ========================================================
    // ELEGÍ ACÁ QUÉ QUERÉS EJECUTAR
    // ========================================================

    await actualizarDimensiones();

    await actualizarCategoria();

    await actualizarAtributos();

}


//  main()
//      .catch(error => {

//          console.error(
//              "\n💥 ERROR GENERAL:"
//          );

//          console.error(
//              error.message
//          );

//          process.exit(1);

//      });

export {
    mainIA
}