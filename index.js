//  import required modules 
require("dotenv").config()
let express=require("express")
let app=express();
let mysql_module=require("./config/dbConfig")
let serverPort=4040 || process.env.PORT;
let environment=process.env.NODE_ENV
let cors=require("cors")
let bodyParser=require("body-parser");
let fs=require("fs")
let broadcasterModule=require("./utils/broadcastModule")


// import routes
let routesHandlerModules=require("./routeHandle/routesHandler")

// initialize route handler modules 
let routeModule=new routesHandlerModules();

// initialize websocket
broadcasterModule.startBroadcaster();


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

// test routes 
app.get(`/test/${process.env.API_VERSION}`,(req,res)=>{
    res.status(200).json({msg:"All is well -> friends"})  
})

// getter routes 
app.get(`/${process.env.API_VERSION}/signin`,routeModule.signin)
app.get(`/${process.env.API_VERSION}/getUserTransaction`,routeModule.getUserTransaction)
app.get(`/${process.env.API_VERSION}/gellAllProcessorTransaction`,routeModule.gellAllProcessorTransaction)
app.get(`/${process.env.API_VERSION}/checkBalance`,routeModule.checkUserBalance)
app.get(`/${process.env.API_VERSION}/getUserProfile`,routeModule.getUserProfile)
app.gett(`/${process.env.API_VERSION}/adminGetAllTx`,routeModule.adminGetAllTransaction)

// post routes 
app.post(`/${process.env.API_VERSION}/signup`,routeModule.signup)
app.post(`/${process.env.API_VERSION}/buyChirp`,routeModule.requestToBuyChirp)
app.post(`/${process.env.API_VERSION}/sellChirp`,routeModule.requestToSellChirp)
app.post(`/${process.env.API_VERSION}/transferChirp`,routeModule.transferChirp)
app.post(`/${process.env.API_VERSION}/adminToggleUserTx`,routeModule.adminToggleTransaction)


// make server listen 
app.listen(serverPort,()=>{
    console.log(`${environment} server is running @ ${serverPort}`)
})
