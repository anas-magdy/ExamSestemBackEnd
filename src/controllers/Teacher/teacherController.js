import { ResError } from "../../utilis/ErrorHandling.js";
import { prisma } from "../../../index.js";
import cloudinary from "../../utilis/cloudinary.js";
import { methodsWillUsed } from "../../utilis/methodsWillUse.js";
import amqplib from "amqplib"
import { sendDataToQueue } from "../../utilis/rabbitMq.js";

//get all teachers
export const getAllTeacher = async (req, res, next) => {
    const getAllTeachers = await prisma.teacher.findMany({ include: { user: true,Exam:true }})
    return res.status(201).json({ message: "success", data: getAllTeachers })
};

// get all exams belongs to one teacher
export const getTeacherExams = async (req, res, next) => {
    const { id } = req.params;

    const teacher = await prisma.teacher.findFirst({
        where: {
            OR: [
                { id },
                { userId: id }
            ]
        }
    });

    if (!teacher) {
        return next(new ResError("teacher not exist", 400));
    }

    const getAllTeacherExams = await prisma.teacher.findUnique({
        where: { id: teacher.id },
        include: {
            Exam: {
                include: {
                    questions: {
                        include: { options: true }
                    }
                }
            }
        }
    });

    // console.log();

    if (!getAllTeacherExams?.Exam || getAllTeacherExams.Exam.length === 0) {
        return next(new ResError("teacher exams not exist", 400));
    }

    return res.status(200).json({
        message: "success",
        data: getAllTeacherExams
    });
};








