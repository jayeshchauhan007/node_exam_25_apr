const router = require('express').Router();
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const upload = require('../utils/upload');
const ctrl = require('../controllers/bookController');

router.get('/', optionalAuth, ctrl.getBooks);
router.get('/:id', ctrl.getBook);
router.post('/', authenticate, authorize('admin'), ctrl.createBook);
router.patch('/:id', authenticate, authorize('admin'), ctrl.updateBook);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteBook);
router.post('/:id/images', authenticate, authorize('admin'), upload.array('images', 5), ctrl.uploadImages);
router.delete('/:id/images/:imageId', authenticate, authorize('admin'), ctrl.deleteImage);

module.exports = router;
