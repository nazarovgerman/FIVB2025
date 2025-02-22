const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const whistleSound = document.getElementById("whistleSound");

const SETTINGS = {
    PLAYER_SPEED: 5,
    BALL_GRAVITY: 0.15,
    MAX_BALL_SPEED: 10,
    JUMP_VELOCITY: -10,
    DOUBLE_PRESS_WINDOW: 300,
    WINNING_SCORE: 11,
    ENERGY_MAX: 100,
    ENERGY_JUMP_COST: 25,
    ENERGY_REGEN_RATE: 0.5,
    SERVE_TIME: 6,
    DIVE_DURATION: 1000 // Длительность нырка в миллисекундах
};

let player1 = { 
    x: 50, y: 450, width: 20, height: 100, speed: SETTINGS.PLAYER_SPEED, 
    score: 0, dy: 0, lastUpPress: 0, doublePressWindow: SETTINGS.DOUBLE_PRESS_WINDOW, 
    hitBall: false, hitAnimation: 0, energy: SETTINGS.ENERGY_MAX, sets: 0,
    isDiving: false, diveStartTime: 0 
};
let player2 = { 
    x: 730, y: 450, width: 20, height: 100, speed: SETTINGS.PLAYER_SPEED, 
    score: 0, dy: 0, lastUpPress: 0, doublePressWindow: SETTINGS.DOUBLE_PRESS_WINDOW, 
    hitBall: false, hitAnimation: 0, energy: SETTINGS.ENERGY_MAX, sets: 0,
    isDiving: false, diveStartTime: 0 
};

let ball = { x: 400, y: 300, radius: 15, dx: 0, dy: 0, gravity: SETTINGS.BALL_GRAVITY, isBig: true };

let lastWinner = null;
let isServing = true;
let gamePaused = false;
let gameOver = false;
let gameStarted = false;
let serveTimer = SETTINGS.SERVE_TIME;
let lastServeTime = Date.now();
let netShake = 0;
let setNumber = 0;

let keys = { 
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyP: false, Space: false, KeyR: false 
};

document.addEventListener("keydown", (e) => {
    if (e.code === "KeyP" && !keys.KeyP) {
        gamePaused = !gamePaused;
        keys.KeyP = true;
    }
    if (e.code === "Space" && !gameStarted && !keys.Space) {
        gameStarted = true;
        keys.Space = true;
        lastWinner = Math.random() < 0.5 ? "player1" : "player2";
        resetBall();
    }
    if (e.code === "KeyR" && gameOver && !keys.KeyR) {
        resetGame();
        keys.KeyR = true;
    }
    if (!gameStarted || gamePaused || gameOver) return;
    if (e.code === "KeyW" && !keys.KeyW) {
        const now = Date.now();
        if (now - player1.lastUpPress < player1.doublePressWindow && player1.dy === 0 && player1.energy >= SETTINGS.ENERGY_JUMP_COST) {
            player1.dy = SETTINGS.JUMP_VELOCITY;
            player1.energy -= SETTINGS.ENERGY_JUMP_COST;
        }
        player1.lastUpPress = now;
        keys.KeyW = true;
    }
    if (e.code === "KeyS" && !keys.KeyS) {
        const now = Date.now();
        if (now - player1.lastUpPress < player1.doublePressWindow && !player1.isDiving) {
            player1.isDiving = true;
            player1.diveStartTime = now;
        }
        keys.KeyS = true;
    }
    if (e.code === "KeyA") keys.KeyA = true;
    if (e.code === "KeyD") keys.KeyD = true;
    if (e.code === "ArrowUp" && !keys.ArrowUp) {
        const now = Date.now();
        if (now - player2.lastUpPress < player2.doublePressWindow && player2.dy === 0 && player2.energy >= SETTINGS.ENERGY_JUMP_COST) {
            player2.dy = SETTINGS.JUMP_VELOCITY;
            player2.energy -= SETTINGS.ENERGY_JUMP_COST;
        }
        player2.lastUpPress = now;
        keys.ArrowUp = true;
    }
    if (e.code === "ArrowDown" && !keys.ArrowDown) {
        const now = Date.now();
        if (now - player2.lastUpPress < player2.doublePressWindow && !player2.isDiving) {
            player2.isDiving = true;
            player2.diveStartTime = now;
        }
        keys.ArrowDown = true;
    }
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;
});

document.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") keys.KeyW = false;
    if (e.code === "KeyS") keys.KeyS = false;
    if (e.code === "KeyA") keys.KeyA = false;
    if (e.code === "KeyD") keys.KeyD = false;
    if (e.code === "ArrowUp") keys.ArrowUp = false;
    if (e.code === "ArrowDown") keys.ArrowDown = false;
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
    if (e.code === "KeyP") keys.KeyP = false;
    if (e.code === "Space") keys.Space = false;
    if (e.code === "KeyR") keys.KeyR = false;
});

