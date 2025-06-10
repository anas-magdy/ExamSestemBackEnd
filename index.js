import "./src/utilis/envConfig.js"
import "./src/workers/teacherWorker.js"
import express from "express";

import { initApp } from "./src/initApp.js";
import { PrismaClient } from './src/generated/prisma/index.js';

const app = express();

export const prisma = new PrismaClient();

initApp(app, express);

// لا تستخدم app.listen() هنا

// صدّر التطبيق بشكل افتراضي

app.listen(process.env.PORT, () => {
    console.log("server connected");

})

export default app;
