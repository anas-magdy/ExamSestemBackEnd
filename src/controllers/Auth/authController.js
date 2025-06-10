import { ResError } from "../../utilis/ErrorHandling.js";
import { prisma } from "../../../index.js";
import cloudinary from "../../utilis/cloudinary.js";
import { methodsWillUsed } from "../../utilis/methodsWillUse.js";
import amqplib from "amqplib"
import { sendDataToQueue } from "../../utilis/rabbitMq.js";


export const register = async (req, res, next) => {
    const { name, email, age, password, role, subjectName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return next(new ResError("User already exists", 400));
    }
    
    if (!password) {
        return next(new ResError("Enter strong Password", 400));
    }

    const result = await prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: methodsWillUsed.hash({ plaintext: password }),
                age: Number(age),
                role
            }
        });

        if (user.role === "STUDENT") {
            const student = await prisma.student.create({
                data: {
                    userId: user.id
                }
            });
            return { user, student };
        } else if (user.role === "TEACHER") {
            if (!req.file || !req.file.path) {
                throw new ResError("Teacher must provide an ID card image", 400);
            }
            const teacher = await prisma.teacher.create({
                data: {
                    userId: user.id,
                    subjectName,
                    idCardImage: { public_id: null, secure_url: null }
                }
            });
            await sendDataToQueue("teacher-ocr-registration", {
                filePath: req.file.path,
                teacherId: teacher.id,
                teacherName: user.name,
            });
            return { user, teacher };
        } else {
            throw new ResError("Invalid role", 400);
        }
    });
    const { user, student, teacher } = result;
    if (user.role === "STUDENT") {
        return res.status(201).json({
            message: "User registration successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });
    } else if (user.role === "TEACHER") {
        return res.status(201).json({
            message: "User registration successful",
            data: {
                id: teacher.id,
                status: teacher.status,
                subjectName,
            }
        });
    }
};


export const login = async (req, res, next) => {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return next(new ResError("email or password is not correct", 400))
    }
    if (!methodsWillUsed.compare({ plaintext: password, hashValue: user.password })) {
        return next(new ResError("email or password is not correct", 400))
    }
    if (user.role == "STUDENT") {
        const token = methodsWillUsed.generateToken({ payload: { id: user.id, role: user.role, email: user.email } })
        return res.status(200).json({ message: "success", data: token })
    }
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } })
    if (!teacher) {
        return next(new ResError("email or password is not correct", 400))
    }
    if (teacher.status == "Pending") {
        return next(new ResError("your image card still review", 400))
    }
    if (teacher.status == "Blocked") {
        return next(new ResError("you must connect with custom service", 400))
    }
    const token = methodsWillUsed.generateToken({ payload: { id: user.id, role: user.role, email: user.email } })
    return res.status(200).json({ message: "success", data: token })
} 