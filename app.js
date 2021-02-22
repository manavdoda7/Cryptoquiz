const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const crypto = require('crypto')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const nodemailer = require('nodemailer')
const sgTransport = require('nodemailer-sendgrid-transport');
const bcrypt = require('bcrypt')
const flash = require('connect-flash')
              require('dotenv').config()
const csrf = require('csurf')
const mongoStore = require('connect-mongodb-session')(session)

const csrfProtection = csrf({cookie:true});
const app = express();

//Models
const Player = require("./models/Player")(mongoose);

const MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_USER_PASSWORD}@cluster0.ezyqv.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`

const store = new mongoStore({
    uri: MONGO_URI,
    collection: process.env.SESSION_STORE
})

app.set('view engine','ejs');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret:process.env.SESSION,
    resave: false,
    saveUninitialized: false,
    store:store
}))
app.use(flash());
app.use(csrfProtection);

var mailer = nodemailer.createTransport(sgTransport({
    auth:{
        api_key:process.env.SENDGRID_KEY
    }
}));

mongoose.connect(MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

//Get requests
app.get("/",(req,res)=>{
    res.render('index',{
        isAuthenticated: req.session.isLoggedIn, 
        name: req.session.player, 
        csrfToken: req.csrfToken()
    })
})

app.get("/login",(req,res)=>{
    res.render("login",{
        reg:req.flash('error'),
        success:req.flash('success'),
        csrfToken: req.csrfToken()
    })
})

app.get("/register",(req,res)=>{
    res.render("register",{csrfToken: req.csrfToken()})
})

//Post requests

app.post('/login', (req,res)=>{
   Player.findOne({email: req.body.email})
   .then((User)=>{
        if(User){
            if(User.verified){
                bcrypt.compare(req.body.password, User.password)
                .then((result)=>{
                    if(!result){
                        req.flash('error', 'Incorrect password')
                        res.redirect('/login')
                    }else{
                        req.session.isLoggedIn = true;
                        req.session.player = User;
                        res.redirect('/');
                    }
                })
                .catch((err)=>{
                    console.log(err)
                })
            }else{
                req.flash('error', 'Email not verified')
                res.redirect('/login')
            }
        }else{
            req.flash('error', 'No user with such email exists')
            res.redirect('/login')
        }
   })
   .catch((err)=>{
       console.log(err)
   })
})

app.post('/register', (req,res)=>{
    let arr = req.body.email.split('@')
    if(arr[1]=='nith.ac.in'){
        Player.findOne({email:req.body.email})
        .then((foundUser)=>{
            if(foundUser){
                 req.flash('error','You are already registered! Please Login')
                 res.redirect('/login')
            }
            else{
                bcrypt.hash(req.body.password,10)
                .then(hashedPassword=>{
                    crypto.randomBytes(32,(err,buffer)=>{
                        if(!err){
                            let token = buffer.toString('hex');
                            let newPlayer = new Player({
                                email: req.body.email,
                                password: hashedPassword,
                                playerName: req.body.playerName,
                                verified: false,
                                token: token,
                                tokenExpirationDate: Date.now() + 3600000 
                            })
                            newPlayer.save()
                            .then(()=>{
                                req.flash('success','Please click the link in the your email inbox to verify your account');
                                res.redirect('/login')
                                mailer.sendMail({
                                    to:req.body.email,
                                    from: 'cryptoquiznith@gmail.com',
                                    subject: 'Verification of you account',
                                    html: `
                                    <p>To verify click link: <p><a href = "http://localhost:3000/verify/${token}"> Link</a> `
                                })
                            })
                            .catch((err)=>{
                                console.log(err)
                                res.redirect('/')
                            })
                        }
                    })
                })
                .catch(err=>{
                    console.log(err)
                })
            }
        })
        .catch((err)=>{
            console.log(err)
        })
    }else{
        res.send('Use your nith id')
    }
})

app.post("/logout",(req,res)=>{
    req.session.destroy((err)=>{
        if(!err){
            res.redirect('/');
        }
    })
})

//Email verification:
app.get('/verify/:token',(req,res)=>{
    let token = req.params.token;
    Player.findOne({token:token})
    .then((User)=>{
        if(User){
            User.verified = true;
            User.save()
            .then(()=>{
                res.send('Your account has been verified')
            })
            .catch((err)=>{
                console.log(err);
            })
        }else{
            res.send("No account with this mail to be verified")
        }
    })
    .catch(err=>{
        console.log(err);
    })
})


app.listen('3000',()=>{
    console.log("App listening at 3000")
})