function resetGame() {
    player1.score = 0;
    player2.score = 0;
    player1.sets = 0;
    player2.sets = 0;
    setNumber = 0;
    player1.energy = SETTINGS.ENERGY_MAX;
    player2.energy = SETTINGS.ENERGY_MAX;
    gameOver = false;
    gameStarted = false;
    lastWinner = null;
    resetBall();
}

function update() {
    if (!gameStarted || gamePaused || gameOver) return;

    // Обновление нырка
    if (player1.isDiving && Date.now() - player1.diveStartTime > SETTINGS.DIVE_DURATION) {
        player1.isDiving = false;
    }
    if (player2.isDiving && Date.now() - player2.diveStartTime > SETTINGS.DIVE_DURATION) {
        player2.isDiving = false;
    }

    if (isServing) {
        player1.energy = Math.min(SETTINGS.ENERGY_MAX, player1.energy + SETTINGS.ENERGY_REGEN_RATE);
        player2.energy = Math.min(SETTINGS.ENERGY_MAX, player2.energy + SETTINGS.ENERGY_REGEN_RATE);
    }

    if (keys.KeyW && player1.y > 0) player1.y -= player1.speed;
    if (keys.KeyS && player1.y + player1.height < canvas.height) player1.y += player1.speed;
    if (keys.KeyA && player1.x > 0) player1.x -= player1.speed;
    if (keys.KeyD && player1.x + player1.width < canvas.width / 2 - 2) player1.x += player1.speed;

    player1.dy += 0.5;
    player1.y += player1.dy;
    if (player1.y + player1.height > canvas.height) {
        player1.y = canvas.height - player1.height;
        player1.dy = 0;
    }
    if (player1.y < 0) player1.y = 0;

    if (keys.ArrowUp && player2.y > 0) player2.y -= player2.speed;
    if (keys.ArrowDown && player2.y + player2.height < canvas.height) player2.y += player2.speed;
    if (keys.ArrowLeft && player2.x > canvas.width / 2 + 2) player2.x -= player2.speed;
    if (keys.ArrowRight && player2.x + player2.width < canvas.width) player2.x += player2.speed;

    player2.dy += 0.5;
    player2.y += player2.dy;
    if (player2.y + player2.height > canvas.height) {
        player2.y = canvas.height - player2.height;
        player2.dy = 0;
    }
    if (player2.y < 0) player2.y = 0;

    if (isServing && gameStarted) {
        let elapsed = (Date.now() - lastServeTime) / 1000;
        if (elapsed >= 1) {
            serveTimer--;
            lastServeTime = Date.now();
        }
        if (serveTimer <= 0) {
            if (lastWinner === "player1" || lastWinner === null && ball.x < canvas.width / 2) {
                player2.score++;
                lastWinner = "player2";
            } else {
                player1.score++;
                lastWinner = "player1";
            }
            resetBall();
            serveTimer = SETTINGS.SERVE_TIME;
        }
    } else {
        serveTimer = SETTINGS.SERVE_TIME;
        lastServeTime = Date.now();
    }

    if (!isServing) {
        ball.dy += ball.gravity;
        ball.x += ball.dx;
        ball.y += ball.dy;
        ball.dx = Math.max(-SETTINGS.MAX_BALL_SPEED, Math.min(SETTINGS.MAX_BALL_SPEED, ball.dx));
        ball.dy = Math.max(-SETTINGS.MAX_BALL_SPEED, Math.min(SETTINGS.MAX_BALL_SPEED, ball.dy));
    }

    player1.hitBall = false;
    player2.hitBall = false;

    if (ball.x - ball.radius < player1.x + player1.width &&
        ball.x + ball.radius > player1.x &&
        ball.y + ball.radius > player1.y &&
        ball.y - ball.radius < player1.y + player1.height) {
        let power = player1.dy < 0 ? 1.5 : 1;
        if (isServing) {
            ball.dx = (4 + Math.random() * 4) * power;
            ball.dy = -8 * power;
            isServing = false;
        } else {
            ball.dx = (Math.abs(ball.dx) + 0.5) * power;
            ball.dy = (-Math.abs(ball.dy) - 2) * power;
            ball.x = player1.x + player1.width + ball.radius;
        }
        player1.hitBall = true;
    }

    if (ball.x + ball.radius > player2.x &&
        ball.x - ball.radius < player2.x + player2.width &&
        ball.y + ball.radius > player2.y &&
        ball.y - ball.radius < player2.y + player2.height) {
        let power = player2.dy < 0 ? 1.5 : 1;
        if (isServing) {
            ball.dx = -(4 + Math.random() * 4) * power;
            ball.dy = -8 * power;
            isServing = false;
        } else {
            ball.dx = (-Math.abs(ball.dx) - 0.5) * power;
            ball.dy = (-Math.abs(ball.dy) - 2) * power;
            ball.x = player2.x - ball.radius;
        }
        player2.hitBall = true;
    }

    // Уменьшение мяча, если у игрока закончилась энергия
    if (player1.energy <= 0 || player2.energy <= 0) {
        ball.isBig = false;
    }

    if (player1.hitBall) player1.hitAnimation = Math.min(1, player1.hitAnimation + 0.05);
    else player1.hitAnimation = Math.max(0, player1.hitAnimation - 0.05);
    if (player2.hitBall) player2.hitAnimation = Math.min(1, player2.hitAnimation + 0.05);
    else player2.hitAnimation = Math.max(0, player2.hitAnimation - 0.05);

    if (!isServing && ball.y + ball.radius > 400 && ball.y - ball.radius < 600) {
        if (ball.x + ball.radius > 398 && ball.x - ball.radius < 402) {
            if (Math.abs(ball.dx) < 2) {
                resetBall();
                if (ball.x < canvas.width / 2) player2.score++;
                else player1.score++;
            } else {
                netShake = 10;
                if (ball.dx > 0) {
                    ball.x = 398 - ball.radius;
                    ball.dx = -ball.dx;
                } else {
                    ball.x = 402 + ball.radius;
                    ball.dx = -ball.dx;
                }
            }
        }
    }
    netShake = Math.max(0, netShake - 1);

    if (ball.y + ball.radius > canvas.height) {
        if (ball.x < canvas.width / 2) {
            player2.score++;
            lastWinner = "player2";
            resetBall();
        } else {
            player1.score++;
            lastWinner = "player1";
            resetBall();
        }
        if (player1.score >= SETTINGS.WINNING_SCORE || player2.score >= SETTINGS.WINNING_SCORE) {
            if (player1.score >= 10 && player2.score >= 10) {
                if (Math.abs(player1.score - player2.score) >= 2) {
                    if (player1.score > player2.score) player1.sets++;
                    else player2.sets++;
                    if (player1.sets < 3 && player2.sets < 3) {
                        player1.score = 0;
                        player2.score = 0;
                        setNumber++;
                        resetBall();
                    } else {
                        gameOver = true;
                    }
                }
            } else {
                if (player1.score > player2.score) player1.sets++;
                else player2.sets++;
                if (player1.sets < 3 && player2.sets < 3) {
                    player1.score = 0;
                    player2.score = 0;
                    setNumber++;
                    resetBall();
                } else {
                    gameOver = true;
                }
            }
        }
    }

    if (!isServing && (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width)) {
        ball.dx = -ball.dx;
    }
}

