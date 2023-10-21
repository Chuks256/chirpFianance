//  import required modules 
require("dotenv").config();
let db_handler=require("../config/dbConfig");
let processor_handler=require("../coreFile/processor");
let jwt=require('jsonwebtoken');
let c=require("crypto")
let envProcessor=require("../utils/processorEnv")

class routeHandler{
    constructor(){}

    signup(req,res){
        let generateId=c.randomBytes(3).toString("hex")
        // setup signup params
        let userData={
            id:generateId,
            firstName:req.body.legalFirstName,
            lastName:req.body.legalLastName,
            phoneNo:req.body.phoneNo,
            accountNo:req.body.accountNo,
            bankName:req.body.bankName,
            mail:req.body.email,
            password:c.createHash("sha256").update(req.body.pass).digest().toString("hex"),
            creationTime:new Date().getTime()
        }


        // sanitize user data params 
        if(userData.firstName =="" || userData.lastName==""){
            res.status(501).json({errMsg:"You cannot leave the firstname or lastname field empty"})
        }

        //  define database query 
        let db_query=`insert into users values('${userData.id}','${userData.firstName}','${userData.lastName}','${userData.phoneNo}','${userData.accountNo}','${userData.bankName}','${userData.mail}','${userData.password}','${userData.creationTime}')`

        db_handler.query(db_query,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result){
                //  create session token 
                let sessionToken=jwt.sign({sessionToken:userData.id},envProcessor.ROUTE_KEY,{expiresIn:"2h"});
                res.status(200).json({msg:"account creation successful", token:sessionToken})
            }
        })
    }

    // fucntion to signin user 
    signin(req,res){
          //  define database query
          let encryptPass=c.createHash("sha256").update(req.body.pass).digest().toString("hex") 
          let db_query=`select * from users where email='${req.body.mail}' and password='${encryptPass}' `;
        //    fun query in database  
    }

    uploadProfilePics(){

    }

    editProfile(){

    }

    requestToBuyChirp(){

    }

    requestToSellChirp(){

    }

    gellAllTransaction(){

    }

    checkUserBalance(){

    }

    lockChirp(){

    }

    unlockChirp(){

    }

    transferChirp(){

    }

}