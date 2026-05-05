import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectDB from "./configs/db.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import AuthRouter from "./routes/AuthRoutes.js";
import ThumbnailRouter from "./routes/ThumbnailRoutes.js";
import UserRoute from "./routes/UserRoutes.js";

declare module 'express-session'{
    interface SessionData{
        isLoggedIn: boolean ;
        userId: string ;
    }
}

await connectDB()
const app = express();

app.use(cors({
    origin:['http://localhost:5173' , 'http://localhost:5000'] ,
    credentials: true  
})) ;

app.use(session({
    secret: process.env.SESSION_SECRET as string ,
    resave: false ,
    saveUninitialized: false ,
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 7} , //expire in 7 days
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI as string,
        collectionName: 'sessions'
    })
}))

app.use(express.json());

const port = process.env.PORT || 5000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use('/api/auth' , AuthRouter) ;
app.use('/api/thumbnail' , ThumbnailRouter) ;
app.use('/api/user' , UserRoute)

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});