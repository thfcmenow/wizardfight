

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: 'white',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};



// Grid settings
const gridWidth = 18;
const gridHeight = 12;
const tileSize = 90; // grid left to right
const cursorScale = 1.4; // size of cursor
const cursorOpacity = 0.5; // cursor opacity
const characterSize = tileSize - 25;
const characterX =  25
const characterY = 25;
const spriteScale = 0.7; // wizard size

let bx = 0;
let by = 0;
let isSelected = false;
const FONT_NAME = 'minecraft';
let keymonitor = false;
let lastx = 0;
let lasty = 0;
let lastMenu = "root";
let spellsMode = false;
let movementMode = false;
let selectedPiece = null;
let currentPlayer = 1;
let turnNumber = 1;
let gameScene = null;
let turnDialogActive = false;
let currentMenuHandler = null;

const menus = {
    "player": {
        "root": ["Cast Spell", "Move Character", "Examine Character"],
        "spells": ["Magic Bolt"],
        "bio": ["info", "Age: 125", "Height: 5'6", "Weight: 150 lbs", "Hometown: Fiorveena"]
    }
}

function isCurrentPlayerPiece(cat) {
    return cat === `player${currentPlayer}`;
}

function endTurn() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    turnNumber++;
    console.log(`Turn ${turnNumber} - Player ${currentPlayer}'s turn`);
    showTurnDialog();
}

