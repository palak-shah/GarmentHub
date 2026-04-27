import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCuratedShareDto } from '../dto/curation.dto';
import { CurationController } from '../controllers/curation.controller';

const router = Router();

router.use(authenticate);

router.post('/share', authorize('TRADER'), validate(createCuratedShareDto), CurationController.createShare);
router.get('/sent', authorize('TRADER'), CurationController.listSent);
router.get('/received', CurationController.listReceived);
router.put('/read/:shareId', CurationController.markRead);
router.get('/customers', authorize('TRADER'), CurationController.getCustomers);

export const curationRoutes = router;
