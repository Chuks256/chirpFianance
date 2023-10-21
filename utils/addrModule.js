// import relevant modules 
require("dotenv").config();
let elliptic=require("elliptic");
let Ec=new elliptic.ec("secp256k1");


//  define address modules 
let addrModule={
    create_private_key:()=>{
        return Ec.genKeyPair().getPrivate("hex");
    },

    create_public_addr:(private_key="")=>{
        return Ec.keyFromPrivate(private_key).getPublic("hex")
    },

    create_signing_key:(private_key="")=>{
        return Ec.keyFromPrivate(private_key);
    }
}


module.exports=addrModule;