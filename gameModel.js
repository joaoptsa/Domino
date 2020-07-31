let GAMES = {};
let GAME = [];
let WAITING;
let LOGGED_IN = [];

module.exports.getUserWaiting = function () {
    return WAITING;
}

module.exports.setUserWaiting = function (nick) {
    WAITING = nick;
    return;
}

module.exports.delUserWaiting = function() {
    WAITING = undefined;
    return;
}

module.exports.getLoggedInUsers = function() {
    return LOGGED_IN;
}

module.exports.addLoggedInUser = function(nick) {
    LOGGED_IN.push(nick);
    return;
}

module.exports.delLoggedInUser = function(nick) {
    LOGGED_IN.splice(LOGGED_IN.indexOf(nick), 1);
    return;
}

module.exports.getGameArray = function() {
    return GAME;
}

module.exports.getGamesArray = function() {
    return GAMES;
}

module.exports.getGameAssignedTo = function (nick) {
    return GAME[nick];
}

module.exports.assignGameToNick = function(nick, gameID) {              
    GAME[nick] = gameID;
    return;
}

module.exports.delGameAssignedToNick = function(nick) {
    delete GAME[nick];
    return;
}




module.exports.buildGameObject = function(gameID, HANDS, nick, pass) {
    GAMES[gameID] = {};   
    GAMES[gameID].player1={};
    GAMES[gameID].player2={};
    GAMES[gameID].board = {};
    GAMES[gameID].board.stockPieces = HANDS[2];
    GAMES[gameID].board.stock = HANDS[2].length;
    GAMES[gameID].board.count = {};
    GAMES[gameID].board.count[nick] = HANDS[0].length;
    GAMES[gameID].board.piece = {};

    GAMES[gameID].winner=undefined;
    GAMES[gameID].player1.nick=nick;
    GAMES[gameID].player1.pass=pass;
    GAMES[gameID].player1.hand=HANDS[0];
    
    GAMES[gameID].player2.nick=undefined;
    GAMES[gameID].player2.pass=undefined;
    GAMES[gameID].player2.hand=HANDS[1];
       
    GAMES[gameID].getUpdate = function() {
	return JSON.stringify({
	    "turn": this.turn,
	    "board": this.board.line,
	    "stock": this.board.stock,
	    "count": this.board.count,
	    "winner": this.winner
	});
    }
    GAME[nick]=gameID;
}

module.exports.getGame = function(gameID) {
    return GAMES[gameID];
}

module.exports.deleteGame = function(gameID) {
    GAMES[gameID] = undefined;
    return;
}

module.exports.generateHands = function() {
    let hand = [];
    hand[0] = [];
    hand[1]= [];
    hand[2]= [];
    let piece;
    let index = -1;
    PIECES = [[6,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
	      [5,5],[5,4],[5,3],[5,2],[5,1],[5,0],
	      [4,4],[4,3],[4,2],[4,1],[4,0],
	      [3,3],[3,2],[3,1],[3,0],
	      [2,2],[2,1],[2,0],
	      [1,1],[1,0],
	      [0,0]];

    for (let j=0;j<2;j++) {
	for (let i = 0;i<=7;i++) {
	    index = Math.floor(Math.random() * PIECES.length);
	    piece = PIECES[parseInt(index)];
	    PIECES.splice(index, 1); 
	    hand[j].push(piece);
	}
    }
    hand[2] = PIECES;

    
    return hand;
}

module.exports.getHighestPiece = function(arr) {
    let highestValue = 0;
    let currentValue = 0;
    for (let i=0;i<arr.length;i++) {
	currentValue = arr[i][0] + arr[i][1];
	if (currentValue > highestValue)
	    highestValue = currentValue;
    }
    return highestValue;
}


module.exports.getPieceIndex = function(piece,array) {
    for (let i=0;i<array.length;i++) {
	if (array[i][0]==piece[0] && array[i][1]==piece[1])
	    return i;
    }
    return -1;
}

module.exports.takeRandomPiece = function(gameID) {
    
    let p = GAMES[gameID].board.stockPieces;

    let index = Math.floor(Math.random() * p.length);
    let piece = p[index];
    p.splice(index, 1);
    return piece;
}

