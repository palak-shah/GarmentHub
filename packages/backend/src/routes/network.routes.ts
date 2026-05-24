import { Router } from 'express';
import { NetworkController } from '../controllers/network.controller';
import { authenticate, authorize } from '../middleware/auth';

export const networkRoutes = Router();

networkRoutes.use(authenticate);

networkRoutes.get('/stories', NetworkController.stories);
networkRoutes.get(
  '/traders/:traderId/insights',
  authorize('VENDOR'),
  NetworkController.traderInsights,
);
networkRoutes.get('/connections', NetworkController.connections);
networkRoutes.get('/suggestions', NetworkController.suggestions);
networkRoutes.get('/search', NetworkController.search);
networkRoutes.get('/invite-code', authorize('TRADER', 'VENDOR'), NetworkController.getInviteCode);
networkRoutes.post('/connect-invite', NetworkController.connectViaInvite);
networkRoutes.post(
  '/connect-trader/:traderId',
  authorize('VENDOR'),
  NetworkController.vendorConnectTrader,
);
networkRoutes.post('/follow/:userId', NetworkController.follow);
networkRoutes.delete('/unfollow/:userId', NetworkController.unfollow);
