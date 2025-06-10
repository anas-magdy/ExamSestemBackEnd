import express from "express"
import * as studentController from "./studentController.js"
import { asyncHandler } from "../../utilis/ErrorHandling.js"
import { authMiddleware, roles } from "../../middleWare/authMiddleware.js"
const router = express.Router()

router.post("/", authMiddleware([roles.STUDENT]), asyncHandler(studentController.studentSubmitExam))
// router.get("/exam/:id", asyncHandler(studentController.getstudentExam))




export default router