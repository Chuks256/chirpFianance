//  import relevant modules 
require("dotenv").config()
let block_module=require("./blockModule")
let transaction_module=require("./transactionModule")
let converterUtil=require("../utils/converter");
let addrHelperUtil=require("../utils/addrModule");
let fs=require("fs")
let processorEvnHelper=require("../utils/processorEnv")

// define chirp processor Module 
class processorModule{
    constructor(){
        this.symbol="CHIRP"
        this.tx_charges_rate=0.05; // 10 naira is deducted per conversion rate 
        this.tx_ledger_store=[] 
        this.coldBootStart();
    }

    coldBootStart(){
        let readTx=this.readTxlogs();
        if(readTx=="" || readTx.length==0 || readTx==undefined){
            return this.initializeGenesisBlock();
        }
    }

    initializeGenesisBlock(){
        let tx_params={
            sndr:addrHelperUtil.create_public_addr(processorEvnHelper.PROVIDER_PRIVATE_KEY),
            rcr:addrHelperUtil.create_public_addr(processorEvnHelper.PROCESSOR_PRIVATE_KEY),
            amt:200000000000, // 2 billion of chirp allocated to processor address 
            desc:"for easy transaction and circulation",
        }
        // define transaction , sign and verify transaction
        let genesis_tx=new transaction_module(tx_params);
        genesis_tx.signTx(addrHelperUtil.create_signing_key(processorEvnHelper.PROVIDER_PRIVATE_KEY))
        genesis_tx.verifyTx();

        //  define genesis block than push when all is okay
        let genesis_blk=new block_module(genesis_tx,0);
        this.tx_ledger_store.push(genesis_blk)
        this.saveTxLogs(this.tx_ledger_store)
    }

    // fucntion to dsave transaction logs 
    saveTxLogs(tx_data){
        let sanitizedData=JSON.stringify(tx_data,"null",3)
        return fs.writeFileSync("./dataLog/userLog.chirp",sanitizedData,{encoding:"utf-8"})
    }

    // function to read saved logs 
    readTxlogs(){
        let getTxData=fs.readFileSync("./dataLog/userLog.chirp",{encoding:"utf-8"})
        return getTxData
    }

    // fucntion get previous hash 
    getPreviousHash(){
        let getTxData=fs.readFileSync("./dataLog/userLog.chirp",{encoding:"utf-8"})
        let sanitize_data=JSON.parse(getTxData);
        return sanitize_data[sanitize_data.length-1].prevhash
    }

    // function to check merchant or user balance 
    checkUserBalance(addr=""){
        let getTxData=this.readTxlogs();
        let userBal=0;
        for(let blk of JSON.parse(getTxData)){
            for(let tx of [blk.transaction]){
                if(addr==tx.sndr){
                    userBal -=tx.amt 
                }
                else{
                    if(addr==tx.rcr){
                        userBal =userBal+tx.amt;
                    }
                }
            }
        }
        return userBal;
    }

    // functio to verify user balance 
    verifyUserBalance(userTxParams){
        let get_user_bal=this.checkUserBalance(userTxParams.sndr);
        if(get_user_bal<userTxParams.amt){
            return false
        }
        else{
            return true 
        }
    }

    // auto deduct from user when user wants to withdrawl 
    deductTransactionCharges(userTxParams){
        return userTxParams.amt -=this.tx_charges_rate;
    }

    // get user locked chirp time frame
    getLockedTimeFrame(userAddr=""){
        let read_tx_logs=this.readTxlogs();
        for(let blk of JSON.parse(read_tx_logs)){
            for(let tx of [blk.transaction]){
                if(userAddr==tx.sndr || userAddr==tx.rcr){
                    return tx.lockedTimeFrame
                }
            }
        }
    }
    
    // function to lock chirp currency in wallet for a specific timeframe or period of days  
    //N:B chirp are locked in days e:g 5 days ,6 day or more 
    // user can't withdraw their chirp currency within this period 
    lockChirp(userPrivateKey="",timeframe=0){
        let convertToPub=addrHelperUtil.create_public_addr(userPrivateKey)
        let read_tx_logs=JSON.parse(this.readTxlogs());
        for(let blk of read_tx_logs){
            for(let tx of [blk.transaction]){
                if(convertToPub==tx.sndr || convertToPub==tx.rcr){
                     tx.lockedTimeFrame=timeframe
                     read_tx_logs.push(blk)
                     this.saveTxLogs(read_tx_logs)
                     return {msg:`chirp successfully locked for ${timeframe} days`, statusCode:200 ,status:"TRANSACTION_APPROVED"}
                }
            }
        }
    }

    
    //  function to unlock loked chirp in wallet 
    unlockChirp(userPrivateKey=""){
        let convertToPub=addrHelperUtil.create_public_addr(userPrivateKey)
        let read_tx_logs=JSON.parse(this.readTxlogs());
        for(let blk of read_tx_logs){
            for(let tx of [blk.transaction]){
                if(convertToPub==tx.sndr || convertToPub==tx.rcr){
                     tx.lockedTimeFrame=0
                     read_tx_logs.push(blk)
                     this.saveTxLogs(read_tx_logs)
                     return {msg:`chirp successfully unlocked`, statusCode:200 ,status:"TRANSACTION_APPROVED"}
                }
            }
        }
    }

