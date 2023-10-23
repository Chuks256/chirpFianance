//  import required modules 
require("dotenv").config();
let db_handler=require("../config/dbConfig");
let processor_handler=require("../coreFile/processor");
let jwt=require('jsonwebtoken');
let c=require("crypto")
let envProcessor=require("../utils/processorEnv")
let addrHandler=require("../utils/addrModule")
let ws=require("ws");
let broadCasterNode=new ws("ws://localhost:5500")

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
            tagName:`@${req.body.legalFirstName}${generateId.slice(3)}`,
            privateKey:addrHandler.create_private_key(),
            mail:req.body.email,
            password:c.createHash("sha256").update(req.body.pass).digest().toString("hex"),
            creationTime:new Date().getTime()
        }

        // // sanitize user data params 
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
                let sessionToken=jwt.sign({userId:userData.id},envProcessor.ROUTE_KEY,{expiresIn:"2h"});
                res.status(200).json({msg:"account creation successful", token:sessionToken})
            }
        })
    }


    // function to sign in user 
    signin(req,res){
          let encryptPass=c.createHash("sha256").update(req.body.pass).digest().toString("hex") 
          let db_query=`select * from users where email='${req.body.email}' and password='${encryptPass}' `;          
          db_handler.query(db_query,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result.length>0){ 
                  let sessionToken=jwt.sign({userId:result[0].id},envProcessor.ROUTE_KEY,{expiresIn:"2h"});
                  res.status(200).json({msg:"account creation successful", token:sessionToken})
            }
            else{
                res.status(404).json({errMsg:"account does not exist"})
            }
          })
    }

    // function for geting user profile 
    getUserProfile(req,res){
            let getSessionToken=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
        let dbQuery=`select * from users where id='${getSessionToken.userId}'`

        db_handler.query(dbQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            res.status(200).json({value:result,status:"TRANSACTION_APPROVED"})
        })
    }

    // uploadProfilePics(){// }

    // editProfile(){// }

    
    // there needs to be confirmation from chrip foundation before any buying order can be accepted
    requestToBuyChirp(req,res){
    let txParams={
        addr:"",
        fiatAmount:req.body.fiatAmount
    }
    let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY)
    let dbQuery=`select * from users where id='${get_session_token.userId}'`;     
    // run a query to get user private ky 
    db_handler.query(dbQuery,(err,result)=>{
        if(err){
            throw new Error(err)
        }
        if(result){
            let getPublicKey=addrHandler.create_public_addr(result[0].private_key);
            txParams.addr=getPublicKey;
            // ask for confirmation for chirp buy order from chirp foundation 
            let txData={name:`${result[0].legal_first_name}_${result[0].legal_first_name}`,fiatAmount:txParams.fiatAmount}
            broadCasterNode.send(JSON.stringify({value:txData,type:"BUY_ORDER_REQUEST"}))
            // listen for incoming message 
            broadCasterNode.on("message",(msg)=>{
                let sanitizeTxSignal=JSON.parse(msg);
                if(sanitizeTxSignal.type=="BUY_ORDER_TX_APPROVED"){
                    console.log("transaction approved")
                }
            })
        }
    })
    }

    // function for selling chirp 
    requestToSellChirp(req,res){}

    // function for getting all transaction 
    gellAllTransaction(req,res){
        let txProcess=processor.getAllTransaction()
        res.status(200).json({value:txProcess,status:"TRANSACTION_APPROVED"})
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

    // lockChirp(){// }

    // unlockChirp(){// }

    // function for transfer chirp to another wallet 
    transferChirp(req,res){
        let txParams={
            sndr:"",
            rcr:'',
            amt:req.body.amount,
            desc:req.body.description,
            privateKey:""
        }

        //  get session from sender 
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY)

        //get sender private key with id
        let dbQuery=`select * from users where id='${get_session_token.userId}'`;
        let getRecieverPrivateKey=`select * from users where tag_name='${req.body.recieverTagName}'`

        db_handler.query(dbQuery,(err,result)=>{
          if(err){
            throw new Error(err)
          }
          if(result){

        // define sender private and config tx params for sender
          let senderPrivateKey=result[0].private_key;
          txParams.sndr=addrHandler.create_public_addr(senderPrivateKey)
          txParams.privateKey=addrHandler.create_signing_key(senderPrivateKey);

          db_handler.query(getRecieverPrivateKey,(err,dbresult)=>{
            if(err){
                throw new Error(err)
            }
            if(dbresult){
                txParams.rcr=addrHandler.create_public_addr(result[0].private_key);
                // after all is well : start transaction
                let tx_process=processor.transferChirp(txParams)                
                res.status(200).json(tx_process)
            }
          })
        }
        })
    }
}

// export module for external usuage 
module.exports=routeHandler;