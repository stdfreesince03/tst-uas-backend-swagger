import { Router } from 'express';
import admin from '../middleware/admin.mid.js';
import multer from 'multer';
import handler from 'express-async-handler';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { configCloudinary } from '../config/cloudinary.config.js';

const router = Router();
const upload = multer();

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         imageUrl:
 *           type: string
 *           description: URL of the uploaded image on Cloudinary
 *           example: "https://res.cloudinary.com/example/image/upload/v1234567/sample.jpg"
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload an image (Admin only)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No file uploaded or invalid file
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Upload to Cloudinary failed
 */
router.post(
    '/',
    admin,
    upload.single('image'),
    handler(async (req, res) => {
        const file = req.file;
        if (!file) {
            res.status(BAD_REQUEST).send();
            return;
        }

        const imageUrl = await uploadImageToCloudinary(req.file?.buffer);
        res.send({ imageUrl });
    })
);

const uploadImageToCloudinary = imageBuffer => {
    const cloudinary = configCloudinary();

    return new Promise((resolve, reject) => {
        if (!imageBuffer) reject(null);

        cloudinary.uploader
            .upload_stream((error, result) => {
                if (error || !result) reject(error);
                else resolve(result.url);
            })
            .end(imageBuffer);
    });
};

export default router;