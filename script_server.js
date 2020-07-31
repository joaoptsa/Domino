var url ="http://localhost:5000/"; 
var username = "";
var password = "";

//let onlineMode=false;
let hand = [];

function loginServer() {
    
    var username = document.getElementById("input_name").value;
    var password = document.getElementById("input_password").value;   
    let json = JSON.stringify({"nick": username,"pass": password});
    
    postData(URL + "register", json)
	.then(data => {
	    console.log(JSON.stringify(data));
	    
	    if(data.error == undefined) {
		USERNAME = username;
		PASSWORD= password;
		document.getElementById("loginIn").innerHTML = "Bem vindo  " + USERNAME;
		document.getElementById("cont").style.display= "none";
		document.getElementById("leave").style.display= "block";
		document.getElementById("boneco").style.display= "block";
		boneco();
		document.getElementById("go").disabled=false;
		}
	    else
	    {
		document.getElementById("loginIn").innerHTML = "Erro. Username ou password incorrectos.";
	    document.getElementById("go").disabled=true;
	    }
	})
	.catch(console.log);
    }

let stock_n=14 ;

function joinGame(){
    
    let json = JSON.stringify({"group": GROUP, "nick": USERNAME, "pass": PASSWORD});
    
    postData(URL + "join", json)  
	.then(function (tmp){
	    console.log(tmp);
	    hand = tmp.hand;
	    console.log(typeof(tmp));
	    printHand();
	    GAME_ID = tmp.game;
	    update();
	});
}

function leaveGame() {
    let json = JSON.stringify({"game": GAME_ID, "nick": USERNAME, "pass": PASSWORD, "logout": false});
    postData(URL + "leave", json)
	.then(function (tmp){
	    document.getElementById("go").disabled=false;
	    document.getElementById("leave_btn").disabled=true;

	});
    }

function logout() {
    let json = JSON.stringify({"game": GAME_ID, "nick": USERNAME, "pass": PASSWORD, "logout": true});
    postData(URL + "leave", json)
	.then(function (tmp){
	    document.getElementById("go").disabled=true;
	    document.getElementById("leave_btn").disabled=true;

	});
    
}


function printHand() {
    document.getElementById("hand").innerHTML ="";
    if (hand!=null) {
	for (i = 0; i < hand.length; i++) {
	    pieceCode = getPieceCode(hand[i]);
	    let btn = document.createElement("span");
	    btn.id="["+hand[i][0]+","+hand[i][1]+"]";
	    btn.className="piece";
	    btn.onclick = function(){
		let side;
		if (confirm("Jogar no inicio?  ok->sim cancel->fim da fila")) {
		    side = "start";
		} else {
		    side = "end";
		}
		notify(JSON.parse(btn.id), side, false);	
	    };    
	    btn.innerHTML = pieceCode;
	    document.getElementById("hand").appendChild(btn);    
	}
	
	let getNewPiece_btn = document.createElement("button");
	
	if (stock_n>0) {
	    getNewPiece_btn.innerHTML = "Tirar do stock (" + stock_n +")";
	    getNewPiece_btn.onclick = function() {
		notify(null,null,false);	
	    };	    
	}
	else {
	    getNewPiece_btn.innerHTML = "Passar";
	    getNewPiece_btn.onclick = function() {
		notify(null,null,true);	
	    };
	}
	
	document.getElementById("hand").appendChild(getNewPiece_btn); 	
    }
}

function getPieceCode(piece) {
    return " &#"+ (127025 + piece[0]*7 + piece[1]);
}


function disableHand() {
    var nodes = document.getElementsByClassName("piece");
    for(var i=0;i<nodes.length; i++) {
	nodes[i].onclick=null;
    }       
}

function notify(piece, side, skip=false) {
    let json;
    if (skip==true) //passar
	json = JSON.stringify({"nick": USERNAME, "pass": PASSWORD, "game": GAME_ID, "skip":true});	
    else 
    if (piece==null) //tirar do stock
	json = JSON.stringify({"nick": USERNAME, "pass": PASSWORD, "game": GAME_ID, "piece":null});
    else //jogada normal
	json = JSON.stringify({"nick": USERNAME, "pass": PASSWORD, "game": GAME_ID, "piece":piece, "side":side});
    
    postData(URL + "notify", json)  
	.then(function (tmp){
	    console.log(tmp);
	    
	    if (skip==false && piece!=null) { //jogada normal
		if (Object.keys(tmp).length==0) { //resposta vazia, jogada foi aceite
		    for (i=0;i<hand.length;i++) {
			if (hand[i].toString()==piece) {
			    hand.splice(i,1);
			}
		    }
		    printHand();
		    start_wait_animation();
		}
	    }
	    if (piece==null) {//tirar do stock
		tmp = JSON.parse(tmp);
		
		if (tmp.piece!=undefined) {
		    
		    hand.push(tmp.piece);
		    printHand();
		}	
	    }
	    if (tmp["error"]!=undefined)
		alert(tmp["error"]);
	});
    
}

function printWinner(player) {
    if (USERNAME == player)
	alert("Congratulations, you won!");
    else if (player==null || player == undefined)
	alert("Draw");
    else
	alert("Sorry, you lost");
}

