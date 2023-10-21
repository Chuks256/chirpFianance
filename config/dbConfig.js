//  import required modules
let sql_module=require("mysql");

//  define sql params configuration 
let sql_param_config={
    host:"localhost",
    port:3306,
    database:"chirpdb",
    user:"root",
    password:"root"
}


let sql_conn_callback=sql_module.createPool(sql_param_config);

//  export modules 
module.exports=sql_conn_callback;

