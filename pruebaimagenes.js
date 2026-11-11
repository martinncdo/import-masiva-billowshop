import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();


// =====================================================
// CONFIGURACIÓN
// =====================================================

const CONFIG = {

    // -----------------------------
    // GOOGLE SHEETS
    // -----------------------------

    KEY_FILE:
        "./billow-automatizaciones.json",

    SPREADSHEET_ID:
        process.env.SPREADSHEET_ID,

    SHEET_NAME:
        process.env.SHEET_NAME,


    // -----------------------------
    // OPENROUTER
    // -----------------------------

    OPENROUTER_URL:
        "https://openrouter.ai/api/v1/chat/completions",

    MODEL:
        "openai/gpt-4o-mini",

    MAX_TOKENS:
        300,


    // -----------------------------
    // BÚSQUEDA
    // -----------------------------

    MAX_INTENTOS:
        3,

    MAX_RESULTADOS_BUSQUEDA:
        5,

    DELAY_MS:
        1500,


    // -----------------------------
    // PRUEBA
    // -----------------------------

    SOLO_PRIMER_PRODUCTO:
        false

};


// =====================================================
// GOOGLE SHEETS
// =====================================================

const auth =
    new google.auth.GoogleAuth({

        keyFile:
            CONFIG.KEY_FILE,

        scopes: [
            "https://www.googleapis.com/auth/spreadsheets"
        ]

    });


const sheets =
    google.sheets({

        version: "v4",

        auth

    });


// =====================================================
// DELAY
// =====================================================

function esperar(ms) {

    return new Promise(
        resolve =>
            setTimeout(resolve, ms)
    );

}


// =====================================================
// LIMPIAR JSON DE OPENROUTER
// =====================================================

