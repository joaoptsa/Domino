const fechar = document.querySelector('.fechar');
const regras = document.querySelector('.regras');
const score  = document.querySelector('.score');
const modelo = document.querySelector('.modelo');
const regrasid = document.getElementById('regras');
const scoreid = document.getElementById('score');
const form =document.querySelector('.conf');
const play = document.getElementById('go');
const escolher = document.getElementById('escolher');
const des = document.querySelector('.desenho');
const deck = document.querySelector('.monte');
const restart1 = document.querySelector('.reniciar');
const restart2 = document.querySelector('.reniciar2');
const pass = document.querySelector('.pass');
const desistir = document.getElementById('desistir');
const user = document.querySelector('.user');
var opponent = document.querySelector('.adversario');
const boasvidas = document.querySelector('.boasvidas');
const login = document.getElementById("login_button"); 
const bleave=document.getElementById("leave");


let USERNAME="";
let PASSWORD="";
const GROUP = 2012068009901;
let GAME_ID="";
const URL = "http://localhost:5000/"; 

document.getElementById("leave_btn").disabled=true;
document.getElementById("go").disabled=true;


bleave.onclick=function(){
    
    logout();
    
    document.getElementById("loginIn").innerHTML ="";
    document.getElementById("cont").style.display= "block";
    document.getElementById("leave").style.display= "none";
    document.getElementById("boneco").style.display= "none";

}


login.onclick=function(){
    loginServer();
    document.getElementById('informação').innerHTML ="";
    }



desistir.onclick=function(){
    
    form.style.display= "block";
    pass.style.display = 'none';
    desistir.style.display = 'none';
    deck.style.display = 'none';
    boasvidas.style.display = 'block';
    restart2.style.display="none";
    remover_desistir();
    
}


document.getElementById("leave_btn").onclick=function() {
    leaveGame();
}


play.onclick=function(){
    document.getElementById("go").disabled=true;
    document.getElementById("leave_btn").disabled=false;
    boasvidas.style.display = 'none';
	joinGame();
	}
    

scoreid.onclick = function(){
    modelo.style.display = 'block';
    score.style.display = 'block';
    getRanking();
}

regrasid.onclick = function(){
    modelo.style.display = 'block';
    regras.style.display = 'block';
}

fechar.onclick = function(){
    modelo.style.display = 'none';
    score.style.display = 'none';
    regras.style.display = 'none';
}



///////////////////////////////canvas//////////////////////////////////////////////////////////


function boneco() {
    
    var boneco = document.getElementById('boneco');
    var t = boneco.getContext('2d');
    t.fillStyle = "#7FFF00";
    t.beginPath();
    t.arc(75, 75, 50, 0, Math.PI * 2,       true); 
    t.closePath();
    t.fill();
    // Círculo exterior
    t.fillStyle = "#3370d4";
    t.beginPath();
    
    t.moveTo(110, 75);
    t.arc(75, 75, 35, 0, Math.PI, false);
    // Boca (sentido horário)
    t.moveTo(65, 65);
    t.arc(60, 65, 5, 0, Math.PI * 2, true);  // Olho esquerdo
    
    t.moveTo(90, 60);
    
    t.arc(90, 65, 5, 0, Math.PI * 2, true);  // Olho direito
    t.stroke();
}




