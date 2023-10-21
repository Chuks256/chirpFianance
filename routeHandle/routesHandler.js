//  import required modules 
require("dotenv").config();
let db_handler=require("../config/dbConfig");
let processor_handler=require("../coreFile/processor");
let jwt=require('jsonwebtoken');
let c=require("crypto")
let envProcessor=require("../utils/processorEnv")
let addrHandler=require("../utils/addrModule")

// initialise processor Module class 
let processor=new processor_handler();

//  define route class 
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
            tagName:`@${firstName}${generateId.slice(3)}`,
            privateKey:addrHandler.create_private_key(),
            mail:req.body.email,
            password:c.createHash("sha256").update(req.body.pass).digest().toString("hex"),
            creationTime:new Date().getTime()
        }


        // sanitize user data params 
        if(userData.firstName =="" || userData.lastName==""){
            res.status(501).json({errMsg:"You cannot leave the firstname or lastname field empty"})
        }

        //  define database query 
        let db_query=`insert into users values('${userData.id}','${userData.firstName}','${userData.lastName}','${userData.phoneNo}','${userData.accountNo}','${userData.bankName}','${userData.tagName}','${userData.privateKey}','${userData.mail}','${userData.password}','${userData.creationTime}')`

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
          let encryptPass=c.createHash("sha256").update(req.body.pass).digest().toString("hex") 
          let db_query=`select * from users where email='${req.body.mail}' and password='${encryptPass}' `;        
          //run query in database  
          db_handler.query(db_query,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result.length>0){
                  //  create session token 
                  let sessionToken=jwt.sign({sessionToken:result[0].id},envProcessor.ROUTE_KEY,{expiresIn:"2h"});
                  res.status(200).json({msg:"account creation successful", token:sessionToken})
            }
            else{
                res.status(404).json({errMsg:"account does not exist"})
            }
          })
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

    // function to check balance 
    checkUserBalance(req,res){
        if(req.body.tagName==null || req.body.tagName.length==0){
            res.status(501).json({errMsg:"yagName parameter should not be empty"})
        }
        // get private key based on procvided tagname 
        let dbQuery=`select * from users where tag_name='${req.body.tagName}'`;
        db_handler.query(dbQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result){
                let getPublicKey=addrHandler.create_public_addr(result[0].private_key)
                let getUserBal=processor.checkUserBalance(getPublicKey);
                res.status(200).json({value:getUserBal,status:"TRANSACTION_APPROVED"})
            }
        })
    }


    lockChirp(){

    }

    unlockChirp(){

    }

    transferChirp(){

    }

}