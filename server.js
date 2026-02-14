const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the specified directories
app.use('/assets', express.static('assets'));
app.use('/engine', express.static('engine'));
app.use('/support', express.static('support'));
app.use('/fonts', express.static('fonts'));
app.use('/textures', express.static('textures'));
app.use('/js', express.static('js'));

// Entry Point
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// The Actual Game
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));
app.get('/game.html', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
