// import requried modules 
let crypto_module=require("crypto");

// define block class 
class block_module{
    constructor(transaction,prevhash=0){
        let id_count=0;
        id_count+=1
        this.block_id=id_count;
        this.transaction=transaction;
        this.prevhash=prevhash;
        this.hash=this.createBlockHash();
    }

    createBlockHash(){
        let block_params=this.block_id+JSON.stringify(this.transaction)+this.prevhash;
        return crypto_module.createHash("sha256").update(block_params).digest().toString("hex")
    }

} 

module.exports=block_module;