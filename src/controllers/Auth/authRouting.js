import express from "express"
import * as authController from "./authController.js"
import { asyncHandler } from "../../utilis/ErrorHandling.js"
import { fileType, fileUpload } from "../../utilis/multer.js"
const router = express.Router()

router.post("/register", fileUpload(fileType.image).single("idCardImage"), asyncHandler(authController.register))
// router.post("/register/teacher", fileUpload(fileType.pdf).single("idCardImage"), asyncHandler(authController.registerAsTeacher))
router.post("/login", asyncHandler(authController.login))




export default router