function resetBall() {
    whistleSound.play();
    if (lastWinner === null) {
        ball.x = Math.random() < 0.5 ? 200 : 600;
    } else {
        ball.x = (setNumber % 2 === 0) ? (lastWinner === "player1" ? 200 : 600) : (lastWinner === "player1" ? 600 : 200);
    }
    ball.y = 450;
    ball.dx = 0;
    ball.dy = 0;
    ball.isBig = true;
    isServing = true;
}

function drawVolleyballPlayer(x, y, color, facingRight, hitBall, hitAnimation, isDiving) {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;

    // Тело
    if (isDiving) {
        ctx.save();
        ctx.translate(x + 10, y + 50);
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-25, -10, 50, 20);
        ctx.restore();
    } else {
        ctx.beginPath();
        ctx.arc(x + 10, y - 20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x, y, 20, 50);
    }

    // Руки
    if (facingRight) {
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 10);
        if (hitAnimation > 0) {
            let t = hitAnimation;
            ctx.lineTo(x + 30 + 10 * t, y + 20 - 30 * t);
        } else {
            ctx.lineTo(x + 30, y + 20);
            ctx.lineTo(x + 40, y - 10);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x - 20, y - 20);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        if (hitAnimation > 0) {
            let t = hitAnimation;
            ctx.lineTo(x - 10 - 10 * t, y + 20 - 30 * t);
        } else {
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x - 20, y - 10);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 20, y + 10);
        ctx.lineTo(x + 40, y - 20);
        ctx.stroke();
    }

    // Ноги
    if (!isDiving) {
        ctx.fillRect(x, y + 50, 5, 30);
        ctx.fillRect(x + 15, y + 50, 5, 30);
    }

    // Обводка
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    if (!isDiving) {
        ctx.beginPath();
        ctx.arc(x + 10, y - 20, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(x, y, 20, 50);
    }
    if (facingRight) {
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 10);
        if (hitAnimation > 0) {
            let t = hitAnimation;
            ctx.lineTo(x + 30 + 10 * t, y + 20 - 30 * t);
        } else {
            ctx.lineTo(x + 30, y + 20);
            ctx.lineTo(x + 40, y - 10);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x - 20, y - 20);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        if (hitAnimation > 0) {
            let t = hitAnimation;
            ctx.lineTo(x - 10 - 10 * t, y + 20 - 30 * t);
        } else {
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x - 20, y - 10);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 20, y + 10);
        ctx.lineTo(x + 40, y - 20);
        ctx.stroke();
    }
    if (!isDiving) {
        ctx.strokeRect(x, y + 50, 5, 30);
        ctx.strokeRect(x + 15, y + 50, 5, 30);
    }
}

