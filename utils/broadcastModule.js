
let ws=require("ws");
let fs=require("fs")
let sessionStorage=[]

let broadcaster={
    startBroadcaster:()=>{
        let wss=new ws.Server({port:5505})
        wss.on("connection",(session)=>{
            sessionStorage.push(session)
            let read_files=fs.readFileSync("./dataLog/pendingTxStats.chirp",{encoding:"utf-8"});
            // update user tx logs 
            session.send(JSON.stringify(read_files,null,3))
            console.log("get connection")
        })
        console.log("broadcasting server up and running")
    },

    // function to send transaction data 
    broadcastData:(_data)=>{
        sessionStorage.forEach((sessions)=>{
            sessions.send(JSON.stringify(_data))
        })
    },

    waitForTxResponse:()=>{
        sessionStorage[0].on("message",(data)=>{
            return JSON.parse(data)
        })
    }

}

module.exports=broadcaster;