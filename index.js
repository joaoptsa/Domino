const http = require('http');
const fs = require('fs');
const { parse } = require('querystring');
const crypto = require('crypto');
const model = require('./gameModel.js');
let url = require('url');

const REQUESTS = ["/register", "/leave", "/notify", "/ranking", "/register", "/update", "/"];
const STATIC_CONTENT = ["/index.html", "/index.js", "/script.js", "/script_server.js", "/style.css", "/"];
const USERS_FILE = "users.json";
const RANKING_FILE = "ranking.json";

const HEADERS = {
    html: {
	'Content-Type': 'text/html'
    },
    css: {
	'Content-Type': 'text/css'
    },  
    
    plain: {
	'Content-Type': 'application/javascript',
	'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
	'Cache-Control': 'no-cache',
	'Access-Control-Allow-Origin': '*' },
    sse: { 'Content-Type': 'text/event-stream',
	   'Cache-Control': 'no-cache',
	   'Access-Control-Allow-Origin': '*',
	   'Connection': 'keep-alive' }
};

const Port1=5000
// const Port2=8106
 server = http.createServer(function (request, response) {
     let body = '';
     let parsedBody = {};
     
    switch(request.method) {

    case "POST":
	request.on('data', chunk => {
            body += chunk.toString();
	});
	request.on('end', () => {
            console.log(
		parse(body)
            );	    
	    parsedBody = JSON.parse(body);
	    return processPOSTRequest(request,response, parsedBody);
	});
	break;
    case "GET":
	return processGETRequest(request,response);
    default:
	return doResponse(501, 'plain', {"error": "Invalid request"},request,response);	
    }
});
server.listen(5000);				 

function processGETRequest(request,response) {
    const parsedUrl = url.parse(request.url,true);
    const query     = parsedUrl.query;

    if(parsedUrl.pathname=='/update') {
	if (query.nick==undefined || query.game==undefined) 
	    return doResponse(401, 'plain', { "error": "Wrong parameters"}, request, response);
	else {   
	    response.writeHead(200, HEADERS['sse']);   
	    let gameID = query.game;
	    let nick = query.nick;
	    
	    let updateResponse = setInterval(function() {
		if (model.getGame(gameID)!=undefined){
		    response.write('data: ' + model.getGame(gameID).getUpdate() + '\n\n');
		    if (typeof(model.getGame(gameID).winner)!="undefined") { //there's a winner. game ended. 
			clearInterval(updateResponse); //Stops sending SSEs
			setTimeout(function() {
			    if (model.getGame(gameID)!=undefined) {
				model.delGameAssignedToNick(model.getGame(gameID).player1.nick);
				model.delGameAssignedToNick(model.getGame(gameID).player2.nick);
				model.deleteGame(gameID);
			    }
			},4000);  //removes the game after 4 seconds so both ends can receive the update with the winner.
		    }
		}
		else
		    clearInterval(updateResponse);
	    }, 1000); //sends an update every second
	}
    }

    else if (STATIC_CONTENT.includes(parsedUrl.pathname)) { //serves static content
	if (parsedUrl.pathname=="/") //redirects / to index.html
	    pathFile = "./index.html"; 
	else
	    pathFile = "." + parsedUrl.pathname;

	console.log("serving " + parsedUrl.pathname);
	console.log(pathFile);
	
	if (pathFile.endsWith(".css")) 
	    response.writeHead(200, HEADERS['css']);
	else if (pathFile.endsWith(".html"))
	    response.writeHead(200, HEADERS['html']);
	else if (pathFile.endsWith(".js"))
	    response.writeHead(200, HEADERS['js']);
	else
	    response.writeHead(200, HEADERS['plain']);

	fs.readFile(pathFile, function (err,data ) {
	    response.write(data),
	    response.end();
	});
    }
    else {
	return doResponse(404, 'plain', { "error": "Not found"}, request, response);
    }
}
    
function processPOSTRequest(request,response, parsedBody) {
    let reqURL=request.url;

    switch(reqURL) {
    case ("/join"):
	return processJoin(request,response, parsedBody);
    case ("/leave"):
	return processLeave(request,response, parsedBody);
    case ("/notify"):
	return processNotify(request,response, parsedBody);
    case ("/ranking"):
	return processRanking(request,response, parsedBody);
    case ("/register"):
	return processRegister(request,response, parsedBody);
    default:
	return doResponse(404, 'plain',  {'error': 'Invalid request'}, request, response);
    }
}

function registerUser(username,password) {
    let salt = crypto.randomBytes(16).toString('hex');
    let hashedPassword = cypher(password,salt);
    return { "pass": hashedPassword, "salt": salt };
}

