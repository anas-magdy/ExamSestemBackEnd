import express from "express"
import * as teacherController from "./teacherController.js"
import { asyncHandler } from "../../utilis/ErrorHandling.js"
const router = express.Router()

router.get("/", asyncHandler(teacherController.getAllTeacher))
router.get("/:id/exams", asyncHandler(teacherController.getTeacherExams))
// router.put("/:id/edit", asyncHandler(teacherController.editteacher))




export default router