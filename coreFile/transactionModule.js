//  import requied modules 
let ellipticModule=require("elliptic");
let Ec=new ellipticModule.ec("secp256k1");
let crypto_module=require("crypto");

// define transaction class 
class transaction_module{
    constructor(tx_param={},lockedTimeFrame=0){
        this.tx_id=crypto_module.randomBytes(6).toString("hex");
        this.sndr=tx_param.sndr;
        this.rcr=tx_param.rcr;
        this.amt=tx_param.amt;
        this.desc=tx_param.desc;
        this.tx_timestamp=new Date().getTime();
        this.lockedTimeFrame=lockedTimeFrame;
        this.checkMateTxParameter();
    }   

    // function to validate transaction parameters 
    checkMateTxParameter(){
        if(this.amt==0){
            return {errMsg:"you cannot leave amount parameter empty or void", status:404}
        }
    }

    // function to create algorithm for transaction parameters 
    createTxHash(){
        let tx_params=this.tx_id+this.sndr+this.rcr+this.amt+this.desc;
        return crypto_module.createHash("sha256").update(tx_params).digest().toString("hex");
    }

    // function to sign transaction 
    signTx(signing_key){
        if(signing_key.length==0 || signing_key==""){
            throw new Error("invalid signing key ")
        }
        let get_tx_hash=this.createTxHash();
        this.signature=signing_key.sign(get_tx_hash,"base64");
        this.signature.toDER("hex")
    }

    // function for verifying transaction 
    verifyTx(){
        if(this.sndr.length==0 || this.sndr==""){
            return {errMsg:"Sender adddress should not be void or empty"}
        }
        if(this.signature.length==0 || this.signature==""){
            throw new Error("Invalid signature provided");
        }
        let get_tx_signature=this.signature;
        let verify_tx=Ec.keyFromPublic(this.sndr,"hex")
        return verify_tx.verify("",get_tx_signature);
    }
}

// export module for external usage 
module.exports=transaction_module;