function showTurnDialog() {
    if (!gameScene || turnDialogActive) return;

    turnDialogActive = true;

    const screenWidth = gameScene.sys.game.canvas.width;
    const screenHeight = gameScene.sys.game.canvas.height;
    const dialogWidth = 300;
    const dialogHeight = 100;
    const x = (screenWidth - dialogWidth) / 2;
    const y = (screenHeight - dialogHeight) / 2;

    // Create dialog background
    let graphics = gameScene.add.graphics();
    graphics.setDepth(10);
    graphics.fillStyle(0x000000, 0.9);
    graphics.fillRect(x, y, dialogWidth, dialogHeight);
    graphics.lineStyle(3, 0xffffff, 1);
    graphics.strokeRect(x, y, dialogWidth, dialogHeight);

    // Create dialog text
    const message = `Player ${currentPlayer}'s Turn`;
    let text = gameScene.add.text(screenWidth / 2, screenHeight / 2, message, {
        fill: '#ffffff',
        fontSize: 28,
        fontFamily: '"minecraft"'
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(11);

    // Auto-dismiss after 1.5 seconds
    gameScene.time.delayedCall(1500, () => {
        graphics.destroy();
        text.destroy();
        moveCursorToCurrentPlayer();
        turnDialogActive = false;
    });
}

function moveCursorToCurrentPlayer() {
    if (!gameScene || !gameScene.gameBoard) return;

    const playerCat = `player${currentPlayer}`;
    const playerPiece = gameScene.gameBoard.pieces.find(p => p.cat === playerCat);

    if (playerPiece) {
        // Update cursor position in pieces array
        const cursorData = gameScene.gameBoard.pieces.find(p => p.piece === "cursor");
        if (cursorData) {
            cursorData.x = playerPiece.x;
            cursorData.y = playerPiece.y;
        }

        // Update visual cursor position
        gameScene.cursor.x = playerPiece.x * tileSize + (tileSize / 2);
        gameScene.cursor.y = playerPiece.y * tileSize + (tileSize / 2);
    }
}

function properCase(str) {
    return str.replace(
      /\w\S*/g,
      text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
  }


function renderMenu(destroy, first, second, cat, scene, x, y, toggle) {
    
    // Initialize a container to hold multiple menu instances
    if (!this.menus) this.menus = [];

    // If a destroy flag is set, destroy the last menu if it exists
    if (destroy && this.menus.length) {
        const lastMenu = this.menus.pop();
        lastMenu.graphics.destroy();
        lastMenu.text.destroy();
        x = lastx;
        y = lasty;
        return { x, y };
    }

    // Create and display a new menu
    const menuWidth = 250;
    const menuHeight = 200;
    const screenWidth = scene.sys.game.canvas.width;
    const screenHeight = scene.sys.game.canvas.height;

    // Adjust position if menu would go off-screen
    if (x + menuWidth > screenWidth) {
        x = x - menuWidth - tileSize; // Move to left of cursor
    }
    if (y + menuHeight > screenHeight) {
        y = y - menuHeight; // Move above cursor
    }

    let graphics = scene.add.graphics();
    graphics.setDepth(6);
    graphics.fillStyle(0x000000, 0.8); // Dark gray with 80% opacity
    graphics.fillRect(x, y, menuWidth, menuHeight);
    graphics.lineStyle(2, 0xffffff, 1); // White border
    graphics.strokeRect(x, y, menuWidth, menuHeight);

    graphics.setVisible(true)
    lastMenu = cat;
    const thisMenu = menus[first][second].map((menu, index) => index + 1 + ": " + menu + "\n");
    let menuText = properCase(cat) + "\n" + thisMenu.join("") + "\nSpace: Cancel";
    let characterMenu = scene.add.text(x + 10, y + 10, menuText, { fill: '#ffffff', fontSize: 20, fontFamily: '"minecraft"' });
    characterMenu.setDepth(8);

    characterMenu.setVisible(true)
    this.menus.push({ graphics, text: characterMenu }); 

    lastx = x
    lasty = y
    return cat
}

function targetMode(action,keyselect) {
    console.log("target mode---------")
    // gamemusic.stop();
    // actionmusic.play();
    if (action === "Cast Spell") {
        console.log("casting spell")
    }
}

function handleMenuKeydown(event,menu,scene) {

   

    if (event && event.key === "1" && keymonitor) {
        if (menu[parseInt(event.key) - 1]) {
            let pos = renderMenu(true);
            let nextAction = renderMenu(false, "player", "spells", "spells", scene, pos.x, pos.y); 
           
            if (lastMenu === "spells" && spellsMode){
                renderMenu(true)
                spellsMode = false
                targetMode(nextAction,menu[parseInt(event.key) - 1])  
              } 

            if (lastMenu === "spells" && !spellsMode){
                spellsMode = true
              } 

              
               
        }
    }

    if (event && event.key === "2" && keymonitor) {
        if (menu[parseInt(event.key)-1]) {
            renderMenu(true);
            // Enter movement mode
            movementMode = true;
            selectedPiece = scene.gameBoard.getSelectedPiece();
            isSelected = false;
            keymonitor = false;
            scene.cursorBlinkEvent.paused = false;
            console.log("Movement mode activated for:", selectedPiece);
        }
    }

    if (event && event.key === "3" && keymonitor) {
        if (menu[parseInt(event.key)-1]) {
            let pos = renderMenu(true);
            renderMenu(false, "player", "bio", "bio", scene, pos.x, pos.y);  
        }
    }
}



function preload() {
    this.load.image('tile', './assets/tile.png');
    this.load.spritesheet('white_wizard', './assets/white_wizard_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('cartoon_wizard', './assets/cartoon_wizard_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.image('cursor', './assets/cursor2.png');
    this.load.audio("menuclick", ["./assets/menuclick.mp3"]);
    this.load.audio("error", ["./assets/error.mp3"]);
    this.load.audio("gamemusic", ["./assets/prism.mp3"]);
    this.load.audio("actionmusic", ["./assets/action.mp3"]); 
}

function create() {
    gameScene = this;

    menuclick = this.sound.add("menuclick", { loop: false });
    error = this.sound.add("error", { loop: false });
    gamemusic = this.sound.add("gamemusic", { loop: true });
    gamemusic.play();
    gamemusic.setVolume(0.7);
    actionmusic = this.sound.add("actionmusic", { loop: true });
    actionmusic.setVolume(0.8);
    this.cursor = this.add.image(0, 0, 'cursor');   // Create cursor
    this.cursor.setScale(cursorScale)
    this.cursor.setDepth(4)
    this.cursor.x = tileSize+(tileSize/2);
    this.cursor.y = tileSize+(tileSize/2);

    this.cursorBlinkEvent = this.time.addEvent({ 
        delay: 500,
        callback: () => {
            this.cursor.visible = !this.cursor.visible;
        },
        loop: true,
        paused: true // Start in a paused state
    });

    this.cursorBlinkEvent.paused = false; // Start blinking

    const startX = 0;
    const startY = 0;
    const widthMax = (this.sys.game.canvas.width/tileSize).toFixed(0)
    const heightMax = (this.sys.game.canvas.height/tileSize).toFixed(0)

    /*
    console.log(gridWidth, gridHeight, tileSize, startX, startY);
    console.log(this.sys.game.config.width, this.sys.game.config.height);
    console.log(this.sys.game.canvas.width/gridWidth, this.sys.game.canvas.height/gridHeight);
    console.log(widthMax, heightMax);
    */

    // Create the grid
    for (let y = 1; y < heightMax - 1; y++) {
        for (let x = 1; x < widthMax - 1; x++) {
            
            const tile = this.add.image(
                startX + (x * tileSize) + (tileSize / 2), // Add half tileSize for centering
                startY + (y * tileSize) + (tileSize / 2), // Add half tileSize for centering
                'tile'
            );
            tile.setDepth(2);
            
            // Optional: if you want the tiles to scale with the game
            tile.setDisplaySize(tileSize, tileSize);

            bx = x;
            by = y;
          
        
    }
    }



    // wizard class
    class Wizard {
        constructor(scene, x, y, spriteKey, scale = spriteScale) {
            console.log("adding: ", spriteKey, scale)
            this.sprite = scene.add.sprite(x, y, spriteKey);
            this.sprite.setScale(scale);
            this.sprite.setDepth(3);
            scene.anims.create({
                key: `${spriteKey}_idle`, // Unique key using spriteKey
                frames: scene.anims.generateFrameNumbers(spriteKey, { start: 0, end: 3 }),
                frameRate: 8, 
                repeat: -1 
            });
            this.sprite.play(`${spriteKey}_idle`);  
        }
    }

    class GameBoard {
        constructor(scene, gridWidth, gridHeight) {
            this.scene = scene;
            this.gridWidth = gridWidth;
            this.gridHeight = gridHeight;
            this.pieces = []; // Array to store game pieces
        }

        toggleMenu(x,y,toggle, cat){
            console.log(x,y,"menu at")
            console.log(toggle,this.menuGraphics, this.menuText)

            if (toggle){
                let transferscene = this.scene;
                // Check if this is a player piece (player1 or player2)
                if (cat === "player1" || cat === "player2") {
                    const playerNum = cat === "player1" ? 1 : 2;
                    const menuTitle = `Player ${playerNum}`;
                    renderMenu(false, "player", "root", menuTitle, this.scene, x, y, toggle)

                    // Remove any existing handler first
                    if (currentMenuHandler) {
                        document.removeEventListener("keydown", currentMenuHandler);
                    }

                    // Create and store the new handler
                    currentMenuHandler = function(event) {
                        handleMenuKeydown(event, menus["player"]["root"], transferscene);
                    };

                    console.log("adding keydown handlemenukeydown")
                    keymonitor = true;
                    spellsMode = false; // Reset spellsMode for new menu
                    document.addEventListener("keydown", currentMenuHandler);
                }
            } else {
                setTimeout(() => {
                    this.scene.cursorBlinkEvent.paused = false;
                    renderMenu(true)

                    console.log("removing keydown handlemenukeydown")
                    if (currentMenuHandler) {
                        document.removeEventListener("keydown", currentMenuHandler);
                        currentMenuHandler = null;
                    }
                }, 50);
            }
        }

        selectBox(x,y) {
            const cursor = this.pieces.find(piece => piece.piece === "cursor");
            const selectedBox = this.pieces.find(piece => piece.x === cursor.x && piece.y === cursor.y && piece.piece !== "cursor");
            console.log("selectedBox", selectedBox)
            if (selectedBox) {
                this.toggleMenu(x,y,true,selectedBox.cat);
                this.scene.cursorBlinkEvent.paused = true; // toggle blinking
            } else {
                // no piece is here so back out of selection process
                return false
            }
        }

        setupBoardDimensions(x,y){
            this.boardWidth = x;
            this.boardHeight = y;
        }
   
        setupCursor() {      // default add cursor 1x1
           this.pieces.push({ piece: "cursor", x: 1, y: 1, "cat": "cursor" });
        }

        reportCursor(){
            const cursorpos = this.pieces.find(piece => piece.piece === "cursor");
            if (cursorpos){
                return {"x":cursorpos.x,"y":cursorpos.y}
            } else {
                return false
            }
        }

        alterCursor(dimension, value) { // update cursor on gameboard
            const cursorIndex = this.pieces.findIndex(piece => piece.piece === "cursor");
            if (cursorIndex !== -1) {
                dimension === "x" ? this.pieces[cursorIndex].x += value : "";
                dimension === "y" ? this.pieces[cursorIndex].y += value : "";
            }
        }
        addPiece(piece, x, y, cat) { // add game piece
            if (this.isValidPosition(x, y)) {
                this.pieces.push({ piece: piece, x: x, y: y, "cat": cat });
                piece.sprite.x = x * tileSize + (tileSize / 2);
                piece.sprite.y = y * tileSize + (tileSize / 2);
                this.scene.add.existing(piece.sprite);
            } else {
                console.error("Invalid position for piece:", x, y);
            }
        }
    
        isValidPosition(x, y) {
            return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
        }

        movePiece(piece, dx, dy) {
            const pieceData = this.pieces.find(p => p.piece === piece);
            if (!pieceData) return false;

            const newX = pieceData.x + dx;
            const newY = pieceData.y + dy;

            // Check bounds (1 to board dimensions, matching grid layout)
            if (newX < 1 || newX > this.boardWidth || newY < 1 || newY > this.boardHeight) {
                return false;
            }

            // Check if another piece occupies the target square (excluding cursor)
            const occupied = this.pieces.find(p => p.x === newX && p.y === newY && p.piece !== "cursor" && p.piece !== piece);
            if (occupied) {
                return false;
            }

            // Update piece position in array
            pieceData.x = newX;
            pieceData.y = newY;

            // Update sprite position
            piece.sprite.x = newX * tileSize + (tileSize / 2);
            piece.sprite.y = newY * tileSize + (tileSize / 2);

            return true;
        }

        getSelectedPiece() {
            const cursor = this.pieces.find(piece => piece.piece === "cursor");
            return this.pieces.find(piece => piece.x === cursor.x && piece.y === cursor.y && piece.piece !== "cursor");
        }
    }

    this.gameBoard = new GameBoard(this, gridWidth, gridHeight);
    // let whiteWizard = new Wizard(this, ((1 * tileSize)+(1/2 * tileSize)), (1 * tileSize)+characterY, 'white_wizard',0.6);
    let whiteWizard = new Wizard(this, 2, 2, 'white_wizard',1);
    this.gameBoard.addPiece(whiteWizard, 1, 1, "player1");
    let cartoonWizard = new Wizard(this, 2, 2, 'cartoon_wizard',1);
    this.gameBoard.addPiece(cartoonWizard, bx, by, "player2");
    
    this.gameBoard.setupCursor();
    this.gameBoard.setupBoardDimensions(bx, by);

    console.log(this.gameBoard);

     // this.graphics = this.add.graphics();

    // Show initial turn dialog
    showTurnDialog();
}

function update() {
    // Block input while turn dialog is showing
    if (turnDialogActive) return;

    const cursors = this.input.keyboard.createCursorKeys();

    // Movement mode - move the selected piece (must be checked first)
    if (movementMode && selectedPiece) {
        let dx = 0;
        let dy = 0;

        if (cursors.left.isDown && !this.moveLeftKeyDown) {
            dx = -1;
            this.moveLeftKeyDown = true;
        } else if (cursors.left.isUp) {
            this.moveLeftKeyDown = false;
        }

        if (cursors.right.isDown && !this.moveRightKeyDown) {
            dx = 1;
            this.moveRightKeyDown = true;
        } else if (cursors.right.isUp) {
            this.moveRightKeyDown = false;
        }

        if (cursors.up.isDown && !this.moveUpKeyDown) {
            dy = -1;
            this.moveUpKeyDown = true;
        } else if (cursors.up.isUp) {
            this.moveUpKeyDown = false;
        }

        if (cursors.down.isDown && !this.moveDownKeyDown) {
            dy = 1;
            this.moveDownKeyDown = true;
        } else if (cursors.down.isUp) {
            this.moveDownKeyDown = false;
        }

        if (dx !== 0 || dy !== 0) {
            const moved = this.gameBoard.movePiece(selectedPiece.piece, dx, dy);
            if (moved) {
                menuclick.play();
                // Move cursor to follow the piece
                this.cursor.x = selectedPiece.piece.sprite.x;
                this.cursor.y = selectedPiece.piece.sprite.y;
                this.gameBoard.alterCursor("x", dx);
                this.gameBoard.alterCursor("y", dy);
                // End movement mode - turn is over
                movementMode = false;
                selectedPiece = null;
                endTurn();
            } else {
                error.play();
            }
        }

        // Cancel movement mode with space
        if (cursors.space.isDown && !this.spaceKeyDown) {
            menuclick.play();
            movementMode = false;
            selectedPiece = null;
            this.spaceKeyDown = true;
            console.log("Movement cancelled");
        } else if (cursors.space.isUp) {
            this.spaceKeyDown = false;
        }
        return; // Don't process other inputs while in movement mode
    }

    // cursor movement ----------------------------
    const speed = 250;

    // Track key press state
    if (cursors.left.isDown && !this.leftKeyDown && !isSelected) {

        // stop left moving past left barrier
        const pos = this.gameBoard.reportCursor()
        if (pos.x-1 === 0) {
            error.play()
            return false
        }

        this.cursor.x -= tileSize; 
        this.leftKeyDown = true; // Mark the key as down
        this.gameBoard.alterCursor("x", -1);
        console.log(this.gameBoard)

    } else if (cursors.left.isUp) {
        this.leftKeyDown = false; // Mark the key as up
    }
    if (cursors.right.isDown && !this.rightKeyDown && !isSelected) {
        
         const pos = this.gameBoard.reportCursor()
        if (pos.x+1 === bx+1) {
            error.play()
            return false
        }

        this.cursor.x += tileSize; 
        this.rightKeyDown = true; // Mark the key as down
        this.gameBoard.alterCursor("x", 1);
        console.log(this.gameBoard)
    } else if (cursors.right.isUp) {
        this.rightKeyDown = false; // Mark the key as up
    }

    if (cursors.up.isDown && !this.upKeyDown && !isSelected) {
        const pos = this.gameBoard.reportCursor()
        if (pos.y-1 === 0) {
            error.play()
            return false
        }

        this.cursor.y -= tileSize;
        this.upKeyDown = true; // Mark the key as down
        this.gameBoard.alterCursor("y", -1);
        console.log(this.gameBoard)
    } else if (cursors.up.isUp) {
        this.upKeyDown = false; // Mark the key as up
    }
    if (cursors.down.isDown && !this.downKeyDown && !isSelected) {
         const pos = this.gameBoard.reportCursor()
        if (pos.y+1 === by+1) {
            error.play()
            return false
        }

        this.cursor.y += tileSize;
        this.downKeyDown = true; // Mark the key as down
        this.gameBoard.alterCursor("y", 1);
        console.log(this.gameBoard)
    } else if (cursors.down.isUp) {
        this.downKeyDown = false; // Mark the key as up
    }

    // space
    if (cursors.space.isDown && !this.spaceKeyDown) {
        menuclick.play();
        isSelected = !isSelected;
        this.spaceKeyDown = true;
        if (isSelected){
            let proceed = this.gameBoard.selectBox(this.cursor.x, this.cursor.y);
            this.cursor.visible = true;
            if (proceed === false) { // if there is no game piece then backout
                isSelected = false;
                this.cursor.visible = false;
                    setTimeout(() => {
                        this.cursor.visible = true;
                    }, 100); // 100ms delay
                }
        } else {
            this.gameBoard.toggleMenu(0, 0, false);
            keymonitor = false
        }
    } else if (cursors.space.isUp) {
        this.spaceKeyDown = false; // Mark the space key as up
    }

    // Keep the cursor within the grid bounds (optional)
    this.cursor.x = Phaser.Math.Clamp(this.cursor.x, 0, (gridWidth - 1) * tileSize);
    this.cursor.y = Phaser.Math.Clamp(this.cursor.y, 0, (gridHeight - 1) * tileSize);

  /*this.graphics.clear();
     for (let i = 0; i < 10; i++) { // Example: create 10 particles per frame
        const x = Phaser.Math.Between(0, this.game.config.width);
        const y = Phaser.Math.Between(0, this.game.config.height);
        const radius = Phaser.Math.Between(2, 5); 
        const color = Phaser.Display.Color.RandomRGB(); 

        this.graphics.fillStyle(color.color, 1); // Set fill color with alpha
        this.graphics.fillCircle(x, y, radius); // Draw a circle as a particle
    }*/


}

console.log(config)
const game = new Phaser.Game(config);

