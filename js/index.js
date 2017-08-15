/**
 * The given file contains handlers responsible for setting up the environment for our flappy bird.
 * All the associated functions and events corresponding to simulating our flappy bird sits here.
 * The script forms the most basic 32x32 pixel gameplay for flappy bird, ideally developed for the #lowrezjam2014
 * challenge (http://jams.gamejolt.io/lowrezjam2014)
 * The script can be configured for various environmental parameters like gameplay speed, gravity, tubes position etc. 
 * 
 * Reference: https://codepen.io/sakri/details/gGahJ
 */

var readyStateCheckInterval = setInterval( function() {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        initGame();
    }
}, 100);

var eventLoop;

var bgLoc = {x:0, y:0, width:32, height:32};
var groundLoc = {x:0, y:31, width:35, height:1};
var instructionsLoc = {x:6, y:49, width:17, height:21};
var gameOverLoc = {x:6, y:32, width:21, height:17};
var birdLocs = [{x:32, y:0, width:5, height:3}, {x:32, y:3, width:5, height:3}, {x:32, y:6, width:5, height:3}];
var tubeLoc = {x:0, y:32, width:6, height:44};

var hiscoreLoc = {x:6, y:70, width:30, height:10};
var scoreLocs = [32, 9, 27, 32, 32, 32, 27, 41, 32, 41, 27, 50, 32, 50, 27, 59, 32, 59, 32, 18];

var flappyBirdSource = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAABQCAYAAACecbxxAAACY0lEQVRoge2XPW4CMRCF5yooLeegpIw4SZp0dBF34DBIKSMOkKQJUgpyBuQUyYIZv/mx1wsGraXR4vXu+Jv3Zheg59e3cM3YbqbH+Dl8BiIiujYUEVEHtZvPwm4+C01AERF9LB+On5uAas6+uKdG+27Oviafvu1mGlq0L40WoOLRFFR8HKFGqLuFau7pa/I91SRUk/aJjb4/vB+D3xivea/xrkMotOElA9r38r0K14y4wVuC6sYI5YY6RkNQpzFC3TTU02Ya1vtF+AqrcMnP6/0iWUvAuoXH5QQ/EXZY16N16R4din8FoHmcULqO50Pnzs5bUNKmfBMNNlaFQ8HzfaG0Y7Q5ylkOhRTwHNnmIlSxfaVHL1SsWBEUUo5bADdKbZKvrWEfggIWovNZ9qH3x6VChvKoxNclJapCeY5oc+2zBO2ybwgobb0alKTCVaHQRpaCWjHZUJYtsGKhmVX1HpeTwKH+wUwr+LoEZdhHyXUaVIVIlIJWpfDqKAXJyYfW9CTIIm1eqUg7Ceopo4/cRRYUdkpUE4qYMuDcnUD16amL2uesEqqTqfZ5IiOycvWFou6GHraJeXrkqlZdTdX/Et4tlMs+5QvZhCrpKV6UWOCA/2ZUxYqg0BPHq+XrTvVs1a1fnkhyVGFGn/VTqkkodPMQUFXti5PB5AKUES6oM+UcCuW8JvBwvBI81dWByYBCm+ZA5heU+w85Xtd6SpubfdgHKq5SmqOeM/uwApQ6d0KdjwGUKoHyK8X955ta6/yI7onniWJsmEoZVoj3I8USpQaAUmEGhbKsQHMElWWfEtZ6n6BfqpBLl8a8BXQAAAAASUVORK5CYII=";

var spriteSheetImage = new Image();
spriteSheetImage.src = flappyBirdSource;
var spriteSheetCanvas = document.createElement("canvas");
spriteSheetCanvas.width = spriteSheetImage.width;
spriteSheetCanvas.height = spriteSheetImage.height;
var spriteSheetContext = spriteSheetCanvas.getContext("2d");
spriteSheetContext.drawImage(spriteSheetImage, 0, 0);

