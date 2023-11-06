let express=require("express")
let app=express();
let serverPort=5000;
let cors=require("cors");

app.use(cors())
app.use(express.static("public"));

app.get("/",(req,res)=>{
    res.status(200).sendFile("./public/index.html")
})

app.listen(serverPort,()=>{
    console.log("client server is running")
})