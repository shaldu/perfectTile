const Express = require("express");
const ejs = require("ejs");
const path = require("path");
const THREE = require("three");
const app = Express();
const server = require('http').createServer(app);
const escape = require('escape-html');

console.log("running on: http://localhost:3000");
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
    },
});
const port = 3000;

//Template Engine
app.set('view engine', 'ejs');

//middleware && static files
app.use(Express.static(__dirname + '/public'));
app.use(Express.static(__dirname + '/node_modules/three'));
app.use(Express.static(__dirname + '/node_modules/prng'));

//socket IO
function socketEvents() {

    io.once('connection', client => {

    });
}

//Home
app.get('/', (req, res, next) => {
    socketEvents()
    res.render('index');
});

//Error page
app.use((req, res) => {
    const data = {

    }
    res.status(404).render('error', data);
});


server.listen(port);