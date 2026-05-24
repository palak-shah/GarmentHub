import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addGroupMembersDto,
  createCuratedShareDto,
  createCustomerGroupDto,
  updateCustomerGroupDto,
} from '../dto/curation.dto';
import { CurationController } from '../controllers/curation.controller';

const router = Router();

router.use(authenticate);

router.post('/share', authorize('TRADER'), validate(createCuratedShareDto), CurationController.createShare);
router.get('/sent', authorize('TRADER'), CurationController.listSent);
router.get('/received', CurationController.listReceived);
router.get(
  '/shared-photos/:productId',
  authorize('CUSTOMER'),
  CurationController.sharedPhotosForProduct,
);
router.put('/read/:shareId', CurationController.markRead);
router.get('/customers', authorize('TRADER'), CurationController.getCustomers);

router.get('/groups', authorize('TRADER'), CurationController.listCustomerGroups);
router.post('/groups', authorize('TRADER'), validate(createCustomerGroupDto), CurationController.createCustomerGroup);
router.get('/groups/:groupId', authorize('TRADER'), CurationController.getCustomerGroup);
router.patch(
  '/groups/:groupId',
  authorize('TRADER'),
  validate(updateCustomerGroupDto),
  CurationController.updateCustomerGroup,
);
router.delete('/groups/:groupId', authorize('TRADER'), CurationController.deleteCustomerGroup);
router.post(
  '/groups/:groupId/members',
  authorize('TRADER'),
  validate(addGroupMembersDto),
  CurationController.addCustomerGroupMembers,
);
router.delete(
  '/groups/:groupId/members/:customerId',
  authorize('TRADER'),
  CurationController.removeCustomerGroupMember,
);

export const curationRoutes = router;