function cypher(password, salt) {
    let hash = crypto.createHmac('sha512', salt); 
    hash.update(password);
    return hash.digest('hex');
}

function isAuth(nick,pass) {
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (nick in users)
	if (users[nick].pass === cypher(pass, users[nick].salt))
	    return true;
    return false;
}

function processRegister(request,response, parsedBody) {
    let nick = parsedBody["nick"];
    let pass = parsedBody["pass"];
    
    if (parsedBody["nick"]==undefined || parsedBody["pass"]==undefined || Object.keys(parsedBody).length!=2)
	return doResponse(400, 'plain', { "error": "Wrong arguments"}, request,response);
    
    if (model.getLoggedInUsers().includes(nick))
	return doResponse(400, 'plain', { "error": "User already logged in"}, request,response);
        
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); 	//read user & pass
    
    if (!(nick in users)) { 
	console.log("registering " + nick);
	users[nick]= registerUser(nick,pass);
	model.addLoggedInUser(nick);
	fs.writeFileSync(USERS_FILE,JSON.stringify(users));
	return doResponse(200, 'plain', {}, request,response);
    }
    else if (users[nick].pass===cypher(pass, users[nick].salt)) { //login
	console.log("login " + nick);
	model.addLoggedInUser(nick);
	return doResponse(200, 'plain', {}, request,response);
    }
    return doResponse(401, 'plain', { "error": "User registered with a different password"}, request,response);
}


function processJoin(request,response, parsedBody) {   
    if (parsedBody["nick"]==undefined || parsedBody["pass"]==undefined || parsedBody["group"]==undefined || !(Object.keys(parsedBody).length==3))
	return doResponse(400, 'plain', { "error": "Wrong arguments"}, request,response);

    let groupID = parsedBody["group"], nick = parsedBody["nick"], pass = parsedBody["pass"];
    
    if (!isAuth(nick,pass))
	return doResponse(401, 'plain', {"error": nick + " is registered with a different password"}, request,response);
    
    if (!(model.getLoggedInUsers().includes(nick)))  //user must be logged in, otherwise 401.
	return doResponse(401, 'plain', { "error": nick + " is not logged in"}, request,response);
    
    if (model.getUserWaiting()==undefined && model.getGameAssignedTo(nick)==undefined) { //no one is waiting to play. User will wait. GameID and hands are defined.
	model.setUserWaiting(nick);
	let HANDS = model.generateHands();
	
	let gameID = crypto
	    .createHash('md5')
	    .update(nick + new Date().toString())
	    .digest('hex');   
	
	model.assignGameToNick(nick, gameID);
	model.buildGameObject(gameID, HANDS, nick, pass);
	
	let msg = {"game": gameID, "hand": model.getGame(gameID).player1.hand};	    
	return doResponse(200, 'plain', msg, request, response); //returns gameID and hand.
	
    }
    else if (nick != model.getUserWaiting() && model.getGameAssignedTo(nick)==undefined){ //there's someone waiting to play a game. User will join that game.
	let gameID = model.getGameAssignedTo(model.getUserWaiting());
	model.assignGameToNick(nick, gameID);
	model.setUserWaiting(undefined);
	
	model.getGame(gameID).player2.nick=nick;
	model.getGame(gameID).player2.pass=pass;
	model.getGame(gameID).board.count[nick] = model.getGame(gameID).player2.hand.length;
	
	if(model.getHighestPiece(model.getGame(gameID).player2.hand) >model.getHighestPiece(model.getGame(gameID).player1.hand)) {
	    model.getGame(gameID).turn = nick;
	    model.getGame(gameID)._side="player2";
	}
	else{
	    model.getGame(gameID).turn = model.getGame(gameID).player1.nick;
	    model.getGame(gameID)._side="player1";
	}
	
	let msg = {"game": gameID, "hand": model.getGame(gameID).player2.hand};
	return doResponse(200, 'plain', msg, request,response);
    }
    else {
	console.log("- " + model.getUserWaiting());
	console.log("- " + model.getGameAssignedTo(nick));
	return doResponse(400, 'plain', { "error": nick + " is already playing game " + model.getGameAssignedTo(nick)}, request,response);
    }
}


