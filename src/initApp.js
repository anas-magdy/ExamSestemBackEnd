import authRouter from "./controllers/Auth/authRouting.js"
import examRouter from "./controllers/Exam/examRouting.js"
import teacherRouter from "./controllers/Teacher/teacherRouting.js"
import studentRouter from "./controllers/Student/studentRouting.js"
import { globalError } from "./utilis/ErrorHandling.js"
import cors from "cors"

export const initApp = function (app, express) {
    app.use(cors({
        origin: ['http://localhost:4200', "https://exam-system-six.vercel.app", "*"],
        credentials: true,
    }));
    app.use(express.json())
    app.use("/api/v1/auth", authRouter)
    app.use("/api/v1/exam", examRouter)
    app.use("/api/v1/teacher", teacherRouter)
    app.use("/api/v1/student", studentRouter)
    app.get("/", (req, res, next) => {
        res.json({ message: "Hello" })
    })
    app.use(globalError)
}



