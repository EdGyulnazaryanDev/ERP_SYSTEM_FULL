"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var server = http.createServer(function (req, res) { return res.end('test'); });
server.listen(3000, function () { return console.log('Listening on 3000'); });