function processNotify(request,response, parsedBody) {

    if (parsedBody["nick"]==undefined  || parsedBody["pass"]==undefined || parsedBody["game"]==undefined  )
	doResponse(400, 'plain', { "error": "Wrong arguments"}, request,response);
    else {
	let gameID = parsedBody["game"];
	let nick   = parsedBody["nick"];
	let pass   = parsedBody["pass"];
	let piece  = parsedBody["piece"];
	let side   = parsedBody["side"];
	let skip   = parsedBody["skip"];
	let msg    = {};
	let index=-1;

	let error = undefined;

	if (!isAuth(nick,pass))
	    return doResponse(401, 'plain', {"error": nick + " is registered with a different password"}, request,response);
	
	if (!(model.getLoggedInUsers().includes(nick)))
	    error = { "error": nick + " is not logged in"};

	else if (!(model.getGame(gameID).turn==nick))
	    error =	{ "error": "Not your turn to play" };
	
	else if ((Array.isArray(piece))) {
	    if (piece[0]<0 || piece[0]>6 || piece[1]<0 || piece[1]>6)
		error =		{ "error": "Invalid piece" }
	    else if (!(piece.length==2)) 
		error =		{ "error": "Piece should have 2 items" }
	    else if (model.getPieceIndex(piece,model.getGame(gameID)[model.getGame(gameID)._side].hand)==-1) //gameID.player1.hand or gameID.player2.hand
		error =		{ "error": "Invalid play - you don't have this piece." }
	}	
	else if (!(piece==null))
	    error =	{ "error": "Piece is not an array" };
	
	if (error!=undefined)
	    return doResponse(401, 'plain', error, request,response);

	let _side = model.getGame(gameID)._side;
	let code = 400;

	if (skip==true) {
	    if (model.getGame(gameID).board.piece=="skip") { //last play was also a skip. two consecutive skips = draw.
		model.getGame(gameID).winner=null;
		updateRanking(RANKING_FILE, model.getGame(gameID).player1.nick,model.getGame(gameID).player2.nick);
	    }
	    
	    else if (model.getGame(gameID)._side=="player1") { 
		model.getGame(gameID)._side="player2"; 
		model.getGame(gameID).turn= model.getGame(gameID)["player2"].nick; 
	    }
	    else{
		model.getGame(gameID)._side="player1"; 
		model.getGame(gameID).turn= model.getGame(gameID)["player1"].nick; 
	    }
	    model.getGame(gameID).board.piece= "skip";
	    
	    return doResponse(200, 'plain', {}, request,response);
	}

	if (piece==null) { //tirar do monte
	    if (model.getGame(gameID).board.stock>0){
		let p = model.takeRandomPiece(gameID);
		model.getGame(gameID)[_side].hand.push(p);
		model.getGame(gameID).board.count[nick]+=1;
		model.getGame(gameID).board.stock-=1;
		model.getGame(gameID).board.piece= piece; 
		

		msg = {"piece": p};
		code = 200;
	    }

	    else {
		if (model.getGame(gameID)._side=="player1") { 
		    model.getGame(gameID)._side="player2"; 
		    model.getGame(gameID).turn= model.getGame(gameID)["player2"].nick; 
		}
		else{
		    model.getGame(gameID)._side="player1"; 
		    model.getGame(gameID).turn= model.getGame(gameID)["player1"].nick; 
		}			
		msg = {};
		code = 200;	
	    }
	    return doResponse(code, 'plain', JSON.stringify(msg), request,response);
	}


	else {
	    if (model.getGame(gameID).board.line==undefined) { //primeira jogada. Não há nada na linha de jogo
		model.getGame(gameID).board.line = [piece];
	    }

	    else {
		let pieceBoard ={}; 
		pieceBoard["start"] = model.getGame(gameID).board.line[0][0]; 
		pieceBoard["end"]   = model.getGame(gameID).board.line[model.getGame(gameID).board.line.length-1][1];
		
		if (piece[0]!=pieceBoard[side] && piece[1]!=pieceBoard[side]) {		    
		    return doResponse(401, 'plain', { "error": "Invalid play" }, request,response);
		}
		else {
		    if (piece[0]==pieceBoard[side] && side=="start")
			model.getGame(gameID).board.line.unshift([piece[1],piece[0]]); // [X,Y] -> [Y,X]
		    else if (piece[1]==pieceBoard[side] && side=="start")
			model.getGame(gameID).board.line.unshift(piece); // [X,Y] -> [X,Y]
		    else if (piece[0]==pieceBoard[side] && side=="end")
			model.getGame(gameID).board.line.push(piece); // [X,Y] -> [X,Y]
		    else if (piece[1]==pieceBoard[side] && side=="end")
			model.getGame(gameID).board.line.push([piece[1],piece[0]]); // [X,Y] -> [Y,X]
		}
	    }
	    model.getGame(gameID).board.piece= piece; 
	    model.getGame(gameID).board.side= side; 
	    model.getGame(gameID).board.count[nick]-=1;

	    if (model.getGame(gameID).board.count[nick]==0) {
		model.getGame(gameID).winner=nick;
		updateRanking(RANKING_FILE, model.getGame(gameID).player1.nick,model.getGame(gameID).player2.nick);
	    }
	    
	    model.getGame(gameID)[_side].count-=1; 
	    index = model.getPieceIndex(piece,model.getGame(gameID)[_side].hand); 
	    model.getGame(gameID)[_side].hand.splice(index,1); 
	    if (model.getGame(gameID)._side=="player1") { 
		model.getGame(gameID)._side="player2"; 
		model.getGame(gameID).turn= model.getGame(gameID)["player2"].nick; 
	    }
	    else{
		model.getGame(gameID)._side="player1";  
		model.getGame(gameID).turn= model.getGame(gameID)["player1"].nick; 
	    }			
	    return doResponse(200, 'plain', {}, request,response);
	}
    }
}

