import { Router } from 'express';
import { 
  getClients, 
  getClient, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../controllers/clientController';
import { authenticateToken } from '../middleware/auth';
import { 
  validateInput, 
  swissValidationRules,
  auditLogger 
} from '../middleware/security';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/clients
 * @desc Get all clients for authenticated user
 * @access Private
 */
router.get('/', 
  auditLogger('CLIENT_LIST_ACCESS'),
  getClients
);

/**
 * @route POST /api/clients
 * @desc Create new client
 * @access Private
 */
router.post('/', 
  auditLogger('CLIENT_CREATION'),
  createClient
);

/**
 * @route GET /api/clients/:id
 * @desc Get specific client
 * @access Private
 */
router.get('/:id', 
  auditLogger('CLIENT_ACCESS'),
  getClient
);

/**
 * @route PUT /api/clients/:id
 * @desc Update client
 * @access Private
 */
router.put('/:id', 
  auditLogger('CLIENT_UPDATE'),
  updateClient
);

/**
 * @route DELETE /api/clients/:id
 * @desc Delete client
 * @access Private
 */
router.delete('/:id', 
  auditLogger('CLIENT_DELETION'),
  deleteClient
);

export default router;