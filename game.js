const GRID_WIDTH = 11,
	GRID_HEIGHT = 16,
	TIME_LIMIT = 120; // 2 minutes in seconds.

const dateDisplay = document.getElementById('date'),
	scoreDisplay = document.getElementById('score'),
	highScoreDisplay = document.getElementById('highScore'),
	attemptsDisplay = document.getElementById('attempts'),
	gameContainer = document.getElementById('game-container'),
	gameGrid = document.getElementById('game-grid'),
	gameOver = document.getElementById('game-over'),
	copyButton = document.getElementById('copy-btn'),
	selectionRect = document.getElementById('selection-rect'),
	timeIndicator = document.getElementById('time-indicator');

const date = new Date();
const dateSeed = new Date().setHours(0, 0, 0, 0);
const lsKeyAttempts = "attempts";
const lsKeyDate = "date";
const lsKeyHighScore = "highScore";

let rng;

	/** {Array<Array<HTMLButtonElement>>} */
let cells = [],
	/** {Boolean} */
	pointerDragging = false,
	/** {Number} */
	score = 0,
	highScore = 0,
	/** {Number} seconds */
	remainingTime = 0,
	timerInterval,
	/** {Object<String,Number> */
	selection;

// Alea prng algorithm source: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
function Alea(seed) {
	if (seed === undefined) { seed = +new Date() + Math.random(); }
	function Mash() {
		var n = 4022871197;
		return function (r) {
			for (var t, s, u = 0, e = 0.02519603282416938; u < r.length; u++)
				s = r.charCodeAt(u), f = (e * (n += s) - (n * e | 0)),
					n = 4294967296 * ((t = f * (e * n | 0)) - (t | 0)) + (t | 0);
			return (n | 0) * 2.3283064365386963e-10;
		}
	}
	return function () {
		var m = Mash(), a = m(" "), b = m(" "), c = m(" "), x = 1, y;
		seed = seed.toString(), a -= m(seed), b -= m(seed), c -= m(seed);
		a < 0 && a++, b < 0 && b++, c < 0 && c++;
		return function () {
			var y = x * 2.3283064365386963e-10 + a * 2091639; a = b, b = c;
			return c = y - (x = y | 0);
		};
	}();
}


function init() {
	window.addEventListener('pointerup', handlePointerUp);
	document.getElementById('restart-btn').addEventListener('click', resetGame);
	copyButton.addEventListener('pointerdown', copyScore);
	resetGame();
}

function resetGame() {

	rng = Alea(dateSeed);
	dateDisplay.textContent = date.toLocaleDateString();
	scoreDisplay.textContent = (score = 0);

	if (gameContainer.contains(gameOver)) {
		gameContainer.removeChild(gameOver);
	}

	let lastSaveDate = localStorage.getItem(lsKeyDate) ?? dateSeed;
	if (lastSaveDate != dateSeed) {
		localStorage.removeItem(lsKeyAttempts);
		localStorage.removeItem(lsKeyHighScore);
	}

	localStorage.setItem(lsKeyDate, dateSeed);

	highScore = localStorage.getItem(lsKeyHighScore) ?? 0;
	highScoreDisplay.textContent = highScore;

	let attempts = localStorage.getItem(lsKeyAttempts) ?? 0;
	localStorage.setItem(lsKeyAttempts, ++attempts);
	attemptsDisplay.textContent = attempts;
	
	gameGrid.innerHTML = '';
	for (let y = 0; y < GRID_HEIGHT; y++) {
		cells[y] = [];
		for (let x = 0; x < GRID_WIDTH; x++) {
			cells[y][x] = createGridBtn();
			cells[y][x].x = x;
			cells[y][x].y = y;
			cells[y][x].style.gridRow = (y + 1);
			cells[y][x].style.gridColumn = (x + 1);
			gameGrid.appendChild(cells[y][x]);
		}
	}
	
	timeIndicator.value = (remainingTime = TIME_LIMIT);
	clearInterval(timerInterval);
	timerInterval = setInterval( () => {
		timeIndicator.value = (Math.max(0, remainingTime -= 1));
		if (remainingTime === 0) {
			endGame();
		}
	}, 1000);
}

