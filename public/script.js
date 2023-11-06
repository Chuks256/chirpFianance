let d=document.querySelector(".app")
let ws=new WebSocket("ws://localhost:5505");



window.onload=()=>{
    ws.onopen=()=>{
        console.log("connected to broadcaster server")
    }
    ws.onmessage=function(msg){
        console.log(msg)
        let y=JSON.parse(msg.data)
            d.innerHTML=y
    }
}

ws.onmessage=function(msg){
    alert(msg)
}

