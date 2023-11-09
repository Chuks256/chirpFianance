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
let convertModule=require("../utils/converter")

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
    requestToFundWallet(req,res){ 
    let txParams={
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
            let txQuery=`insert into transaction value('${txData.id}','${get_session_token.userId}','${txData.name}','${txData.fiatAmount}','PENDING','DEPOSIT','','')`
            
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
                    res.status(tx_status.processing).json({msg:"Your money is on its way we are processing your deposit please wait",status:tx_status.processing})
                }
            })
        }
    })
}
    


    // admin function for confirming transaction 
    adminToggleTransaction(req,res){
        // setup transaction config parameters
        let txParams={
            txId:req.body.transactionId,
            txToggle:req.body.tx_toggle
        }

        let configTxParams={
            addr:"",
            fiatAmount:0
        }

        // define session token and admin verification db query
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
        let dbQuery=`select * from users where id="${get_session_token.userId}"`

        db_handler.query(dbQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            // if no internal error verify if user is super user or user 
            if(result[0].acct_type!="superUser"){
                res.status(404).json({errmsg:"invalid routes , access denied "})
            }
            else{
                if(result[0].acct_type=="superUser"){
                    // if user admin verification pass, then try to get particular based on a selected transaction id  
                    let txQuery=`select * from transaction where id='${txParams.txId}'`
                    
                    db_handler.query(txQuery,(err,txresult)=>{
                        if(err){
                            throw new Error(err)
                        }
                        // after getting specific user transaction get admin tx toggle 
                        if(txParams.txToggle=="DECLINED"){
                            let statusQuery=`update transaction set status='DECLINED' where id='${txParams.txId}'`
                            db_handler.query(statusQuery,(err,result)=>{
                                if(err){
                                    throw new Error(err)
                                }
                            // if not successfuly processed send declined message to admin 
                            res.status(501).json({msg:"TRANSACTION_DECLINED", status:501})
                            })
                        }
                        else{
                            if(txParams.txToggle=="APPROVED"){
                                // if toggle signifies approved get user private key based on id :: config txamount
                                let keyQuery=`select private_key from users where id='${txresult[0].userid}'`
                                configTxParams.fiatAmount=txresult[0].fiatAmount
                                
                                db_handler.query(keyQuery,(err,userResult)=>{
                                    if(err){
                                        throw new Error(err)
                                    }
                                    // if private key is collected convert to public key :: then config tx Parameters 
                                    let getPublic_key=addrHandler.create_public_addr(userResult[0].private_key);
                                    configTxParams.addr=getPublic_key;

                                    // check type of transaction 
                                    if(txresult[0].type=="DEPOSIT"){
                                    // then process transaction 
                                    let process_tx=processor.fundWallet(configTxParams.addr,configTxParams.fiatAmount)
                                    if(process_tx){
                                        let statusQuery=`update transaction set status='APPROVED' where id='${txParams.txId}'`
                                        db_handler.query(statusQuery,(err,result)=>{
                                            if(err){
                                                throw new Error(err)
                                            }
                                            if(result){
                                        // if successfuly processed send successfuly message to admin 
                                        res.status(200).json({msg:"TRANSACTION_SUCCESSFULLY_APPROVED", status:200})
                                            }
                                        })     
                                    }
                                    }
                                    else{
                                        if(txresult[0].type=="WITHDRAWAL"){
                                    // then process withdrawal transaction
                                    let withdrawlTxParams={
                                        addr:configTxParams.addr,
                                        fiatAmount:txresult[0].fiatAmount
                                    }
                                    let process_tx=processor.cashoutFromWallet(withdrawlTxParams.addr,withdrawlTxParams.fiatAmount,userResult[0].private_key)
                                    if(process_tx){
                                        let statusQuery=`update transaction set status='APPROVED' where id='${txParams.txId}'`
                                        db_handler.query(statusQuery,(err,result)=>{
                                            if(err){
                                                throw new Error(err)
                                            }
                                            if(result){
                                         // if successfuly processed send successfuly message to admin 
                                           res.status(200).json({msg:"TRANSACTION_SUCCESSFULLY_APPROVED", status:200})
                                            }
                                        })     
                                    }
                                        }
                                    }
                                })  
                            }
                        }
                    })
                }
            }
        })
 }

    // admin function for getting all transactions 
    adminGetAllTransaction(req,res){
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
        let dbQuery=`select * from users where id='${get_session_token.userId}' `
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

    // function to sell out chirp or withdraw chirp 
    requestToWithDrawlFromWallet(req,res){
        // define transaction params 
        let txParams_config={
           addr:"",
           amt:req.body.fiatAmount
        }
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY); 
        let userQuery=`select * from users where id='${get_session_token.userId}'`
        db_handler.query(userQuery,(err,result)=>{
            if(err){
                throw new Error(err)
            }
            if(result){
                let getPublicAddr=addrHandler.create_public_addr(result[0].private_key);
                txParams_config.addr=getPublicAddr;
                // insert into transaction table 
                let txQuery=`insert into transaction value('${c.randomBytes(4).toString("hex")}','${result[0].id}','${result[0].legal_first_name}_${result[0].legal_last_name}','${txParams_config.amt}','PENDING','WITHDRAWAL','${result[0].account_number}','${result[0].bank_name}')`
                db_handler.query(txQuery,(err,result)=>{
                    if(err){
                        throw new Error(err)
                    }
                    if(result){
                        let getTxStat=fs.readFileSync("./datalog/pendingTxStats.chirp",{encoding:"utf-8"});
                        let tx_stats_no=JSON.parse(getTxStat);
                        tx_stats_no.txStats +=1;
                        broadcastmodule.broadcastData({txStatsNo:tx_stats_no,type:"TX_STATUS_UPDATE"})
                        fs.writeFileSync("./datalog/pendingTxStats.chirp",JSON.stringify(tx_stats_no))
                        res.status(tx_status.processing).json({msg:"Your money is on its way, please wait while we process it", type:"PROCESSING"})
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
    transferFromWallet(req,res){
        let txParams={
            sndr:"",
            rcr:"",
            amt:req.body.amount,
            desc:req.body.description,
            privateKey:""
        }
        if(txParams.amt<50){
            res.status(200).json({status:TRANSACTION_FAILED,msg:"you cant withdrawl less than 50 naira"})
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
                let tx_process=processor.transferNote(txParams)                
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

    // admin function to get user transaction by id 
    adminGetUserTxById(req,res){
        let get_session_token=jwt.verify(req.body.token,envProcessor.ROUTE_KEY);
        let dbQuery=`select * from users where id='${get_session_token.userId}' `
        let txQuery=`select * from transaction where id=${req.body.transactionId}`

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
                            res.status(tx_status.approve).json(result)
                        }
                    })
                }
            }
    })
}

// general function to get specific data by using tagname
getDataByTagName(req,res){
    let getData=req.params.tagName;
    let dbQuery=`select tag_name, private_key from users where tag_name="${getData}"`;
    db_handler.query(dbQuery,(err,result)=>{
        if(err){
            throw new Error(err)
        }
        res.status(200).json(result)
    })
}

//  function for tipping user 
tipMe(req,res){
    let txParams={
        fiatAmount:req.body.fiatAmount
    }   
    
    let userQuery=`select * from users where tag_name='${req.params.tagName}'`;
    db_handler.query(userQuery,(err,result)=>{
        if(err){
            throw new Error(err)
        }
        // define db queries 
        let txData={id:c.randomBytes(4).toString("hex"),name:`${result[0].legal_first_name}_${result[0].legal_last_name}`,fiatAmount:txParams.fiatAmount}
        let txQuery=`insert into transaction value('${txData.id}','${result[0].id}','${txData.name}','${txData.fiatAmount}','PENDING','DEPOSIT','','')`
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
                    res.status(tx_status.processing).json({msg:"Tip_successful",status:tx_status.processing})
                    }
                })
            })
        }

}

// export module for external usuage 
module.exports=routeHandler;