//  import required modules 
require("dotenv").config()
let express=require("express")
let app=express();
let mysql_module=require("./config/dbConfig")
let serverPort=4040 || process.env.PORT;
let environment=process.env.NODE_ENV
let cors=require("cors")
let bodyParser=require("body-parser");

// import routes
let routesHandlerModules=require("./routeHandle/routesHandler")

// initialize route handler modules 
let routeModule=new routesHandlerModules();

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
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(express.json())

// setup up secure route 
app.get(`/test/${process.env.API_VERSION}`,(req,res)=>{
    res.status(200).json({msg:"All is well -> friends"})  
})
app.post(`/${process.env.API_VERSION}/signup`,routeModule.signup)
app.get(`/${process.env.API_VERSION}/signin`,routeModule.signin)
app.post(`/${process.env.API_VERSION}/buyChirp`,routeModule.requestToBuyChirp)
app.post(`/${process.env.API_VERSION}/sellChirp`,routeModule.requestToSellChirp)
app.get(`/${process.env.API_VERSION}/gellAllTransaction`,routeModule.gellAllTransaction)
app.get(`/${process.env.API_VERSION}/checkBalance`,routeModule.checkUserBalance)
app.post(`/${process.env.API_VERSION}/transferChirp`,routeModule.transferChirp)
app.get(`/${process.env.API_VERSION}/getUserProfile`,routeModule.getUserProfile)

// make server listen 
app.listen(serverPort,()=>{
    console.log(`${environment} server is running @ ${serverPort}`)
})
