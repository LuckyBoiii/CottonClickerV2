const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
app.set('view engine', 'hbs')
dotenv.config({path: "./.env"});

const db = mysql.createConnection({
    // värden hämtas från .env
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

app.use(express.urlencoded({extended: 'false'}))
app.use(express.json())

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}))

db.connect((error) => {
    if(error){
        console.log(error);
    } else{
        console.log("Ansluten till MySQL");
    }
});

// Använder mallen index.hbs
app.get("/", (req, res) => {
    res.render("index");
});

// Använder mallen login.hbs
app.get("/login", (req, res) => {
    res.render("login");
});

// Använder mallen index.hbs
app.get("/index", (req, res) => {
    res.render("index");
});

// Använder mallen clicker.hbs
app.get("/clicker", (req, res) => {
    res.render("clicker");
});

// Använder mallen settings.hbs
app.get("/settings", (req, res) => {
    res.render("settings");
});

app.use(express.static("./webbsidan"));

app.listen(3000, () => {
    console.log("Servern körs, besök http://localhost:3000");
});

// Tar emot poster från index
app.post("/reg", async (req, res) => {
    const {userName, password, password_confirm } = req.body

    if (userName == "" || password == "" || password_confirm == "") {
        return res.render('index', {
            message: 'Fyll i alla fält'
        })}

    else if (password !== password_confirm) {
        return res.render('index', {
            message: 'Lösenorden matchar inte'
        })}

    else if (password.length < 6) {
        return res.render('index', {
            message: 'Lösenordet måste vara minst 6 tecken'
        })} 
        
        else {
            db.query('SELECT userName FROM users WHERE userName = ?', [userName], async (error, result) => {
                if(error){
                    console.log(error)
                }
                if(result.length > 0) {
                    return res.render('index', {
                        message: 'Användaren finns redan'
                    })
                }

                else {
                    try {
                        const salt = await bcrypt.genSalt(10);
                        const hashedPassword = await bcrypt.hash(password, salt);
        
                        db.query('INSERT INTO users SET ?', { userName: userName, password: hashedPassword }, (error, result) => {
                            if (error) {
                                console.log(error);
                            } else {
                                res.render('login', {
                                    message: 'Användaren har registrerats'
                                });
                                db.query('SELECT userID FROM users WHERE userName = ?', [userName], (error, result) => {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        var userID_var = result[0].userID;
                                        db.query('INSERT INTO account_data SET ?', { 
                                            userID: userID_var, 
                                            cotton: 0, 
                                            cash: 0,
                                            sell_multiplier: 1,
                                            click_multiplier: 1,
                                            passive_cotton: 0,
                                            both_hands: 0,
                                            uppg_1_cost: 10,
                                            uppg_2_cost: 200,
                                            uppg_3_cost: 3000,
                                            uppg_4_cost: 4000,
                                            uppg_5_cost: 50000,
                                            uppg_6_cost: 1000000
                                        }, (error, result) => {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log('användar data tillagd');
                                            }
                                        });}
                                }
                            )}
                        }
                    )}
                    catch (error) {
                        console.log(error);
                        return res.status(500).send('Ett fel inträffade');
                    }
                }
            }
        )}
    }
);


// Tar emot poster från login
app.post("/auth", async (req, res) => {
    const {userName, password} = req.body

    if (userName == "" || password == "") {
        return res.render('login', {
            message: 'Fyll i alla fält'
        })
    }

    //inloggningen är lyckas
    db.query('SELECT * FROM users WHERE userName = ?', [userName], async (error, result) => {
        if (error) {
            console.log(error);
        } else {
            if (result.length == 0 || !(await bcrypt.compare(password, result[0].password))) {
                res.render('login', {
                    login_message: 'Användarnamn eller lösenord är fel'
                })
            } else {
                req.session.userID = result[0].userID;
                db.query('SELECT * FROM account_data WHERE userID = ?', [result[0].userID], (error, result) =>{
                    if (error) {
                        console.log(error);
                    } else {
                        console.log(result[0]);
                        console.log(result[0].cotton);
                        console.log(result[0].cash);
                        console.log(result[0].sell_multiplier);
                        console.log(result[0].click_multiplier);
                        console.log(result[0].passive_cotton);
                        console.log(result[0].both_hands);
                        console.log(result[0].uppg_1_cost);
                        console.log(result[0].uppg_2_cost);
                        console.log(result[0].uppg_3_cost);
                        console.log(result[0].uppg_4_cost);
                        console.log(result[0].uppg_5_cost);
                        console.log(result[0].uppg_6_cost);
                        return res.render('clicker', {
                            cotton_db: result[0].cotton,
                            cash_db: result[0].cash,
                            sell_multiplier_db: result[0].sell_multiplier,
                            click_multiplier_db: result[0].click_multiplier,
                            passive_cotton_db: result[0].passive_cotton,
                            both_hands_db: result[0].both_hands,
                            uppg_1_cost_db: result[0].uppg_1_cost,
                            uppg_2_cost_db: result[0].uppg_2_cost,
                            uppg_3_cost_db: result[0].uppg_3_cost,
                            uppg_4_cost_db: result[0].uppg_4_cost,
                            uppg_5_cost_db: result[0].uppg_5_cost,
                            uppg_6_cost_db: result[0].uppg_6_cost
                        })
                    }
                })
            }
        }
    })
})

// Tar emot poster från clicker
app.post("/save", async (req, res) => {
    const {cotton, cash, sell_multiplier, click_multiplier, passive_cotton, both_hands, uppg_1_cost, uppg_2_cost, uppg_3_cost, uppg_4_cost, uppg_5_cost, uppg_6_cost} = req.body

    db.query('UPDATE account_data SET cotton = ?, cash = ?, sell_multiplier = ?, click_multiplier = ?, passive_cotton = ?, both_hands = ?, uppg_1_cost = ?, uppg_2_cost = ?, uppg_3_cost = ?, uppg_4_cost = ?, uppg_5_cost = ?, uppg_6_cost = ? WHERE userID = ?', [cotton, cash, sell_multiplier, click_multiplier, passive_cotton, both_hands, uppg_1_cost, uppg_2_cost, uppg_3_cost, uppg_4_cost, uppg_5_cost, uppg_6_cost, req.session.userID], (error, result) => {
        if (error) {
            console.log(error);
        } else {
            console.log('data uppdaterad');
            return res.render('clicker', {
                cotton_db: cotton,
                cash_db: cash,
                sell_multiplier_db: sell_multiplier,
                click_multiplier_db: click_multiplier,
                passive_cotton_db: passive_cotton,
                both_hands_db: both_hands,
                uppg_1_cost_db: uppg_1_cost,
                uppg_2_cost_db: uppg_2_cost,
                uppg_3_cost_db: uppg_3_cost,
                uppg_4_cost_db: uppg_4_cost,
                uppg_5_cost_db: uppg_5_cost,
                uppg_6_cost_db: uppg_6_cost
            })
        }
    })
})