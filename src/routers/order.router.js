import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import {BAD_REQUEST, UNAUTHORIZED} from '../constants/httpStatus.js';
import { OrderModel } from '../models/order.model.js';
import { OrderStatus } from '../constants/orderStatus.js';
import { UserModel } from '../models/user.model.js';

const router = Router();
router.use(auth);

router.post(
  '/create',
  handler(async (req, res) => {
    const order = req.body;
    if (order.items.length <= 0) res.status(BAD_REQUEST).send('Cart Is Empty!');

    // await OrderModel.deleteOne({
    //   user: req.user.id,
    //   status: OrderStatus.NEW,
    // });

    const newOrder = new OrderModel({ ...order, user: req.user.id });
    await newOrder.save();
    res.send(newOrder);
  })
);

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

router.get('/allstatus', (req, res) => {
  const allStatus = Object.values(OrderStatus);
  res.send(allStatus);
});

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
