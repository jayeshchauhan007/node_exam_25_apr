const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.post('/', authenticate, authorize('customer'), ctrl.createOrder);
router.get('/', authenticate, authorize('admin'), ctrl.getAllOrders);
router.get('/my', authenticate, authorize('customer'), ctrl.getMyOrders);
router.get('/:id', authenticate, ctrl.getOrder);
router.patch('/:id/status', authenticate, authorize('admin'), ctrl.updateStatus);

module.exports = router;
