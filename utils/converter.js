
let converter={
    convertToFiat:(default_chirp_price=0,chirpAmount=0)=>{
        let fiat_amount=default_chirp_price*chirpAmount;
        return fiat_amount;
    },
    convertToChirp:(default_chirp_price=0,fiatAmount=0)=>{
        let no_of_chirp=fiatAmount/default_chirp_price
        return no_of_chirp;
    }
}

module.exports=converter;