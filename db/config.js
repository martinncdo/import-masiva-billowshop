import Firebird from "node-firebird";

var options = {};

options.host = '192.168.1.8';
options.port = 3050;
options.database = 'C:/FLEXXUS/DB/DB-ANYWAY.GDB';
options.user = 'LECTURASQL';
options.password = 'anyway2025';
options.lowercase_keys = false; // set to true to lowercase keys
options.role = null; // default
options.pageSize = 4096; // default when creating database
options.retryConnectionInterval = 1000; // reconnect interval in case of connection drop
options.blobAsText = false; // set to true to get blob as text, only affects blob subtype 1
options.encoding = 'UTF8'; // default encoding for connection is UTF-8
options.wireCompression = false; // set to true to enable firebird compression on the wire (works only on FB >= 3 and compression is enabled on server (WireCompression = true in firebird.conf))
options.wireCrypt = Firebird.WIRE_CRYPT_ENABLE; // default; set to Firebird.WIRE_CRYPT_DISABLE to disable wire encryption (FB >= 3)
options.pluginName = undefined; // optional, auto-negotiated; can be set to Firebird.AUTH_PLUGIN_SRP256, Firebird.AUTH_PLUGIN_SRP, or Firebird.AUTH_PLUGIN_LEGACY
options.dbCryptConfig = undefined; // optional; database encryption key for encrypted databases. Use 'base64:<value>' for base64-encoded keys or plain text
options.connectTimeout = 10000; // optional; timeout in ms for a single pool.get() attach operation (default: no timeout)

const pool = Firebird.pool(5, options);

function tomarPool(query) {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) return reject(err);

            db.query(query, (err, result) => {
                db.detach();

                if (err) return reject(err);

                resolve(result);
            });
        });
    });
}

export { tomarPool };

