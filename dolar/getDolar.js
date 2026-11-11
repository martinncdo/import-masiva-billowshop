import dotenv from "dotenv";

dotenv.config({
    path: './../.env'
});

let token = null;
let refreshToken = null;
let expireIn = 0;
let refreshExpireIn = 0;

function guardarTokens(data) {
    token = data.token;
    refreshToken = data.refreshToken;
    expireIn = data.expireIn;
    refreshExpireIn = data.refreshExpireIn;
}

async function authApi() {
    const params = new URLSearchParams({
        deviceinfo: process.env.API_DEVICE_INFO,
        username: process.env.API_USER,
        password: process.env.API_PWD
    });

    const response = await fetch(
        `http://${process.env.API_IP}/v5/auth/login`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body: params.toString()
        }
    );

    if (!response.ok) {
        throw new Error(`Error autenticación: ${response.status}`);
    }

    const data = await response.json();

    guardarTokens(data);

    console.log('Autenticación exitosa');

    return token;
}

// Obtener token válido
async function obtenerToken() {
    const ahora = Math.floor(Date.now() / 1000);

    // Si el token existe y todavía no expiró
    if (token && ahora < expireIn - 60) {
        return token;
    }

    // Si expiró, por ahora volvemos a iniciar sesión
    return await authApi();
}

// Obtener cotización
async function getDolarFlexxus() {
    try {
        const tokenActual = await obtenerToken();

        const response = await fetch(
            `http://${process.env.API_IP}/v5/monedas`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenActual}`,
                    Accept: 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Error obteniendo monedas: ${response.status}`);
        }


        const json = await response.json();

        const dolar = json.data.find(
            moneda => moneda.codigomoneda === 'DOLARES'
        );

        console.log(dolar.cambio); // 1565
        return dolar.cambio;

    } catch (error) {
        console.error('Error Flexxus:', error);
        throw error;
    }
}

export { getDolarFlexxus }