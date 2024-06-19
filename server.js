const express = require('express');
const mysql = require("mysql2");
const fs = require('fs');
const env = require('dotenv').config();
const app = express();
app.listen(3000, () => console.log('listening on port 3000'));
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));


// Create connection to SQL habit_storage
const db = mysql.createConnection({
    host: "env.DB_HOST",
    user: "env.DB_USER",
    password: "env.DB_PW",
    database: "env.DB_NAME"
});
db.connect((err) => {
    if(err) {throw err; }
    console.log("DB Connected... ");

});

let allHabits = [];
// Get all habits from database and send to client as json
app.get('/allhabits', (request, response) =>
{
    let sql = 'SELECT * FROM habits';
    let query = db.query(sql, (err, result) => 
    {
        if(err)
        {
            throw err;
            response.end();
            console.log(err);
        } 
        //console.log(result);
        response.json(result);
    });
});

// Get all records from database and send to client as json
app.get('/allrecords', (request, response) =>
{
    let sql = 'SELECT * FROM records';
    let query = db.query(sql, (err, result) => 
    {
        if(err)
        {
            throw err;
            response.end();
            console.log(err);
        } 
        //console.log(result);
        response.json(result);
    });
});

// Update habit completed number
app.post('/updatehabitrecord', (request, res) => 
{
    // get current datetime to store in record
    const date = new Date();
    let z = date.getTimezoneOffset() * 60 * 1000;
    let dateLocal = date - z;
    dateLocal = new Date(dateLocal);
    let iso = dateLocal.toISOString();
    iso = iso.slice(0, 19);
    iso = iso.replace('T', ' ');

    // console.log(date);
    let post = request.body;
    // Check for init record in records
    let sql = "SELECT * FROM records WHERE EXISTS(SELECT update_num FROM records WHERE records.habit_id = " + post.habit_id + " AND update_num >= 0)";
    let query = db.query(sql, post, (err, result) => 
    {
        if(err) 
        {
            throw err;
            console.log("There was an error: " + err);
        }
        // console.log("initialized check result: " + JSON.stringify(result));
        // If record does not exist for habit
        if(JSON.stringify(result) == "[]")
        {
            console.log("initializing record for habit...");
            let sql = "INSERT INTO records (habit_id, update_num, update_time) VALUES (" + post.habit_id + ", 1, '" + iso + "')";
            let query = db.query(sql, (err, result) => 
            {
                if(err) 
                {
                    throw err;
                    console.log("There was an error: " + err);
                }
                console.log("Habit record initialized...");
            });
        }
        // If record exists for habit
        else
        {
            let getUpdateNum = "SELECT MAX(update_num) FROM records WHERE habit_id=" + "'" + post.habit_id + "'";
            let updateNumQuery = db.query(getUpdateNum, (err, result) => 
            {
                if(err) throw err;
                console.log(result);
                let updateObj = JSON.stringify(result);
                let parsedObj = JSON.parse(updateObj);
                console.log("Parsed object to update: " + parsedObj);
                console.log("Number to update: " + parseInt(parsedObj[0]["MAX(update_num)"]));
                let updateNumUpdated = parseInt(parsedObj[0]["MAX(update_num)"]) + 1;
                let sql = "INSERT INTO records (habit_id, update_num, update_time) VALUES (" + post.habit_id + ", " + updateNumUpdated + ", '" + iso + "')";
                let query = db.query(sql, post, (err, result) => 
                {
                    if(err) throw err;
                    console.log("The updated Record is" + result);
                    //res.send('Posted updated habit...');
                });
            });
        }
    });

});

// Add habit to SQL database
app.post('/subtracthabitrecord', (req, res) => 
{
    let post = req.body;
    let sql = "SELECT MAX(update_num) FROM records WHERE habit_id=" + post.habit_id;
    let query = db.query(sql, (err, result) => 
    {
        if(err) throw err;

        let updateObj = JSON.stringify(result);
        let parsedObj = JSON.parse(updateObj);
        let currentUpdateNum = parseInt(parsedObj[0]["MAX(update_num)"]);
        console.log("Number to update: " + currentUpdateNum);

        let removeSQL = "DELETE FROM records WHERE habit_id=" + post.habit_id + " AND update_num=" + currentUpdateNum;
        let query = db.query(removeSQL, (err, result) => 
        {
            // console.log("Removed: " + result);
        });
    });

    // Add init record to records db
});

// Add habit to SQL database
app.post('/addhabit', (req, res) => 
{
    let post = req.body;
    let sql = 'INSERT INTO habits SET ?';
    let query = db.query(sql, post, (err, result) => 
    {
        if(err) throw err;
        console.log(result);
        //res.send('Posted new habit...');
    });

    // Add init record to records db
});

// Remove habit from SQL database
app.post('/removehabit', (req, res) => 
{
    let jsonObj = req.body;
    let habitName = jsonObj.name;
    let sql = "DELETE FROM records WHERE habit_id=" + jsonObj.habit_id + ";";
    let query = db.query(sql, (err, result) => 
    {
        if(err) throw err;

        let sql2 = "DELETE FROM habits WHERE habit_id=" + jsonObj.habit_id + ";";
        let query = db.query(sql2, (err, result) => 
        {
            if(err) throw err;
            console.log(result);
            console.log("The habit named " + jsonObj.habit_name + " was removed from the database...");
        });
        //res.send('Removed habit...');
    });
});
