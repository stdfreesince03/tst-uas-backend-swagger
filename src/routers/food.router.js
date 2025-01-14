import { Router } from 'express';
import { FoodModel } from '../models/food.model.js';
import handler from 'express-async-handler';
import admin from '../middleware/admin.mid.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Food:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - imageUrl
 *         - cookTime
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated food ID
 *         name:
 *           type: string
 *           description: Name of the food
 *         price:
 *           type: number
 *           description: Price of the food
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags/categories of the food
 *         favorite:
 *           type: boolean
 *           description: Whether the food is marked as favorite
 *         imageUrl:
 *           type: string
 *           description: URL of the food image
 *         origins:
 *           type: array
 *           items:
 *             type: string
 *           description: Origins/cuisines of the food
 *         cookTime:
 *           type: string
 *           description: Time needed to prepare the food
 */

/**
 * @swagger
 * /api/foods:
 *   get:
 *     summary: Get all foods
 *     tags: [Foods]
 *     responses:
 *       200:
 *         description: List of all foods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 *
 *   post:
 *     summary: Add new food (Admin only)
 *     tags: [Foods]
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
 *               - price
 *               - imageUrl
 *               - cookTime
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               favorite:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *               origins:
 *                 type: string
 *                 description: Comma-separated origins
 *               cookTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Food created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *
 *   put:
 *     summary: Update food (Admin only)
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               tags:
 *                 type: string
 *               favorite:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *               origins:
 *                 type: string
 *               cookTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Food updated successfully
 */

/**
 * @swagger
 * /api/foods/tags:
 *   get:
 *     summary: Get all food tags with counts
 *     tags: [Foods]
 *     responses:
 *       200:
 *         description: List of food tags with counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   count:
 *                     type: number
 */

/**
 * @swagger
 * /api/foods/search/{searchTerm}:
 *   get:
 *     summary: Search foods by name
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: searchTerm
 *         required: true
 *         schema:
 *           type: string
 *         description: Term to search in food names
 *     responses:
 *       200:
 *         description: List of matching foods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 */

/**
 * @swagger
 * /api/foods/tag/{tag}:
 *   get:
 *     summary: Get foods by tag
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag to filter foods
 *     responses:
 *       200:
 *         description: List of foods with specified tag
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 */

/**
 * @swagger
 * /api/foods/{foodId}:
 *   get:
 *     summary: Get food by ID
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of food to retrieve
 *     responses:
 *       200:
 *         description: Food details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *
 *   delete:
 *     summary: Delete food (Admin only)
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of food to delete
 *     responses:
 *       200:
 *         description: Food deleted successfully
 */

// Original route implementations...
router.get('/', handler(async (req, res) => {
    const foods = await FoodModel.find({});
    res.send(foods);
}));

router.post('/', admin, handler(async (req, res) => {
    const { name, price, tags, favorite, imageUrl, origins, cookTime } = req.body;

    const food = new FoodModel({
        name,
        price,
        tags: tags.split ? tags.split(',') : tags,
        favorite,
        imageUrl,
        origins: origins.split ? origins.split(',') : origins,
        cookTime,
    });

    await food.save();
    res.send(food);
}));

router.put('/', admin, handler(async (req, res) => {
    const { id, name, price, tags, favorite, imageUrl, origins, cookTime } = req.body;

    await FoodModel.updateOne(
        { _id: id },
        {
            name,
            price,
            tags: tags.split ? tags.split(',') : tags,
            favorite,
            imageUrl,
            origins: origins.split ? origins.split(',') : origins,
            cookTime,
        }
    );

    res.send();
}));

router.delete('/:foodId', admin, handler(async (req, res) => {
    const { foodId } = req.params;
    await FoodModel.deleteOne({ _id: foodId });
    res.send();
}));

router.get('/tags', handler(async (req, res) => {
    const tags = await FoodModel.aggregate([
        { $unwind: '$tags' },
        {
            $group: {
                _id: '$tags',
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                name: '$_id',
                count: '$count',
            },
        },
    ]).sort({ count: -1 });

    const all = {
        name: 'All',
        count: await FoodModel.countDocuments(),
    };

    tags.unshift(all);
    res.send(tags);
}));

router.get('/search/:searchTerm', handler(async (req, res) => {
    const { searchTerm } = req.params;
    const searchRegex = new RegExp(searchTerm, 'i');
    const foods = await FoodModel.find({ name: { $regex: searchRegex } });
    res.send(foods);
}));

router.get('/tag/:tag', handler(async (req, res) => {
    const { tag } = req.params;
    const foods = await FoodModel.find({ tags: tag });
    res.send(foods);
}));

router.get('/:foodId', handler(async (req, res) => {
    const { foodId } = req.params;
    const food = await FoodModel.findById(foodId);
    res.send(food);
}));

export default router;