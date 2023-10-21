//  import required modules 
require("dotenv").config()
let express=require("express")
let app=express();
let mysql_module=require("./config/dbConfig")
let serverPort=4040 || process.env.PORT;
let environment=process.env.NODE_ENV
let cors=require("cors")
let bodyParser=require("body-parser");

// acquire connection from database 
mysql_module.getConnection((err)=>{
    if(err){
        throw new Error(err)
    }
    else{
        console.log("successfully connected to the database [ all is well]")
    }
})

// setup middle ware 
app.use(cors())
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.json())

// setup up secure route 
app.get(`/test/${process.env.API_VERSION}`,(req,res)=>{
    res.status(200).json({msg:"All is well -> frienc"})  
})


app.listen(serverPort,()=>{
    console.log(`${environment} server is running @ ${serverPort}`)
})