var renderCanvas = document.createElement("canvas");
renderCanvas.width = renderCanvas.height = 32;
var renderContext = renderCanvas.getContext("2d");
renderContext.globalCompositeOperation = "destination-over";
var collisionCanvas = document.createElement("canvas");

function drawSpriteSheetImage(context, locRect, x, y){
    context.drawImage(spriteSheetImage, locRect.x, locRect.y, locRect.width, locRect.height, x, y, locRect.width, locRect.height);
 }

var canvas, context, gameState, score, groundX = 0, birdY, birdYSpeed, birdX = 5, birdFrame = 0, activeTube, tubes = [], collisionContext, scale, scoreLoc = {width:5, height:9}, hiScore = 0;
var HOME = 0, GAME = 1, GAME_OVER = 2, HI_SCORE = 3;

function initGame(){
    canvas = document.getElementById("gameCanvas");
    context = canvas.getContext("2d");
    scale = 12;
    canvas.width = scale * 32;
    canvas.height = scale * 32;
    canvas.style.left = window.innerWidth / 2 - (scale * 32) / 2 + "px";
    canvas.style.top = window.innerHeight / 2 - (scale * 32) / 2 + "px";
    window.addEventListener( "keydown", handleUserInteraction, false );
    canvas.addEventListener('touchstart', handleUserInteraction, false);
    canvas.addEventListener('mousedown', handleUserInteraction, false);
    collisionCanvas.width = birdX + 8;
    collisionCanvas.height = 32;
    collisionContext = collisionCanvas.getContext("2d");
    collisionContext.globalCompositeOperation = "xor";
    startGame();
    // Set the speed of the game
    eventLoop = setInterval(loop, 40);
}

function startGame(){
    gameState = HOME;
    birdYSpeed = score = 0;
    birdY = 14;
    for(var i = 0; i < 2; i++){
        tubes[i] = {x : Math.round(48 + i * 19) };
        setTubeY(tubes[i]);
    }
}

function loop(){
    switch(gameState){
        case HOME: 
            renderHome();
            break;
        case GAME : 
            nextStep();
            renderGame();
            break;
        case GAME_OVER: 
            renderGameOver();
            // We'll keep looping over the game to train our flappy bird
            startGame();
            gameState = GAME
            break;
        case HI_SCORE : 
            renderHiScore();
            break;
    }
    
}

function handleUserInteraction(event){
    switch(gameState){
        case HOME: gameState = GAME;
            break;
        case GAME : birdYSpeed = -1.4;
            break;
        case HI_SCORE: startGame();
            break;
    }
    if(event){
        event.preventDefault();
    }
}

function renderHome(){
    renderContext.clearRect(0,0,32,32);
    drawSpriteSheetImage(renderContext, instructionsLoc, 32 - instructionsLoc.width - 1, 1);
    updateBirdHome();
    renderGround(true);
    drawSpriteSheetImage(renderContext, bgLoc, 0, 0);
    renderToScale();
}

function renderGame(){
    renderContext.clearRect(0,0,32,32);
    collisionContext.clearRect(0,0,collisionCanvas.width, collisionCanvas.height);
    renderScore(score, renderScoreXGame, 1);
    renderGround(true);
    renderTubes();
    updateBirdGame();
    checkCollision();
    if (displayTarget) {
        renderContext.fillStyle = "#F00";
        renderContext.fillRect(targetTube.x + 3, (targetTube.y+17+6), 1, 1);
    }
    drawSpriteSheetImage(renderContext, bgLoc, 0, 0);
    renderToScale();
}

function renderGameOver(){
    renderContext.clearRect(0, 0, 32, 32);
    drawSpriteSheetImage(renderContext, gameOverLoc, 5, 7 - birdFrame);
    renderToScale();
    if(++score % 8 == 0){
        birdFrame++;
        birdFrame %= 2;
    }
}

function renderHiScore(){
    renderContext.clearRect(0, 0, 32, 32);
    drawSpriteSheetImage(renderContext, hiscoreLoc, 1, 5);
    renderScore(hiScore, renderScoreXHiScore, 16);
    renderGround();
    renderToScale();
}

