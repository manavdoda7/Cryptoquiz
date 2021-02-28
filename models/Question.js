module.exports = (mongoose)=>{
    const questionSchema = new mongoose.Schema({
        quesNo: {
            type: Number,
            required: true,
        },
        ques:{
            type: String,
            required: true,
        },
        ans:{
            type:Number,
            required: true,
        }
    })
    const Question = new mongoose.model('question',questionSchema);
    return Question;
}