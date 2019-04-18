"use strict";

//var tempo = 120;
//var interval = 1000.0 * 60.0 / (tempo * 4.0);
var http = require("http");
var fs = require("fs");

// Chargement du fichier index.html affiché au client
var server = http.createServer(function(req, res) {
    fs.readFile("./index.html", "utf-8", function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});

// Chargement de socket.io
var io = require("socket.io").listen(server);
var players = [];

function Player(id) {
    this.id = id;
}

io.on("connection", function(socket) {
    let player = new Player(socket.id);
    players.push(player);

    console.log("Player " + player.id + " connected");
    console.log(players);

    socket.broadcast.emit("dumpRequest", player.id);

    socket.on("dumpOutInitial", function(data) {
        // server recieves an initial dump from a new player and retransmits it to old players
        socket.broadcast.emit("dumpInInitial", data);

        console.log("Recieved initial dump from player " + data[0]);
        console.log(players);
    });

    socket.on("dumpOutRequested", function([data, target]) {
        io.to(target).emit("dumpInRequested", data);

        console.log("Recieved requested dump from " + data[0] + " with target " + target);
    })

    socket.on("setPhraseRequest", function(target, phrase) {
        socket.broadcast.emit("setPhraseRequest", target, phrase);

        console.log("Recieved set phrase request for " + target + " with phrase " + phrase);
    });

    socket.on("nextPhraseRequest", function(target) {
        socket.broadcast.emit("nextPhraseRequest", target);

        console.log("Recieved next phrase request for " + target);
    });

    socket.on("prevPhraseRequest", function(target) {
        socket.broadcast.emit("prevPhraseRequest", target);

        console.log("Recieved prev phrase request for " + target);
    });

    socket.on("restartPhraseRequest", function(target) {
        socket.broadcast.emit("restartPhraseRequest", target);

        console.log("Recieved restart phrase request for " + target);
    });

    socket.on("octaveUpRequest", function(target) {
        socket.broadcast.emit("octaveUpRequest", target);

        console.log("Recieved octave up request for " + target);
    });

    socket.on("octaveDownRequest", function(target) {
        socket.broadcast.emit("octaveDownRequest", target);

        console.log("Recieved octave down request for " + target);
    });

    socket.on("disconnect", function() {
        players.splice(players.indexOf(player), 1);
        io.emit("remove", player.id);

        console.log("Player " + player.id + " disconnected");
        console.log(players);
    });
});

function timeout() {
    setTimeout(function () {
        timeout();
        io.emit("tick");
    }, 125);
}

timeout();

server.listen(8080);

console.log("Server started successfully");