function renderToScale(){
    var i, data = renderContext.getImageData(0,0,32, 32).data;
    for(i=0; i<data.length; i+=4){
        context.fillStyle = "rgb("+data[i]+","+data[i+1]+","+data[i+2]+")";
        context.fillRect(((i/4) % 32) * scale, Math.floor(i / 128) * scale, scale, scale);
    }
}

function checkCollision(){
    if(birdX == tubes[activeTube].x + 6){
        score++;
    }
    var collisionData = collisionContext.getImageData(birdX, birdY, 5, 3).data;
    var data = renderContext.getImageData(birdX, birdY, 5, 3).data;
    for(var i = 0; i< collisionData.length; i+=4){
        if(collisionData[i+3] != data[i+3]){
            gameState = GAME_OVER;
            if(score > hiScore){
                hiScore = score + 0;
            }
            triggerGameOver();
            break;
        }
    }
}

function renderScore(score, xFunction, y){
    var parts = score.toString().split("");
    var i, index, length = parts.length;
    for(var i=0; i<length; i++){
        index = parseInt(parts.pop())*2;
        scoreLoc.x = scoreLocs[index];
        scoreLoc.y = scoreLocs[index + 1];
        drawSpriteSheetImage(renderContext, scoreLoc, xFunction(i, length), y);
    }
    var curMaxScore = Math.max(parseInt(document.getElementById("score").innerText), parseInt(score));
    document.getElementById("score").innerText = curMaxScore.toString();
    document.getElementById("rules").innerText = Object.keys(Q_table).length;
    document.getElementById("trials").innerText = trials;
}

function renderScoreXGame(index, total){
    return 25 - 5 * index;
}

function renderScoreXHiScore(index, total){
    return 12 + Math.floor((total/2)*5) - 5 * index;
}

function renderGround(move){
    if(move && --groundX < bgLoc.width - groundLoc.width){
        groundX = 0;
    }
    drawSpriteSheetImage(renderContext, groundLoc, groundX, 31);
}

function updateBirdHome(){
    drawSpriteSheetImage(renderContext, birdLocs[birdFrame], birdX, birdY);
    birdFrame++;
    birdFrame %= 3;
}

function updateBirdGame(){
    birdY = Math.round(birdY + birdYSpeed);
    // Gravity for the environment
    birdYSpeed += .25;
    if(birdY < 0){
        birdY = 0;
        birdYSpeed = 0;
    }
    if(birdY + 5 > bgLoc.height){
        birdY = 28;
        birdYSpeed = 0;
    }
    renderContext.save();
    collisionContext.save();
    renderContext.translate(birdX, birdY);
    collisionContext.translate(birdX, birdY);
    drawSpriteSheetImage(renderContext, birdLocs[birdFrame], 0, 0);
    drawSpriteSheetImage(collisionContext, birdLocs[birdFrame], 0, 0);
    renderContext.restore();
    collisionContext.restore();
    birdFrame++;
    birdFrame %= 3;
}

function renderTubes(){
    var i, tube;
    activeTube = tubes[0].x < tubes[1].x ? 0 : 1;
    for(i= 0; i < 2;i++){
        tube = tubes[i];
        if(--tube.x <= -6 ){
            tube.x = 32;
            setTubeY(tube);
        }
        drawSpriteSheetImage(renderContext, tubeLoc, tube.x, tube.y );
        drawSpriteSheetImage(collisionContext, tubeLoc, tube.x, tube.y );
    }
}

function setTubeY(tube){
    // Sets the y-coordinate for tubes depending upon if the given environment should be deterministic or stochastic
    if (isEnvironmentStatic) {
        tube.y = Math.floor(0.639 * (bgLoc.height - tubeLoc.height));
    } else {
        tube.y = Math.floor(Math.random() * (bgLoc.height - tubeLoc.height + 2));
    }
}