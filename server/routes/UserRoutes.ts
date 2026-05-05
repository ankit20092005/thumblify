import express  from "express";
import { getThumbnailbyId, getUserThumbnails } from "../controllers/UserController.js";
import protect from "../middlewares/auth.js";

const UserRoute = express.Router() ;

UserRoute.get('/thumbnails' , protect , getUserThumbnails) ;
UserRoute.get('/thumbnail/:id' , protect , getThumbnailbyId) ;

export default UserRoute ;