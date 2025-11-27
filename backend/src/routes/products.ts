import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
} from '../controllers/productController';

const router = Router();

// All product routes require authentication
router.use(authenticateToken);

// GET /api/products - Get all products for authenticated user
router.get('/', getProducts);

// POST /api/products - Create new product
router.post('/', createProduct);

// GET /api/products/:id - Get specific product
router.get('/:id', getProduct);

// PUT /api/products/:id - Update product
router.put('/:id', updateProduct);

// POST /api/products/:id/duplicate - Duplicate product
router.post('/:id/duplicate', duplicateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', deleteProduct);

export default router;