function printGame(line) {
    document.getElementById("board").innerHTML ="";
    for (i=0;i<line.length;i++) {
	pieceCode = getPieceCode(line[i]);
	let piece = document.createElement("span");
	piece.className="piece";
	piece.innerHTML = pieceCode;
	document.getElementById("board").appendChild(piece);    
    }
}

let tmp;
function update(){
    let url = URL + "update?nick=" + USERNAME + "&game=" + GAME_ID;
    var evtSource = new EventSource(url);
    evtSource.onmessage = function(e){
	console.log("EVENT SOURCE (CLIENT)");
	console.log(e.data);
	console.log(JSON.stringify(e.data));
	tmp = JSON.parse(e.data);
		
	if(tmp["error"]) {
	    alert(tmp["error"]);
	}
	
	if (tmp["turn"]==USERNAME)
	    stop_wait_animation();
	
	if (tmp["board"]!=undefined) {
	    if (tmp["board"]!=undefined) {
		printGame(tmp["board"]); //ok
	    }
	    if (tmp["stock"]!=undefined) {
		stock_n = tmp["stock"];
		printHand();
//		printBlackPieces(stock_n, "stock");
	    }
	    if (tmp["count"]!=undefined) { //isto não existe
		for (var key in tmp["count"]) {
		    if (key!=USERNAME)
			printBlackPieces(tmp["count"][key], "opponentHand");
		}
	    }
	}
	
	if (typeof(tmp["winner"])!="undefined") {
	    printWinner(tmp["winner"]);
	    cleanGameTable();
	    leaveGame();
	    evtSource.close();	    
	}
    }
}


function cleanGameTable() {
    hand = [];
    document.getElementById("hand").innerHTML ="";
    document.getElementById("opponentHand").innerHTML ="";
    document.getElementById("board").innerHTML ="";
    document.getElementById("go").disabled=false;
    document.getElementById("leave_btn").disabled=true;
    stop_wait_animation();
    
}

function printBlackPieces(n, position) {
    document.getElementById(position).innerHTML = "";
    for (i=0;i<n;i++) {
	let slot = document.createElement("div");
	slot.id="slot_" + position +  i;
	let span_ = document.createElement('span')
	span_.innerHTML ="&#127024;";
	slot.appendChild(span_);
	document.getElementById(position).appendChild(slot);    
    }  
}


function start_wait_animation() {   
    var div = document.createElement("div");
    div.id = "waiting";
    var c = document.createElement("canvas");
    c.id = "waitingAnimation";
    c.height = 320;
    c.length = 100;
    
    div.appendChild(c);
    document.body.appendChild(div);
    
    var context = c.getContext('2d');
    var start = new Date();
    var l = 90,
	cW = context.canvas.width,
	cH = context.canvas.height;
    
    var draw = function() {
	var rotation = parseInt(((new Date() - start) / 1000) * l) / l;
	context.save();
	context.clearRect(10, 10, cW, cH);
	context.translate(cW / 2, cH / 2);
	context.fillText("Waiting ...", -25, 0);
	context.rotate(Math.PI * 2 * rotation);
	context.fillStyle = "#FF0000";
	context.fillRect(0, 0, 1, 15);
	for (let i = 0; i < l; i++) {
            
            context.beginPath();
            context.rotate(Math.PI * 2 / l);
            context.moveTo(cW / 10, 0);
            context.lineTo(cW / 4, 0);
            context.strokeStyle = "rgba(0,125,125," + i / l + ")";
            context.stroke();
	}
	context.restore();
	
    };
    window.setInterval(draw, 1000 / 30);
}

//GET RANKING

function getRanking(){
    fetch(URL + "ranking",{
        method: "POST",
        body: JSON.stringify(""),
    })
        .then(function (r){
            return r.json();
        })
        .then(function (t){
            ranking(t);
        });
}

function ranking(t)
{
    //alert(t);
    info = t.ranking;
    tmp = document.getElementById("rankingBoard");
    tmp.innerHTML="";
    for (var i in t.ranking) {
        if(i==10) return;
        
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        
        td.setAttribute("class","centerTable");
        td.innerHTML = info[i].nick;
        tr.appendChild(td);
        td = document.createElement('td');
        
        td.setAttribute("class","centerTable");
        td.innerHTML = info[i].victories;
        tr.appendChild(td);
        
        td = document.createElement('td');
        td.setAttribute("class","centerTable");
        td.innerHTML = info[i].games;
        tr.appendChild(td);
        
        tmp.appendChild(tr);
    }
}


function stop_wait_animation(){
    let  divA = document.getElementById("waiting");
    if (divA!=null)
	divA.parentNode.removeChild(divA);
}

//printHand();


let json = JSON.stringify( {
    nick:"nick1",
    pass:"pass1"
});

function postData(url,data = {}){
    return fetch(url,{
	method: "POST",
	cache: "no-cache",
	body:data,
    })
	.then(response => response.json())
	.catch(console.log);
}


var popit = true;
window.onbeforeunload = function() { 
    if(popit == true) {
        popit = false;
        return "Are you sure you want to leave?"; 
    }
}