function endGame() {
	clearInterval(timerInterval);
	if (selection) {
		selection = undefined;
		gameGrid.removeChild(selectionRect);
	}

	for (let y = 0; y < GRID_HEIGHT; y++) {
		for (let x = 0; x < GRID_WIDTH; x++) {
			cells[y][x].disabled = true;
		}
	}

	gameContainer.appendChild(gameOver);

	// set high score
	if(score > highScore) {
		highScore = score;
		localStorage.setItem(lsKeyHighScore, highScore);
		highScoreDisplay.textContent = highScore;
	}

}

/**
 * 
 * @returns {HTMLButtonElement}
 */
function createGridBtn() {
	const value = Math.round(rng() * 8) + 1, // Random integer 1-9.
		btn = document.createElement('button');
	btn.textContent = value;
	btn.numValue = value;
	btn.className = `num${value}`;
	btn.addEventListener('pointerdown', handleCellPointerDown);
	btn.addEventListener('pointerenter', handleCellPointerMove);
	return btn;
}

/**
 * 
 */
function updateSelectionRect() {
	selectionRect.style.gridColumn = `${selection.x + 1} / span ${selection.width }`;
	selectionRect.style.gridRow = `${selection.y + 1} / span ${selection.height}`;
}

/**
 * 
 * @returns {Number}
 */
function getSelectionSum() {
	let sum = 0;
	for (let y = selection.y; y < selection.y + selection.height; y++) {
		for (let x = selection.x; x < selection.x + selection.width; x++) {
			sum += cells[y][x].numValue;
		}
	}
	return sum;
}

/**
 * 
 */
function clearSelectionCells() {
	let sum = 0;
	for (let y = selection.y; y < selection.y + selection.height; y++) {
		for (let x = selection.x; x < selection.x + selection.width; x++) {
			cells[y][x].numValue = 0;
			cells[y][x].className = 'num0';
		}
	}
}

function handleCellPointerDown(ev) {
	if (remainingTime === 0) { return; }
	
	ev.preventDefault();
	ev.target.releasePointerCapture(ev.pointerId); // Cancel implicit button pointer capture.
	
	selection = {
		startX: ev.target.x,
		startY: ev.target.y,
		x: ev.target.x,
		y: ev.target.y,
		width: 1,
		height: 1
	};
	updateSelectionRect();
	gameGrid.appendChild(selectionRect);
}

function handleCellPointerMove(ev) {
	if (!selection) { return; }
	
	ev.preventDefault();
	
	const newStartX = Math.min(selection.startX, ev.target.x),
		newStartY  = Math.min(selection.startY, ev.target.y),
		newEndX = Math.max(selection.startX, ev.target.x),
		newEndY  = Math.max(selection.startY, ev.target.y);
	
	selection.x = newStartX;
	selection.y = newStartY;
	selection.width = newEndX - newStartX + 1;
	selection.height = newEndY - newStartY + 1;
	updateSelectionRect();
}

function handlePointerUp(ev) {
	if (!selection) { return; }
	
	const sum = getSelectionSum();
	
	if (sum === 10) {
		const scoreIncrease = selection.width * selection.height; // Total number of cells.
		scoreDisplay.textContent = (score += scoreIncrease);
		clearSelectionCells();
	}
	
	// Clear the selection.
	selection = undefined;
	gameGrid.removeChild(selectionRect);
}

let textResetTimeout;
function copyScore(e) { 
	navigator.clipboard.writeText(`Make Ten Daily - ${dateDisplay.textContent}
Score: ${score}
Best: ${highScore}
Attempts: ${attemptsDisplay.textContent}
`);

	copyButton.textContent = "Copied!";
	window.clearTimeout(textResetTimeout);
	textResetTimeout = window.setTimeout(() => copyButton.textContent = "Copy Score", 2500);
}

window.addEventListener('DOMContentLoaded', init);
