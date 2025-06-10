import { ResError } from "../../utilis/ErrorHandling.js";
import { prisma } from "../../../index.js";

export const createExam = async (req, res, next) => {
    const { id } = req.user
    console.log(id);
    const { name, grade, duration, questions } = req.body;
    const teacher = await prisma.teacher.findUnique({ where: { userId: id } })
    if (!teacher || teacher.status != "Confirmed") {
        return next(new ResError("teacher not found", 400))
    }
    const exam = await prisma.exam.create({
        data: {
            duration,
            grade,
            name,
            teacherId: teacher.id,
            questions: {
                create: questions.map((q) => ({
                    theQuestion: q.theQuestion,
                    options: {
                        create: q.options.map((opt) => ({
                            option: opt.option,
                            key: opt.key,
                            isCorrect: opt.isCorrect,
                        })),
                    },
                })),
            },
        },
        include: {
            questions: {
                include: {
                    options: true,
                },
            },
        },
    });
    if (!exam) {
        return next(ResError("exam creation field", 400))
    }
    return res.status(201).json({ message: "success", data: exam })
};


export const getSpecificExam = async (req, res, next) => {
    const { id } = req.params
    const exam = await prisma.exam.findUnique({ where: { id }, include: { questions: { include: { options: true } } } })
    if (!exam) return next(new ResError("Exam not found", 400));
    return res.status(201).json({ message: "success", data: exam })
};

export const editExam = async (req, res, next) => {
    const { id } = req.params;
    const { name, questions, grade, duration } = req.body;
    if (!req.body || Object.keys(req.body).length === 0) return next(new ResError("not data existed To update", 400));
    // Check if exam exists
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return next(new ResError("Exam not found", 400));

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (grade ) dataToUpdate.grade = grade;
    if (duration) dataToUpdate.duration = duration;
    // Update exam name
    if (Object.keys(dataToUpdate).length > 0) {
        await prisma.exam.update({
            where: { id },
            data:  dataToUpdate 
        });
    }

    // Get existing questions IDs to track deletions
    const existingQuestions = await prisma.question.findMany({
        where: { examId: id },
        select: { id: true }
    });
    const existingQuestionIds = existingQuestions.map(q => q.id);


    // Track updated/added question IDs
    const processedQuestionIds = [];

    // Loop through submitted questions
    if (questions && questions.length > 0) {
        for (const q of questions) {
            // UPDATE EXISTING QUESTION
            if (q.id) {
                processedQuestionIds.push(q.id);
                await prisma.question.update({
                    where: { id: q.id },
                    data: { theQuestion: q.theQuestion }
                });

                if (q.options && q.options.length > 0) {
                    for (const opt of q.options) {
                        if (opt.id) {
                            await prisma.option.update({
                                where: { id: opt.id },
                                data: {
                                    option: opt.option,
                                    isCorrect: opt.isCorrect,
                                    key: opt.key
                                }
                            });
                        } else {
                            await prisma.option.create({
                                data: {
                                    questionId: q.id,
                                    option: opt.option,
                                    isCorrect: opt.isCorrect,
                                    key: opt.key
                                }
                            });
                        }
                    }
                }
            }

            // CREATE NEW QUESTION
            else {
                if (!q.options || q.options.length === 0) continue;
                const newQuestion = await prisma.question.create({
                    data: {
                        theQuestion: q.theQuestion,
                        examId: id,
                        options: {
                            create: q.options.map(opt => ({
                                option: opt.option,
                                key: opt.key,
                                isCorrect: opt.isCorrect
                            }))
                        }
                    }
                });
                processedQuestionIds.push(newQuestion.id);
            }
        }

        // DELETE removed questions
        const questionsToDelete = existingQuestionIds.filter(oldId => !processedQuestionIds.includes(oldId));
        if (questionsToDelete.length > 0) {
            await prisma.question.deleteMany({
                where: {
                    id: { in: questionsToDelete }
                }
            });
        }
    }

    // Return updated exam with questions and options
    const updatedExam = await prisma.exam.findUnique({
        where: { id },
        include: {
            questions: {
                include: { options: true }
            }
        }
    });

    return res.status(200).json({
        success: true,
        message: "Exam updated successfully.",
        data: updatedExam
    });
};

export const deleteSpecificExam = async (req, res, next) => {
    const { id } = req.params
    const examIsExist = await prisma.exam.findUnique({ where: { id } })
    if (!examIsExist) return next(new ResError("Exam not found", 400));
    const exam = await prisma.exam.delete({ where: { id } })
    return res.status(201).json({ message: "success", data: exam })
};


export const getAllStudentsSubmitedTheExam = async (req, res, next) => {
    const { id } = req.params;

    const examIsExist = await prisma.exam.findUnique({ where: { id } });
    if (!examIsExist) return next(new ResError("Exam not found", 400));
    const stats = await prisma.$queryRaw`
    select 
      count(*) filter (where score > ${examIsExist.grade / 2}) as passed,
      count(*) filter (where score < ${examIsExist.grade / 2}) as failed,
      count(*) filter (where score = ${examIsExist.grade / 2}) as accepted
    from "studentExam"
    where "examId" = ${id}
  `;

    const formattedStats = Object.fromEntries(
        Object.entries(stats[0]).map(([key, value]) => [key, Number(value)])
    );

    const examSubmissions = await prisma.studentExam.findMany({
        where: { examId: id },
        include: {
            student: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        }
    });

    let detailedStudents = examSubmissions.map((submission) => {
        let percentage = (submission.score / examIsExist.grade) * 100
        let status = "accepted"
        if (submission.score > (examIsExist.grade / 2)) status = "passed"
        else if (submission.score < (examIsExist.grade / 2)) status = "failed"

        return {
            ...submission,
            status,
            percentage: Number(percentage).toFixed(1)
        }
    })

    return res.status(200).json({ message: "success", data: { stats: formattedStats, student: detailedStudents } });
};


