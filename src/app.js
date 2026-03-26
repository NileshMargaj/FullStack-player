import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();


//! MIDDLEWARE
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))



export { app };