const express = require('express');
const app = express();
const port = 3000;

// Serve static files from the specified directories
app.use('/assets', express.static('assets'));
app.use('/engine', express.static('engine'));
app.use('/support', express.static('support'));
app.use('/fonts', express.static('fonts'));
app.use('/textures', express.static('textures'));

// Serve specific files
app.use('/game', express.static('index.html'));
app.use('/start', express.static('start.html'));
app.use('/js', express.static('js'));

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

