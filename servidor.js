const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PUERTO = process.env.PORT || 3000;
const permitidos = [
    "rainster.html", "juego.js", "manifest.webmanifest",
    "sw.js", "icono.rainster.png", "icono.rainster2.png",
    "assetlinks.json"
];
const tipos = {
    ".html": "text/html; charset=utf-8",
   ".js": "text/javascript; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".jpeg": "image/jpeg",
    ".json": "application/json"
};

// Muestra la página del juego
const servidor = http.createServer(function (req, res) {
    let pedido = req.url.split("?")[0];
    if (pedido === "/") pedido = "/rainster.html";

    const nombre = path.basename(pedido);
    if (!permitidos.includes(nombre)) {
        res.writeHead(404);
        res.end("No encontrado");
        return;
    }

    fs.readFile(path.join(__dirname, nombre), function (error, contenido) {
        if (error) {
            res.writeHead(404);
            res.end("No encontrado");
            return;
        }
        res.writeHead(200, { "Content-Type": tipos[path.extname(nombre)] });
        res.end(contenido);
    });
});

// Conecta a los jugadores
const wss = new WebSocket.Server({ server: servidor });
const jugadores = {};
let siguienteId = 1;

wss.on("connection", function (socket) {
    const id = siguienteId++;
    jugadores[id] = { x: 0, z: 9, yaw: 0, y: 0, c: id % 6 };
    socket.send(JSON.stringify({ tipo: "hola", id: id }));

    socket.on("message", function (mensaje) {
        try {
            const datos = JSON.parse(mensaje);
            if (typeof datos.x === "number" &&
                typeof datos.z === "number" &&
                typeof datos.yaw === "number") {
                jugadores[id] = {
                    x: datos.x,
                    z: datos.z,
                    yaw: datos.yaw,
                    y: typeof datos.y === "number" ? datos.y : 0,
                    c: jugadores[id].c
                };
            }
        } catch (e) {}
    });

    socket.on("close", function () {
        delete jugadores[id];
    });
});

// Cada 50 milisegundos le avisa a todos dónde está cada jugador
setInterval(function () {
    const mensaje = JSON.stringify({ tipo: "jugadores", jugadores: jugadores });
    for (const cliente of wss.clients) {
        if (cliente.readyState === WebSocket.OPEN) {
            cliente.send(mensaje);
        }
    }
}, 50);

servidor.listen(PUERTO, function () {
    console.log("Servidor listo en http://localhost:" + PUERTO);
});