function processLeave(request,response, parsedBody) { 
    if (parsedBody["nick"]==undefined || parsedBody["pass"]==undefined || parsedBody["game"]==undefined || parsedBody["logout"]==undefined || !(Object.keys(parsedBody).length==4))
	return doResponse(400, 'plain', { "error": "Wrong arguments"}, request,response);
    
    let game = parsedBody["game"];
    let nick = parsedBody["nick"];
    let pass = parsedBody["pass"];
    let logout = parsedBody["logout"];


    console.log("1. " + game + " " + nick + " " + pass);
    console.log("2. " + model.getLoggedInUsers());
    console.log("3. " + model.getGame(game));

    
    if (!isAuth(nick,pass))
	return doResponse(401, 'plain', {"error": nick + " is registered with a different password"}, request,response);


    if (!(model.getLoggedInUsers().includes(nick)))
	return doResponse(401, 'plain', { "error": nick + " is not logged in"}, request,response);

    if (game=="") { //There's not a game going on. User logout
	console.log("logout " + nick);
	model.delLoggedInUser(nick);
	return doResponse(200, 'plain', {}, request,response);
    }
    
    if (model.getGame(game)!=undefined) { 
	if (model.getGame(game).player1.nick==undefined || model.getGame(game).player2.nick==undefined) { //Either Player1 or Player2 are not playing the game.
	    model.getGame(game).winner=null; //Not playing with anyone. Game ends in draw.
	}
    
	else if (model.getGame(game).player1.nick===nick) { //There's a game going on between Player1 and Player2. Player1 is leaving - Player2 wins the game
	    model.getGame(game).winner = model.getGame(game).player2.nick;
	    updateRanking(RANKING_FILE, winner=model.getGame(game).winner, loser=model.getGame(game).player1.nick);
	    console.log("B. " + model.getGame(game).winner);
	}
	else if (model.getGame(game).player2.nick===nick) { //there's a game going on between Player1 and Player2. Player2 is leaving - player1 wins the game.
	    model.getGame(game).winner = model.getGame(game).player1.nick;
	    updateRanking(RANKING_FILE, winner=model.getGame(game).winner, loser=model.getGame(game).player1.nick);
	    console.log("C. " + model.getGame(game).winner);
	}
	
	let msg = {"winner": model.getGame(game).winner};

	if (model.getUserWaiting() == nick) {	   
	    model.setUserWaiting(undefined);
	}
	if (logout)
	    model.delLoggedInUser(nick);
	
	return doResponse(200, 'plain', msg, request,response);
    }
}

function processRanking(request,response, parsedBody) {
    let RANKING = JSON.parse(fs.readFileSync(RANKING_FILE, 'utf8'));
    return doResponse(200, 'plain', RANKING, request,response);       
}

function updateRanking(rankingFile, winner, loser) {
    let RANKING = JSON.parse(fs.readFileSync(rankingFile, 'utf8'));   
    let winnerFound, loserFound = false;
    
    if (!(RANKING["ranking"]==undefined)) {
	for (let i=0;i<RANKING["ranking"].length;i++) {
	    if (RANKING["ranking"][i].nick===winner) {
		RANKING["ranking"][i].games+=1;
		RANKING["ranking"][i].victories+=1;
		winnerFound=true;
	    }
	    if (RANKING["ranking"][i].nick===loser) {
		RANKING["ranking"][i].games+=1;	
		loserFound = true;
	    }
	}
	if (!winnerFound) {
	    RANKING["ranking"].push({"nick":winner, "victories":1, "games":1});
	}
	if (!loserFound) {
	    RANKING["ranking"].push({"nick":loser, "victories":0, "games":1});
	}	
	RANKING["ranking"].sort((a, b) => (b.victories > a.victories) ? 1 : -1);
	fs.writeFileSync(rankingFile,JSON.stringify(RANKING));
    }
}

function doResponse(code, header, message, request, response) {
    response.writeHead(code, HEADERS[header]);
    response.write(JSON.stringify(message) +"\n\n");
    if (header=='plain')
	response.end();
}
