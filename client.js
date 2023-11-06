let wsss=require("ws");
let client=new wsss("ws://localhost:5505");

client.onopen=()=>{
    console.log("connected to server")
}

client.on("message",(data)=>{
    let sanitizeData=data
    // if(sanitizeData.type=="ADMIN_VALIDATE"){
    //     console.log("admin")
    // }
    // else{
    //     console.log("user")
    // }
    console.log(JSON.parse(data))
})

