module.exports = function(mongoose){
    const Player_schema = new mongoose.Schema({
        email:{
            type: String,
            required: true
        },
        password:{
            type: String,
            required: true,
        },
        playerName:{
            type: String,
            required: true
        },
        verified:{
            type:Boolean,
            required:true
        },
        token:String,
        tokenExpirationDate: Date,
    })

    const Players = new mongoose.model("player", Player_schema);
    return Players;
}