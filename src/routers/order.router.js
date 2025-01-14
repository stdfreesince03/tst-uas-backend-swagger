import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import {BAD_REQUEST, UNAUTHORIZED} from '../constants/httpStatus.js';
import { OrderModel } from '../models/order.model.js';
import { OrderStatus } from '../constants/orderStatus.js';
import { UserModel } from '../models/user.model.js';

const router = Router();
router.use(auth);

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         food:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             price:
 *               type: number
 *         quantity:
 *           type: number
 *         price:
 *           type: number
 *
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         totalPrice:
 *           type: number
 *         paymentId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [NEW, PAID, FAILED]
 *         user:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/orders/create:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/OrderItem'
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Cart Is Empty!
 */
router.post(
    '/create',
    handler(async (req, res) => {
        const order = req.body;
        if (order.items.length <= 0) res.status(BAD_REQUEST).send('Cart Is Empty!');

        const newOrder = new OrderModel({ ...order, user: req.user.id });
        await newOrder.save();
        res.send(newOrder);
    })
);

/**
 * @swagger
 * /api/orders/pay:
 *   put:
 *     summary: Pay for an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Order Not Found!
 */
router.put(
    '/pay',
    handler(async (req, res) => {
        const { paymentId } = req.body;
        const order = await getNewOrderForCurrentUser(req);
        if (!order) {
            res.status(BAD_REQUEST).send('Order Not Found!');
            return;
        }

        order.paymentId = paymentId;
        order.status = OrderStatus.PAYED;
        await order.save();

        res.send(order._id);
    })
);

/**
 * @swagger
 * /api/orders/track/{orderId}:
 *   get:
 *     summary: Track an order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized access
 */
router.get(
    '/track/:orderId',
    handler(async (req, res) => {
        const { orderId } = req.params;
        const user = await UserModel.findById(req.user.id);

        const filter = {
            _id: orderId,
        };

        if (!user.isAdmin) {
            filter.user = user._id;
        }

        const order = await OrderModel.findOne(filter);

        if (!order) return res.send(UNAUTHORIZED);

        return res.send(order);
    })
);

/**
 * @swagger
 * /api/orders/order/{orderId}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Order not found
 *       500:
 *         description: Internal Server Error
 */
router.get(
    '/order/:orderId',
    handler(async (req, res) => {
        const {orderId} = req.params;
        try {
            let order = await getOrder(orderId);
            if (!order) {
                await new Promise(resolve => setTimeout(resolve, 5));
                order = await getOrder(req);
            }
            if (!order) {
                return res.status(BAD_REQUEST).send();
            }
            return res.send(order);
        } catch (error) {
            console.error('Error fetching order:', error);
            return res.status(500).send('Internal Server Error');
        }
    })
);

/**
 * @swagger
 * /api/orders/allstatus:
 *   get:
 *     summary: Get all possible order statuses
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all order statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [NEW, PAID, FAILED]
 */
router.get('/allstatus', (req, res) => {
    const allStatus = Object.values(OrderStatus);
    res.send(allStatus);
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPaid:
 *                 type: boolean
 *               isExpired:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid status update
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal Server Error
 */
router.put('/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isPaid, isExpired } = req.body;

        let newStatus;
        if (isExpired) {
            newStatus = OrderStatus.FAILED;
        } else if (isPaid) {
            newStatus = OrderStatus.PAID;
        } else {
            return res.status(400).send({
                error: true,
                message: 'Invalid status update. Either isPaid or isExpired must be true.',
            });
        }

        const order = await OrderModel.findByIdAndUpdate(
            id,
            { status: newStatus },
            { new: true }
        );

        if (!order) {
            return res.status(404).send({
                error: true,
                message: 'Order not found',
            });
        }

        return res.status(200).send({
            success: true,
            message: `Order status updated to ${newStatus}`,
            data: order,
        });
    } catch (err) {
        console.error('Error updating order status:', err);
        return res.status(500).send({
            error: true,
            message: 'An internal server error occurred',
        });
    }
});

/**
 * @swagger
 * /api/orders/{status}:
 *   get:
 *     summary: Get orders by status (optional)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [NEW, PAID, FAILED]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get(
    '/:status?',
    handler(async (req, res) => {
        const status = req.params.status;
        const user = await UserModel.findById(req.user.id);
        const filter = {};

        if (!user.isAdmin) filter.user = user._id;
        if (status) filter.status = status;

        const orders = await OrderModel.find(filter).sort('-createdAt');
        res.send(orders);
    })
);

const getOrder = async (orderId) =>
    await OrderModel.findById(orderId);

export default router;