function limpiarJSON(contenido) {

    if (!contenido) {

        throw new Error(
            "OpenRouter no devolvió contenido"
        );

    }

    let texto =
        contenido.trim();


    // ```json
    texto =
        texto.replace(
            /^```json\s*/i,
            ""
        );


    // ```
    texto =
        texto.replace(
            /```$/i,
            ""
        );


    texto =
        texto.trim();


    try {

        return JSON.parse(texto);

    }
    catch (error) {

        console.error(
            "\n❌ JSON inválido recibido:"
        );

        console.error(texto);

        throw error;

    }

}


// =====================================================
// NORMALIZAR URL
// =====================================================

function normalizarURL(url) {

    if (!url)
        return "";

    try {

        const parsed =
            new URL(url);

        parsed.hash = "";

        return parsed.href
            .replace(/\/$/, "");

    }
    catch {

        return url
            .trim()
            .replace(/\/$/, "");

    }

}


// =====================================================
// BUSCAR PRODUCTO CON OPENROUTER
// =====================================================

async function buscarProducto(
    producto,
    intento,
    urlsExcluidas
) {

    console.log(
        `\n🔎 Intento ${intento}/${CONFIG.MAX_INTENTOS}`
    );


    let estrategia;


    if (intento === 1) {

        estrategia = `

Busca primero una coincidencia EXACTA.

Prioridad de búsqueda:

1. EAN / GTIN si está disponible.
2. Marca + modelo.
3. Nombre completo del producto.

Prioriza:

- sitio oficial
- distribuidor oficial
- tienda reconocida

NO aceptes productos similares.

`;

    }
    else if (intento === 2) {

        estrategia = `

Realiza una búsqueda alternativa.

Busca combinaciones de:

- EAN
- código
- marca + modelo
- modelo exacto
- título exacto

El producto puede aparecer con pequeñas
diferencias de escritura.

NO confundas modelos similares.

`;

    }
    else {

        estrategia = `

Último intento.

Busca específicamente:

marca + modelo exacto

y también:

modelo exacto + producto

Revisa tiendas y distribuidores.

El producto debe corresponder realmente
al modelo indicado.

NO inventes URLs.

`;

    }


    // =================================================
    // URLS YA UTILIZADAS
    // =================================================

    let exclusiones = "";

    if (urlsExcluidas.size > 0) {

        exclusiones = `

MUY IMPORTANTE:

Estas páginas YA FUERON PROBADAS y NO debes
volver a devolverlas:

${[...urlsExcluidas]
                .map(url => `- ${url}`)
                .join("\n")}

Busca OTRA página diferente.

`;

    }


    const prompt = `

Necesito encontrar una página web REAL
del producto indicado.

PRODUCTO
----------------------

EAN / GTIN:
${producto.ean || "NO DISPONIBLE"}

Código:
${producto.codigo || "NO DISPONIBLE"}

Título:
${producto.titulo}

Marca:
${producto.marca || "NO DISPONIBLE"}

Descripción:
${producto.descripcion || "NO DISPONIBLE"}

----------------------

${estrategia}

${exclusiones}

Si encuentras una página correspondiente
al producto EXACTO devuelve:

{
    "producto_encontrado": true,
    "url_producto": "https://...",
    "nombre_encontrado": "...",
    "fuente": "..."
}

Si no encuentras una página confiable:

{
    "producto_encontrado": false,
    "url_producto": null,
    "nombre_encontrado": null,
    "fuente": null
}

REGLAS OBLIGATORIAS:

- NO inventes URLs.
- NO devuelvas URLs de búsqueda.
- NO devuelvas URLs de categorías.
- NO devuelvas URLs de productos similares.
- NO devuelvas una URL que esté en la lista de páginas excluidas.
- La URL debe corresponder al producto.
- Devuelve únicamente JSON válido.

`;


    const payload = {

        model:
            CONFIG.MODEL,

        messages: [

            {
                role:
                    "user",

                content:
                    prompt

            }

        ],

        tools: [

            {
                type:
                    "openrouter:web_search",

                parameters: {

                    max_results:
                        CONFIG.MAX_RESULTADOS_BUSQUEDA

                }

            }

        ],

        temperature:
            0,

        max_tokens:
            CONFIG.MAX_TOKENS

    };


    const response =
        await fetch(
            CONFIG.OPENROUTER_URL,
            {

                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        "http://localhost",

                    "X-Title":
                        "Automatización imágenes productos"

                },

                body:
                    JSON.stringify(payload)

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(

            `OpenRouter ${response.status}: ` +
            JSON.stringify(
                data,
                null,
                2
            )

        );

    }


    const contenido =
        data
            .choices?.[0]
            ?.message
            ?.content;


    console.log(
        "\n🤖 RESPUESTA OPENROUTER:"
    );

    console.log(
        contenido
    );


    return limpiarJSON(
        contenido
    );

}


// =====================================================
// EXTRAER TODAS LAS POSIBLES IMÁGENES
// =====================================================

function extraerCandidatasImagenes(
    html,
    urlPagina
) {

    const candidatas =
        new Set();


    function agregar(url) {

        if (!url)
            return;

        url =
            url
                .trim()
                .replace(/^["']|["']$/g, "");


        if (!url)
            return;


        // Ignorar imágenes base64
        if (
            url.startsWith("data:")
        )
            return;


        try {

            const absoluta =
                new URL(
                    url,
                    urlPagina
                ).href;


            candidatas.add(
                absoluta
            );

        }
        catch {

            // URL inválida

        }

    }


    // =================================================
    // 1. OG IMAGE
    // =================================================

    const ogMatches =
        html.matchAll(
            /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi
        );


    for (const match of ogMatches) {

        agregar(match[1]);

    }


    // =================================================
    // 2. OG IMAGE ATRIBUTOS INVERTIDOS
    // =================================================

    const ogMatches2 =
        html.matchAll(
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi
        );


    for (const match of ogMatches2) {

        agregar(match[1]);

    }


    // =================================================
    // 3. TWITTER IMAGE
    // =================================================

    const twitterMatches =
        html.matchAll(
            /<meta[^>]+(?:name|property)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi
        );


    for (const match of twitterMatches) {

        agregar(match[1]);

    }


    // =================================================
    // 4. LINK rel=image_src
    // =================================================

    const imageSrcMatches =
        html.matchAll(
            /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi
        );


    for (const match of imageSrcMatches) {

        agregar(match[1]);

    }


    // =================================================
    // 5. IMG SRC
    // =================================================

    const imgMatches =
        html.matchAll(
            /<img[^>]+src=["']([^"']+)["']/gi
        );


    for (const match of imgMatches) {

        agregar(match[1]);

    }


    // =================================================
    // 6. IMG DATA-SRC
    // =================================================

    const dataSrcMatches =
        html.matchAll(
            /<img[^>]+data-(?:src|lazy-src|original)=["']([^"']+)["']/gi
        );


    for (const match of dataSrcMatches) {

        agregar(match[1]);

    }


    // =================================================
    // 7. DATA-ORIGINAL
    // =================================================

    const originalMatches =
        html.matchAll(
            /<[^>]+data-original=["']([^"']+)["']/gi
        );


    for (const match of originalMatches) {

        agregar(match[1]);

    }


    // =================================================
    // 8. SRCSET
    // =================================================

    const srcsetMatches =
        html.matchAll(
            /(?:srcset|data-srcset)=["']([^"']+)["']/gi
        );


    for (const match of srcsetMatches) {

        const valores =
            match[1]
                .split(",");


        for (const valor of valores) {

            const partes =
                valor.trim().split(/\s+/);

            agregar(
                partes[0]
            );

        }

    }


    // =================================================
    // 9. JSON-LD
    // =================================================

    const scripts =
        html.match(
            /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        );


    if (scripts) {

        for (const script of scripts) {

            try {

                const contenido =
                    script
                        .replace(
                            /<script[^>]*>|<\/script>/gi,
                            ""
                        )
                        .trim();


                const json =
                    JSON.parse(
                        contenido
                    );


                extraerImagenesJSONLD(
                    json,
                    agregar
                );

            }
            catch {

                // JSON-LD inválido

            }

        }

    }


    // =================================================
    // 10. BUSCAR URLS DE IMÁGENES DIRECTAMENTE
    // =================================================

    const urlsImagen =
        html.match(
            /https?:\/\/[^"'<>\\\s]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'<>\\\s]*)?/gi
        );


    if (urlsImagen) {

        for (const imagen of urlsImagen) {

            agregar(imagen);

        }

    }


    return [
        ...candidatas
    ];

}


// =====================================================
// EXTRAER IMÁGENES JSON-LD
// =====================================================

function extraerImagenesJSONLD(
    data,
    agregar
) {

    if (!data)
        return;


    if (
        typeof data !==
        "object"
    )
        return;


    if (data.image) {

        if (
            typeof data.image ===
            "string"
        ) {

            agregar(
                data.image
            );

        }


        if (
            Array.isArray(
                data.image
            )
        ) {

            for (
                const imagen
                of data.image
            ) {

                if (
                    typeof imagen ===
                    "string"
                ) {

                    agregar(imagen);

                }
                else if (
                    imagen &&
                    typeof imagen ===
                    "object"
                ) {

                    agregar(
                        imagen.url
                    );

                    agregar(
                        imagen.contentUrl
                    );

                }

            }

        }


        if (
            typeof data.image ===
            "object"
        ) {

            agregar(
                data.image.url
            );

            agregar(
                data.image.contentUrl
            );

        }

    }


    if (
        Array.isArray(data)
    ) {

        for (
            const item
            of data
        ) {

            extraerImagenesJSONLD(
                item,
                agregar
            );

        }

        return;

    }


    for (
        const key
        of Object.keys(data)
    ) {

        extraerImagenesJSONLD(
            data[key],
            agregar
        );

    }

}


// =====================================================
// OBTENER IMAGEN DE UNA PÁGINA
// =====================================================

async function obtenerImagen(
    url
) {

    console.log(
        "\n🌐 Visitando:"
    );

    console.log(
        url
    );


    const response =
        await fetch(
            url,
            {

                headers: {

                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",

                    "Accept":
                        "text/html,application/xhtml+xml,text/html"

                }

            }
        );


    if (!response.ok) {

        throw new Error(
            `Página respondió ${response.status}`
        );

    }


    const html =
        await response.text();


    console.log(
        `📄 HTML recibido: ${html.length} caracteres`
    );


    const candidatas =
        extraerCandidatasImagenes(
            html,
            url
        );


    console.log(
        `🖼️ Candidatas encontradas: ${candidatas.length}`
    );


    // Mostrar algunas para debugging
    candidatas
        .slice(0, 10)
        .forEach(
            (imagen, index) => {

                console.log(
                    `   ${index + 1}. ${imagen}`
                );

            }
        );


    // =================================================
    // VALIDAR CANDIDATAS
    // =================================================

    for (
        const imagen
        of candidatas
    ) {

        const valida =
            await verificarImagen(
                imagen
            );


        if (valida) {

            console.log(
                "\n✅ Imagen válida encontrada:"
            );

            console.log(
                imagen
            );


            return imagen;

        }

    }


    return null;

}


// =====================================================
// VERIFICAR IMAGEN
// =====================================================

async function verificarImagen(
    imageUrl
) {

    try {

        // ------------------------------------------------
        // Primero HEAD
        // ------------------------------------------------

        let response =
            await fetch(
                imageUrl,
                {

                    method:
                        "HEAD",

                    headers: {

                        "User-Agent":
                            "Mozilla/5.0"

                    }

                }
            );


        let contentType =
            response.headers.get(
                "content-type"
            );


        if (
            response.ok &&
            contentType &&
            contentType
                .toLowerCase()
                .startsWith("image/")
        ) {

            return true;

        }


        // ------------------------------------------------
        // Algunos servidores no soportan HEAD.
        // Intentamos GET.
        // ------------------------------------------------

        response =
            await fetch(
                imageUrl,
                {

                    method:
                        "GET",

                    headers: {

                        "User-Agent":
                            "Mozilla/5.0",

                        "Range":
                            "bytes=0-1000"

                    }

                }
            );


        contentType =
            response.headers.get(
                "content-type"
            );


        if (
            response.ok &&
            contentType &&
            contentType
                .toLowerCase()
                .startsWith("image/")
        ) {

            return true;

        }


        return false;

    }
    catch {

        return false;

    }

}


// =====================================================
// PROCESAR PRODUCTO
// =====================================================

async function procesarProducto(
    producto
) {

    console.log(
        "\n========================================"
    );

    console.log(
        `📦 ${producto.codigo}`
    );

    console.log(
        producto.titulo
    );

    console.log(
        "========================================"
    );


    // =================================================
    // HISTORIAL DE PÁGINAS YA VISITADAS
    // =================================================

    const urlsVisitadas =
        new Set();


    for (
        let intento = 1;
        intento <= CONFIG.MAX_INTENTOS;
        intento++
    ) {

        try {

            // -----------------------------------------
            // BUSCAR PRODUCTO
            // -----------------------------------------

            const resultado =
                await buscarProducto(
                    producto,
                    intento,
                    urlsVisitadas
                );


            if (
                !resultado.producto_encontrado ||
                !resultado.url_producto
            ) {

                console.log(
                    "❌ No se encontró producto."
                );

                if (
                    intento <
                    CONFIG.MAX_INTENTOS
                ) {

                    await esperar(
                        CONFIG.DELAY_MS
                    );

                    continue;

                }

                return null;

            }


            const urlProducto =
                normalizarURL(
                    resultado.url_producto
                );


            // =================================================
            // EVITAR REPETIR LA MISMA PÁGINA
            // =================================================

            if (
                urlsVisitadas.has(
                    urlProducto
                )
            ) {

                console.log(
                    "⚠️ OpenRouter devolvió nuevamente una página ya visitada:"
                );

                console.log(
                    urlProducto
                );


                if (
                    intento <
                    CONFIG.MAX_INTENTOS
                ) {

                    await esperar(
                        CONFIG.DELAY_MS
                    );

                    continue;

                }

                return null;

            }


            // Guardamos inmediatamente
            urlsVisitadas.add(
                urlProducto
            );


            console.log(
                "\n✅ Nueva página encontrada:"
            );

            console.log(
                urlProducto
            );


            // -----------------------------------------
            // BUSCAR IMAGEN
            // -----------------------------------------

            const imagen =
                await obtenerImagen(
                    urlProducto
                );


            if (!imagen) {

                console.log(
                    "\n⚠️ Esta página no contiene una imagen utilizable."
                );

                console.log(
                    "➡️ Se descartará esta página y se buscará otra."
                );


                if (
                    intento <
                    CONFIG.MAX_INTENTOS
                ) {

                    await esperar(
                        CONFIG.DELAY_MS
                    );

                    continue;

                }

                return null;

            }


            // -----------------------------------------
            // ÉXITO
            // -----------------------------------------

            console.log(
                "\n🎉 IMAGEN ENCONTRADA"
            );

            console.log(
                imagen
            );


            return imagen;

        }
        catch (error) {

            console.error(
                `❌ Error en intento ${intento}:`
            );

            console.error(
                error.message
            );


            if (
                intento <
                CONFIG.MAX_INTENTOS
            ) {

                console.log(
                    "🔄 Reintentando..."
                );

                await esperar(
                    CONFIG.DELAY_MS
                );

            }

        }

    }


    return null;

}


// =====================================================
// LEER GOOGLE SHEETS
// =====================================================

async function leerProductos() {

    console.log(
        "\n📊 Leyendo Google Sheets..."
    );


    const response =
        await sheets
            .spreadsheets
            .values
            .get({

                spreadsheetId:
                    CONFIG.SPREADSHEET_ID,

                range:
                    `${CONFIG.SHEET_NAME}!A:Z`

            });


    const filas =
        response.data.values || [];


    if (
        filas.length === 0
    ) {

        throw new Error(
            "La hoja está vacía."
        );

    }


    return filas;

}


// =====================================================
// BUSCAR COLUMNA POR NOMBRE
// =====================================================

function obtenerIndiceColumna(
    encabezados,
    nombre
) {

    return encabezados.findIndex(
        encabezado =>
            String(encabezado)
                .trim()
                .toLowerCase() ===
            nombre
                .trim()
                .toLowerCase()
    );

}


// =====================================================
// ACTUALIZAR COLUMNA K
// =====================================================

async function actualizarURL(
    fila,
    url
) {

    console.log(
        `\n📝 Escribiendo URL en K${fila}...`
    );


    await sheets
        .spreadsheets
        .values
        .update({

            spreadsheetId:
                CONFIG.SPREADSHEET_ID,

            range:
                `${CONFIG.SHEET_NAME}!k${fila}`,

            valueInputOption:
                "USER_ENTERED",

            requestBody: {

                values: [
                    [url]
                ]

            }

        });


    console.log(
        "✅ URL guardada en Google Sheets."
    );

}


// =====================================================
// MAIN
// =====================================================

async function mainImages() {

    console.log(
        "\n🚀 AUTOMATIZACIÓN DE IMÁGENES"
    );


    const filas =
        await leerProductos();


    const encabezados =
        filas[0];


    console.log(
        "\n📋 Encabezados encontrados:"
    );

    console.log(
        encabezados
    );


    // =================================================
    // DETECTAR COLUMNAS
    // =================================================

    const indiceCodigo =
        obtenerIndiceColumna(
            encabezados,
            "codigo"
        );


    const indiceTitulo =
        obtenerIndiceColumna(
            encabezados,
            "titulo"
        );


    const indiceDescripcion =
        obtenerIndiceColumna(
            encabezados,
            "descripcion"
        );


    const indiceMarca =
        obtenerIndiceColumna(
            encabezados,
            "marca"
        );


    const indiceEAN =
        obtenerIndiceColumna(
            encabezados,
            "ean"
        );


    console.log(
        "\n🔍 Índices detectados:"
    );

    console.log({
        codigo: indiceCodigo,
        titulo: indiceTitulo,
        descripcion: indiceDescripcion,
        marca: indiceMarca,
        ean: indiceEAN
    });


    if (
        indiceCodigo === -1 ||
        indiceTitulo === -1
    ) {

        throw new Error(
            "No se encontraron las columnas codigo y/o titulo."
        );

    }


    // =================================================
    // PRODUCTOS
    // =================================================

    let procesados = 0;


    for (
        let i = 1;
        i < filas.length;
        i++
    ) {

        const fila =
            filas[i];


        const codigo =
            fila[indiceCodigo];


        const titulo =
            fila[indiceTitulo];


        const descripcion =
            indiceDescripcion !== -1
                ? fila[indiceDescripcion]
                : "";


        const marca =
            indiceMarca !== -1
                ? fila[indiceMarca]
                : "";


        const EAN =
            indiceEAN !== -1
                ? fila[indiceEAN]
                : "";


        // =================================================
        // COLUMNA K
        // =================================================

        const urlExistente =
            fila[10];


        // =================================================
        // FILA VACÍA
        // =================================================

        if (
            !codigo ||
            !titulo
        ) {

            continue;

        }


        // =================================================
        // YA TIENE IMAGEN
        // =================================================

        if (
            urlExistente &&
            String(urlExistente).trim() !== ""
        ) {

            console.log(
                `⏭️ ${codigo} ya tiene URL en K.`
            );

            continue;

        }


        const producto = {

            codigo:
                String(codigo),

            titulo:
                String(titulo),

            descripcion:
                descripcion
                    ? String(descripcion)
                    : "",

            marca:
                marca
                    ? String(marca)
                    : "",

            ean:
                EAN
                    ? String(EAN)
                    : ""

        };


        // =================================================
        // PROCESAR
        // =================================================

        const imagenURL =
            await procesarProducto(
                producto
            );


        // =================================================
        // GUARDAR URL EN K
        // =================================================

        if (imagenURL) {

            await actualizarURL(
                i + 1,
                imagenURL
            );


            procesados++;

        }
        else {

            console.log(
                `\n⚠️ ${codigo}: no se pudo obtener imagen.`
            );

        }


        // =================================================
        // SOLO PRIMER PRODUCTO
        // =================================================

        if (
            CONFIG.SOLO_PRIMER_PRODUCTO
        ) {

            console.log(
                "\n🛑 Modo prueba: finalizando."
            );

            break;

        }


        // =================================================
        // DELAY ENTRE PRODUCTOS
        // =================================================

        await esperar(
            CONFIG.DELAY_MS
        );

    }


    console.log(
        "\n========================================"
    );

    console.log(
        "🏁 PROCESO TERMINADO"
    );

    console.log(
        `Productos con imagen: ${procesados}`
    );

    console.log(
        "========================================"
    );

}


// main()
//     .catch(error => {

//         console.error(
//             "\n❌ ERROR GENERAL:"
//         );

//         console.error(
//             error.message
//         );

//     });

    export { mainImages }