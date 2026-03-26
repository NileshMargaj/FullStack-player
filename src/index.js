import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import connectDB from "./db/db.js";
import { app } from "./app.js";




connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT || 8000}`);
        })
    })
    .catch((err) => {
        console.error("Failed to connect to the database:", err);
    });