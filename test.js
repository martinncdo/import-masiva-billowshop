import fs from "fs"
import dotenv from "dotenv"
import csv from "csv-parser"
dotenv.config()

const
    CONFIG =
    {
        //Google Sheets 
        KEY_FILE: "./billow-automatizaciones.json", SPREADSHEET_ID: process.env.SPREADSHEET_ID, SHEET_NAME: "Hoja 8",
        //OpenRouter 
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENROUTER_URL: "https:openrouter.ai/api/v1/chat/completions",
        MODEL: "openai/gpt-4o-mini",
        //IA
        TEMPERATURE: 0,
        MAX_TOKENS: 150,  //Seguridad 
        MIN_DIMENSION: 5,
        MIN_WEIGHT: 0.1,
        //Espera entre productos 
        DELAY_MS: 1000
    };

function leerCategorias(csvPath) {
    return new Promise((resolve, reject) => {

        const resultados = [];

        fs.createReadStream(csvPath, {
            encoding: "utf8"
        })
            .pipe(
                csv({
                    mapHeaders: ({ header }) =>
                        header
                            .replace(/^\uFEFF/, "")
                            .trim()
                })
            )
            .on("data", (fila) => {
                resultados.push(fila);
            })
            .on("end", () => {
                resolve(resultados);
            })
            .on("error", (error) => {
                reject(error);
            });

    });
}


function obtenerPalabras(texto) {
    return texto.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/[^A-Z0-9]+/).filter(Boolean)
}

function buscarCategoriasRelevantes(resultados, nombreProducto, categoriaProducto, limite, campo) {
    const palabrasCategoria = obtenerPalabras(categoriaProducto)
    const palabrasProducto = obtenerPalabras(nombreProducto)
    console.log(nombreProducto)
    console.log(categoriaProducto)
    return resultados.map(fila => {
        const nombreCategoria = fila[campo]
        const palabrasNombreCategoria = obtenerPalabras(nombreCategoria) || ''

        //Coincidencias con la categoría → más importantes 
        const coincidenciasCategoria = palabrasCategoria.filter(palabra => palabrasNombreCategoria.includes(palabra))
        //Coincidencias con el título → complemento 
        const coincidenciasProducto = palabrasProducto.filter(palabra => palabrasNombreCategoria.includes(palabra))
        const puntaje = coincidenciasCategoria.length * 3 + coincidenciasProducto.length
        return { ...fila, puntaje, coincidenciasCategoria, coincidenciasProducto }
    }).filter(fila => fila.puntaje > 0).sort((a, b) => b.puntaje - a.puntaje).slice(0, limite)
}

async function devolverCategoriasRelevantes(nombreProducto, categoria, csv, producto) {
    console.log(csv)
    const resultados = await leerCategorias(csv)
    let categoriasRelevantes = []
    if (csv === './categorias_singular.csv') {
        const catgs = buscarCategoriasRelevantes(resultados, nombreProducto, categoria, 100, 'nombre')
        categoriasRelevantes = [...categoriasRelevantes, ...catgs]
    }

    if (csv === './atributos.csv') {
        const catgs = buscarCategoriasRelevantes(resultados, producto.super_rubro, producto.super_rubro, 10, 'CATEGORIA')
        console.log(catgs.length)
        categoriasRelevantes = [...categoriasRelevantes, ...catgs]
    } return categoriasRelevantes
}

async function buscarAtributos(titulo, categoria, producto) {
    const resultados = await leerCategorias('./categorias.csv')



    const categoriaNombre = resultados.filter(el => el.Codigo == categoria)
    console.log(categoriaNombre)
    const atributos = await devolverCategoriasRelevantes(titulo, categoriaNombre[0]['Nombre'], './atributos.csv', producto)
    console.log(atributos)

    return atributos
}

let producto = {
    titulo: 'NOTEBOOK INTEL CELERON N4120/ WIN11/ HP 14-DQ0762/ 4GB/ 128GB EMMC/ 14" HD/ TECLADO INGLES/ EXT',
    categoria: '1431',
    grupo_sr: "NOTEBOOK",
    super_rubro: "NOTEBOOK DE USO COTIDIANO",
    rubro: "NOTEBOOK DE USO COTIDIANO GAMA DE ENTRADA"
}

export { devolverCategoriasRelevantes, buscarAtributos, leerCategorias }