import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { WorkflowController } from '../controllers/workflow.controller';

const router = Router();

router.use(authenticate);

// Generic — any role can mark product state
router.post('/mark', WorkflowController.markState);
router.post('/mark-bulk', WorkflowController.markBulk);

// Trader-specific workflow views
router.get('/feed', authorize('TRADER'), WorkflowController.feedByState);
router.get('/unseen', authorize('TRADER'), WorkflowController.unseen);
router.get('/unseen-grouped', authorize('TRADER'), WorkflowController.unseenGrouped);
router.get('/counts', authorize('TRADER'), WorkflowController.counts);

export const workflowRoutes = router;
