import { Router } from 'express';
import jwt from 'jsonwebtoken';
const router = Router();
import { BAD_REQUEST } from '../constants/httpStatus.js';
import handler from 'express-async-handler';
import { UserModel } from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.mid.js';
import admin from '../middleware/admin.mid.js';
const PASSWORD_HASH_SALT_ROUNDS = 10;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated user ID
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         isAdmin:
 *           type: boolean
 *         isBlocked:
 *           type: boolean
 *         token:
 *           type: string
 */

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Username or password is invalid
 */
router.post(
    '/login',
    handler(async (req, res) => {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email: email });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.send(generateTokenResponse(user));
            return;
        }

        res.status(BAD_REQUEST).send('Username or password is invalid');
    })
);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: User already exists
 */
router.post(
    '/register',
    handler(async (req, res) => {
        const { name, email, password, address } = req.body;
        const user = await UserModel.findOne({ email });

        if (user) {
            res.status(BAD_REQUEST).send('User already exists, please login!');
            return;
        }

        const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_SALT_ROUNDS);

        const newUser = {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            address,
        };

        const result = await UserModel.create(newUser);
        res.send(generateTokenResponse(result));
    })
);

/**
 * @swagger
 * /api/users/updateProfile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put(
    '/updateProfile',
    auth,
    handler(async (req, res) => {
        const { name, address } = req.body;
        const user = await UserModel.findByIdAndUpdate(
            req.user.id,
            { name, address },
            { new: true }
        );

        res.send(generateTokenResponse(user));
    })
);

/**
 * @swagger
 * /api/users/changePassword:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Change password failed
 */
router.put(
    '/changePassword',
    auth,
    handler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const user = await UserModel.findById(req.user.id);

        if (!user) {
            res.status(BAD_REQUEST).send('Change Password Failed!');
            return;
        }

        const equal = await bcrypt.compare(currentPassword, user.password);

        if (!equal) {
            res.status(BAD_REQUEST).send('Current Password Is Not Correct!');
            return;
        }

        user.password = await bcrypt.hash(newPassword, PASSWORD_HASH_SALT_ROUNDS);
        await user.save();

        res.send('success');
    })
);

/**
 * @swagger
 * /api/users/getall/{searchTerm}:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchTerm
 *         schema:
 *           type: string
 *         required: false
 *         description: Search term to filter users by name
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get(
    '/getall/:searchTerm?',
    admin,
    handler(async (req, res) => {
        const { searchTerm } = req.params;

        const filter = searchTerm
            ? { name: { $regex: new RegExp(searchTerm, 'i') } }
            : {};

        const users = await UserModel.find(filter, { password: 0 });
        res.send(users);
    })
);

/**
 * @swagger
 * /api/users/toggleBlock/{userId}:
 *   put:
 *     summary: Toggle user block status (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of user to toggle block status
 *     responses:
 *       200:
 *         description: Block status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
 *       400:
 *         description: Can't block yourself
 */
router.put(
    '/toggleBlock/:userId',
    admin,
    handler(async (req, res) => {
        const { userId } = req.params;

        if (userId === req.user.id) {
            res.status(BAD_REQUEST).send("Can't block yourself!");
            return;
        }

        const user = await UserModel.findById(userId);
        user.isBlocked = !user.isBlocked;
        user.save();

        res.send(user.isBlocked);
    })
);

const generateTokenResponse = user => {
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '30d',
        }
    );

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        address: user.address,
        isAdmin: user.isAdmin,
        token,
    };
};

export default router;