const bodyParser = require('body-parser');
const express = require('express');
const dbConnect = require('./config/dbConnect');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const PORT = process.env.PORT || 4000 ;
const authRouter = require("./routes/authRoute.js")
const locationRouter = require('./routes/locationRoute')
const employeeRouter = require('./routes/employeeRoute')
const { notFound, errorHandler } = require('./middlerwares/errorHandlers');
const cookieParser = require('cookie-parser');
dbConnect();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
  });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());


app.use('/api/user', authRouter);
app.use('/api/location', locationRouter)

// employee
app.use('/api/employee', employeeRouter)

app.use(notFound);
app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server is starting on ${PORT}`)
});