    //function to exchange fiat for chirp 
    buyChirp(txparams={}){
        let tx_ledger_storage=JSON.parse(this.readTxlogs())

        //  setup transaction config params 
        let tx_params={
            sndr:addrHelperUtil.create_public_addr(processorEvnHelper.PROCESSOR_PRIVATE_KEY),
            rcr:txparams.addr,
            amt:converterUtil.convertToChirp(100,txParams.fiatAmount),
            desc:"bought chirp from processor"
        }
       
        if(txparams.addr.length==0){
            return {errMsg:"you can't leave this fields empty",  statusCode:501}
        }
        if(txparams.amt < 1 ){
            return {errMsg:"you can't buy below the default price of chirp",statusCode:501}
        }  
        // define transaction class 
        let tx_module=new transaction_module(tx_params)
        let get_signing_key=addrHelperUtil.create_signing_key(processorEvnHelper.PROCESSOR_PRIVATE_KEY)
        tx_module.signTx(get_signing_key)
        tx_module.verifyTx()
        let blk_module=new block_module(tx_module,this.getPreviousHash())
        tx_ledger_storage.push(blk_module);
        this.saveTxLogs(tx_ledger_storage);
        return {msg:`${tx_params.amt } chirps purchase successful`, statusCode:200, status:'TRANSACTION_APPROVED'}
    }


    // fucntion to exchange chirp for fiat  
    sellChirp(txparams={}){
        let tx_ledger_storage=JSON.parse(this.readTxlogs())
        if(txparams.addr.length==0){
            return {errMsg:"you can't leave this fields empty",  statusCode:501}
        }
        if(txparams.amt < 1 ){
            return {errMsg:"you can't buy below the default price of chirp",statusCode:501}
        }  
        //  setup transaction params config 
        let tx_params={
            sndr:txParams.addr,
            rcr:addrHelperUtil.create_public_addr(processorEvnHelper.PROCESSOR_PRIVATE_KEY),
            amt:txParams.amt,
            desc:"selling chirp for fiat"
        }
        // define transaction class 
        let tx_module=new transaction_module(tx_params)
        let get_signing_key=addrHelperUtil.create_signing_key(txparams.privateKey)
        tx_module.signTx(get_signing_key)
        tx_module.verifyTx()
        let blk_module=new block_module(tx_module,this.getPreviousHash())
        tx_ledger_storage.push(blk_module);
        this.saveTxLogs(tx_ledger_storage);
        return {msg:`${tx_params.amt } chirps sale successful`, statusCode:200, status:'TRANSACTION_APPROVED'}
    }


    //  function to transfer chirp from a to b 
    transferChirp(txParams={}){
        if(this.getLockedTimeFrame(txParams.sndr)==0 || this.getLockedTimeFrame(txParams.sndr) >new Date().getDay()){
            if(this.verifyUserBalance(txParams)==true){
                return this.startTransfer(txParams)
            }
            else{
                if(this.verifyUserBalance(txParams)==false){
                    return {errMsg:"insufficent balance ",statusCode:501, status:"TRANSACTION_DECLINED"}
                }
            }
        }
        else{
            if(this.getLockedTimeFrame(txParams.sndr)<new Date().getDay()){
                return {errMsg:"You cannot transfer chirp while your account is in lock mode", statusCode:501 , status:"TRANSACTION_DECLINED" }
            }
        }
    }
    

    // function to start transfer transaction
    startTransfer(txparams={}){
        let tx_ledger_storage=JSON.parse(this.readTxlogs())
        if(txparams.sndr.length==0 || txparams.rcr.length==0){
            return {errMsg:"you can't leave this fields empty",  statusCode:501}
        }
        if(txparams.amt < 1 ){
            return {errMsg:"you can't buy below the default price of chirp",statusCode:501}
        }
        let tx_module=new transaction_module(txparams)
        let get_signing_key=addrHelperUtil.create_signing_key(txparams.privateKey)
        tx_module.signTx(get_signing_key)
        tx_module.verifyTx()
        let blk_module=new block_module(tx_module,this.getPreviousHash())
        tx_ledger_storage.push(blk_module);
        this.saveTxLogs(tx_ledger_storage);
        return {msg:"transaction successful", statusCode:200, status:'TRANSACTION_APPROVED'}
    }

    // function to get all transaction 
    getAllTransaction(){
        let read_tx_logs=this.readTxlogs();
        for(let blk of JSON.parse(read_tx_logs)){
            for(let tx of [blk.transaction]){
                     return tx 
                }
            }
        }

}


// export module for external usage s
module.exports=processorModule;