function drawBall() {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffff00";

    const radius = ball.isBig ? ball.radius * 2 : ball.radius;

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, -0.5, Math.PI - 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, Math.PI + 0.5, -0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, Math.PI / 2 - 0.5, (3 * Math.PI) / 2 - 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, (3 * Math.PI) / 2 + 0.5, Math.PI / 2 + 0.5);
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#555555";
    let shadowSize = 10 * (canvas.height - ball.y) / canvas.height;
    ctx.beginPath();
    ctx.arc(ball.x, canvas.height - 10, shadowSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawScoreboard() {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00ff00";

    const cornerRadius = 10;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 75 + cornerRadius, 10);
    ctx.arcTo(canvas.width / 2 - 75 + 150, 10, canvas.width / 2 - 75 + 150, 10 + 50, cornerRadius);
    ctx.arcTo(canvas.width / 2 - 75 + 150, 10 + 50, canvas.width / 2 - 75, 10 + 50, cornerRadius);
    ctx.arcTo(canvas.width / 2 - 75, 10 + 50, canvas.width / 2 - 75, 10, cornerRadius);
    ctx.arcTo(canvas.width / 2 - 75, 10, canvas.width / 2 - 75 + 150, 10, cornerRadius);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${player1.score} : ${player2.score}`, canvas.width / 2, 45);
    ctx.font = "16px Arial";
    ctx.fillText(`${player1.sets}`, canvas.width / 2 - 50, 45);
    ctx.fillText(`${player2.sets}`, canvas.width / 2 + 50, 45);
}

function drawInterface() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";

    if (!gameStarted) {
        ctx.font = "30px Arial";
        ctx.fillText("Нажмите пробел для старта", canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "20px Arial";
        ctx.fillText("Игрок 1: W/A/S/D", 200, canvas.height / 2 + 50);
        ctx.fillText("Двойной W - прыжок", 200, canvas.height / 2 + 80);
        ctx.fillText("Игрок 2: Стрелки", 600, canvas.height / 2 + 50);
        ctx.fillText("Двойной ↑ - прыжок", 600, canvas.height / 2 + 80);
        ctx.fillText("Пауза: P", canvas.width / 2, canvas.height / 2 + 20);
        return;
    }

    if (isServing) {
        let serveX = lastWinner === "player2" ? 600 : 200;
        ctx.fillText(`Подача (${Math.ceil(serveTimer)})`, serveX, 100);
    }
    if (gamePaused) {
        ctx.fillStyle = "#ff0000";
        ctx.font = "50px Arial";
        ctx.fillText("Пауза", canvas.width / 2, canvas.height / 2);
    }
    if (gameOver) {
        ctx.fillStyle = "#00ff00";
        ctx.font = "50px Arial";
        ctx.fillText(`Игра окончена! ${player1.sets > player2.sets ? "Игрок 1" : "Игрок 2"} победил!`, canvas.width / 2, canvas.height / 2);
        ctx.font = "20px Arial";
        ctx.fillText("Нажмите R для перезапуска", canvas.width / 2, canvas.height / 2 + 60);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 50);
    ctx.lineTo(canvas.width, canvas.height - 50);
    ctx.stroke();

    ctx.fillStyle = "#00ff00";
    ctx.fillRect(canvas.width / 2 - 2 + Math.sin(Date.now() / 50) * netShake, 400, 4, 200);

    if (gameStarted) {
        drawVolleyballPlayer(player1.x, player1.y, "#00ffff", false, player1.hitBall, player1.hitAnimation, player1.isDiving);
        drawVolleyballPlayer(player2.x, player2.y, "#ff00ff", true, player2.hitBall, player2.hitAnimation, player2.isDiving);
        drawBall();

        ctx.fillStyle = "#00ffff";
        ctx.fillRect(10, 10, player1.energy, 10);
        ctx.fillStyle = "#ff00ff";
        ctx.fillRect(canvas.width - 110, 10, player2.energy, 10);
    }

    drawScoreboard();
    drawInterface();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();