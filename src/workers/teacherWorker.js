import { prisma } from "../../index.js";
import cloudinary from "../utilis/cloudinary.js";
import { consumeFromQueue } from "../utilis/rabbitMq.js";


consumeFromQueue("teacher-ocr-registration", async ({ filePath, teacherId, teacherName }) => {
    console.log({ filePath, teacherId });
    console.log("hello world");
    const { public_id, secure_url } = await cloudinary.uploader.upload(filePath, {
        folder: `exam-management-system/teachers/${teacherName?.toLowerCase()}`,
        ocr: "adv_ocr"  // تنشيط OCR أثناء الرفع
    });
    const result = await cloudinary.api.resource(public_id, {
        ocr: "adv_ocr"
    });

    let ocrText = "No text detected";

    if (result?.info?.ocr?.adv_ocr?.data?.[0]?.fullTextAnnotation?.text) {
        ocrText = result.info.ocr.adv_ocr.data[0].fullTextAnnotation.text;
    }
    else if (result?.info?.ocr?.adv_ocr?.data?.[0]?.textAnnotations?.[0]?.description) {
        ocrText = result.info.ocr.adv_ocr.data[0].textAnnotations[0].description;
    }
    else if (result?.ocr?.adv_ocr?.data) {
        console.log("OCR Data Structure:", JSON.stringify(result.ocr.adv_ocr.data, null, 2));

        if (Array.isArray(result.ocr.adv_ocr.data) && result.ocr.adv_ocr.data.length > 0) {
            if (result.ocr.adv_ocr.data[0].fullTextAnnotation) {
                ocrText = result.ocr.adv_ocr.data[0].fullTextAnnotation.text;
            } else if (result.ocr.adv_ocr.data[0].textAnnotations && result.ocr.adv_ocr.data[0].textAnnotations.length > 0) {
                ocrText = result.ocr.adv_ocr.data[0].textAnnotations[0].description;
            }
        }
    }
    const extractDoctorData = (text) => {
        const nameMatch = text.match(/اسم الطبيب\s*:\s*(.+)/);
        const roleMatch = text.match(/طبيب امتیاز/i);
        const syndicateMatch = text.match(/Syndic[a-z]*/i);
        const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
        const secretaryMatch = text.match(/أ\.د\/\s*([^\n]+)/);
        return {
            doctorName: nameMatch ? nameMatch[1].trim() : null,
            role: roleMatch ? "طبيب امتياز" : null,
            syndicate: syndicateMatch ? "نقابة الأطباء" : null,
            secretaryGeneral: secretaryMatch ? secretaryMatch[1].trim() : null,
            expiryDate: dateMatch ? dateMatch[0] : null,
        };
    };
    const idCardData = extractDoctorData(ocrText)
    const teacher = await prisma.teacher.update({
        where: { id: teacherId }, data: {
            idCardData,
            idCardImage: {
                public_id,
                secure_url
            },
            status: "Confirmed",
        }
    })
    console.log({ teacher });
});