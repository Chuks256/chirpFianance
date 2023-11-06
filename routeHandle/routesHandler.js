//  import necessary modules
require("dotenv").config();
let db_handler=require("../config/dbConfig");
let processor_handler=require("../coreFile/processor"); // import processor modules 
let jwt=require('jsonwebtoken'); 
let c=require("crypto")
let envProcessor=require("../utils/processorEnv")
let addrHandler=require("../utils/addrModule") // module for handling public or private key conversion 
let fs=require('fs')
let broadcastmodule=require("../utils/broadcastModule") // module for handling websoket communication with server 


/// config transaction status params  
let tx_status={
    processing:206,
    approve:200,
    declined:500
}

// initialise processor Module class 
let processor=new processor_handler();

//  define route class 
class routeHandler{
    constructor(){} // define route handler class as void 
    // function for signing up user 
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
        let db_query=`insert into users values('${userData.id}','${userData.firstName}','${userData.lastName}','${userData.phoneNo}','${userData.accountNo}','${userData.bankName}','${userData.tagName}','${userData.privateKey}','${userData.mail}','${userData.password}','${userData.creationTime}','user')`

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
            if(result){
                res.status(200).json({value:result,status:"TRANSACTION_APPROVED"})
            }
        })
    }

    // uploadProfilePics(){// }

    // editProfile(){// }

    
    // function to request for chirp coin
    requestToBuyChirp(req,res){ 
    let txParams={
        addr:"",
        fiatAmount:req.body.fiatAmount
    }

    let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
    let dbQuery=`select * from users where id='${get_session_token.userId}'`;     

    db_handler.query(dbQuery,(err,result)=>{
        if(err){
            throw new Error(err)
        }
        if(result){
            let txData={id:c.randomBytes(4).toString("hex"),name:`${result[0].legal_first_name}_${result[0].legal_last_name}`,fiatAmount:txParams.fiatAmount}
            let txQuery=`insert into transaction value('${txData.id}','${get_session_token.userId}','${txData.name}','${txData.fiatAmount}','PENDING','DEPOSIT')`
            
            //  database query for inserting transaction 
            db_handler.query(txQuery,(err,result)=>{
                if(err){
                    throw new Error(err)
                }
                if(result){
                    let getTxStat=fs.readFileSync("./datalog/pendingTxStats.chirp",{encoding:"utf-8"});
                    let tx_stats_no=JSON.parse(getTxStat);
                    tx_stats_no.txStats +=1;
                    broadcastmodule.broadcastData({txStatsNo:tx_stats_no,type:'TX_STATUS_UPDATE'})
                    fs.writeFileSync("./datalog/pendingTxStats.chirp",JSON.stringify(tx_stats_no))
                    res.status(tx_status.processing).json({msg:"Your chirp is on its way we are processing your deposit please wait",status:tx_status.processing})
                }
            })
        }
    })
}
    


    // admin function for confirming transaction 
    adminToggleTransaction(req,res){
        let txParams={user_id:req.body.merchantId,txToggle:req.body.tx_toggle}
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
        let dbQuery=`select * from users where userId='${get_session_token.userId}' `

        // config transaction params 
        let configTxParams={
            addr:"",
            fiatAmount:0
        }

        db_handler.query(dbQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result[0].acct_type != "superUser"){
                res.status(404).json({errMsg:'you are not allowed to access this route'})
            }
            else{
                if(result[0]=="superUser"){
                    if(txParams.txToggle=="DECLINED"){
                        res.status(tx_status.declined).json({Msg:"transaction_declined",status:'TRANSACTION_DECLINED'})
                    }
                    else{
                        if(txParams.txToggle=="APPROVED"){
                            let txQuery=`update transaction set status="${txParams.txToggle}" where userId='${txParams.user_id}'`;
                            let getTxAmount=`select * from transaction where id='${req.body.transactionId}'`;
                            let getRcrAddr=`select * from users where userId='${txParams.user_id}`
                            db_handler.query(txQuery,(err,result)=>{
                                if(err){
                                    throw new Error(err)
                                }
                                if(result){
                                    /// once user id has been approved uodate transaction status and send chirp
                                    db_handler.query(getTxAmount,(err,dbResult)=>{
                                        if(err){
                                            throw new Error(err)
                                        }
                                        if(dbResult){
                                            configTxParams.fiatAmount=dbResult[0].fiatAmount;
                                            // after getting transaction amount 
                                            db_handler.query(getRcrAddr,(err,txResult)=>{
                                                if(err){
                                                    throw new Error(err)
                                                }
                                                if(txResult){
                                                    if(dbResult[0].type=="DEPOSIT"){
                                                        let merchantPrivateKey=dbResult[0].private_key;
                                                    // convert fiat to chirp coin then start transaction 
                                                    let getMerchantPubAddr=addrHandler.create_public_addr(merchantPrivateKey); 
                                                    configTxParams.addr=getMerchantPubAddr
                                                    // initialise transaction 
                                                    let txResponse=processor.buyChirp(configTxParams)
                                                    if(txResponse){
                                                        res.status(200).json(txResponse)
                                                    }
                                                    }
                                                    else{                                                        
                                                        if(dbResult[0].type=="WITHDRAWAL"){
                                                            let txParams_config={
                                                                addr:"",
                                                                amt:dbResult[0].fiatAmount
                                                             }
                                                        let merchantPrivateKey=dbResult[0].private_key;
                                                        // convert fiat to chirp coin then start transaction 
                                                        let getMerchantPubAddr=addrHandler.create_public_addr(merchantPrivateKey); 
                                                        txParams_config.addr=getMerchantPubAddr;
                                                        let initialTx=processor.sellChirp(txParams_config);
                                                        if(initialTx){
                                                            res.status(200).json(initialTx)
                                                        }
                                                        }
                                                    }
                                                    
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    }
                }
            }
        })
 }

    // admin function for getting all transactions 
    adminGetAllTransaction(req,res){
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
        let dbQuery=`select * from users where userId='${get_session_token.userId}' `
        let txQuery=`select * from transaction`

        db_handler.query(dbQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result[0].acct_type != "superUser"){
                res.status(404).json({errMsg:'you are not allowed to access this route'})
            }
            else{
                if(result[0].acct_type == "superUser"){
                    db_handler.query(txQuery,(err,result)=>{
                        if(err){
                            throw new Error(err)
                        }
                        if(result){
                            res.status(200).json(result)
                        }
                    })
                }
            }
        })
    }

    // function for selling chirp 
    requestToSellChirp(req,res){
        // define transaction params 
        let txParams_config={
           addr:"",
           amt:req.body.chirpAmount
        }
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY); 
        let userQuery=`select * from users where userId='${get_session_token.userId}'`
        db_handler.query(userQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result){
                let getPublicAddr=addrHandler.create_public_addr(result[0].private_key);
                txParams_config.addr=getPublicAddr;
                // insert into transaction table 
                let txQuery=`insert into transaction value('${c.randomBytes(4).toString("hex")}','${result[0].userId}','${result[0].legalFirstName}_${result[0].legalLastName}','${txParams_config.amt}','PENDING','WITHDRAWAL')`
                db_handler.query(txQuery,(err,result)=>{
                    if(err){
                        throw new Error(err)
                    }
                    if(result){
                        let getTxStat=fs.readFileSync("./datalog/pendingTxStats.chirp",{encoding:"utf-8"});
                        let tx_stats_no=JSON.parse(getTxStat);
                        tx_stats_no.txStats +=1;
                        broadcastmodule.broadcastData({txStatsNo:tx_stats_no,type:TX_STATUS_UPDATE})
                        fs.writeFileSync("./datalog/pendingTxStats.chirp",JSON.stringify(tx_stats_no))
                        res.status(tx_status.processing).json({msg:"Your money be wait while we process it", type:"PROCESSING"})
                    }
                })
            }
        })
    }

    // function for getting all transaction 
    gellAllProcessorTransaction(req,res){
        let txProcess=processor.getAllTransaction()
        res.status(200).json({value:txProcess,status:"TRANSACTION_APPROVED"})
    }


    // function to check user balance in wallet  
    checkUserBalance(req,res){
        if(req.body.tagName==null || req.body.tagName.length==0){
            res.status(501).json({errMsg:"tagName parameter should not be empty"})
        }
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

    // function to transfer chirp to another wallet to another 
    // define transaction params 
    transferChirp(req,res){
        let txParams={
            sndr:"",
            rcr:"",
            amt:req.body.amount,
            desc:req.body.description,
            privateKey:""
        }
        //  get session from sender 
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY)
        //get sender private key with id
        let dbQuery=`select * from users where id='${get_session_token.userId}'`;
        let getRecieverPrivateKey=`select * from users where tag_name='${txParams.rcr}'`
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

    // function to get all transaction of user [declined , approved and pending]
    getUserTransaction(req,res){
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY)
        let txQuery=`select * from transaction where userid='${get_session_token.userId}'`

        db_handler.query(txQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result){
                res.status(tx_status.approve).json(result)
            }
        })
    }
}

// export module for external usuage 
module.exports=routeHandler;