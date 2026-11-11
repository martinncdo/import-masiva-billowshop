import fs from "fs"
import csv from "csv-parser"

function leerCsvProductos(csvPath) {
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
                console.log(error)
                reject(error);
            });

    });
}

export { leerCsvProductos }
