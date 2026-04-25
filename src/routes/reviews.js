const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reviewController');

router.get('/', authenticate, authorize('admin'), ctrl.getAllReviews);
router.post('/:bookId', authenticate, ctrl.createReview);
router.get('/:bookId', ctrl.getBookReviews);
router.delete('/:id', authenticate, ctrl.deleteReview);

module.exports = router;
