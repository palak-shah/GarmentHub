import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowState } from '@prisma/client';
import { success } from '../utils/apiResponse';

export class WorkflowController {
  static async markState(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, state } = req.body;
      const result = await WorkflowService.markState(req.user!.id, productId, state as WorkflowState);
      success(res, result);
    } catch (err) { next(err); }
  }

  static async markBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const { productIds, state } = req.body;
      await WorkflowService.markBulkState(req.user!.id, productIds, state as WorkflowState);
      success(res, { ok: true });
    } catch (err) { next(err); }
  }

  static async feedByState(req: Request, res: Response, next: NextFunction) {
    try {
      const state = (req.query.state as string) || 'SEEN';
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await WorkflowService.getFeedByState(
        req.user!.id, state as WorkflowState, cursor, limit,
      );
      success(res, result);
    } catch (err) { next(err); }
  }

  static async unseen(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const products = await WorkflowService.getUnseenProducts(req.user!.id, limit);
      success(res, products);
    } catch (err) { next(err); }
  }

  static async unseenGrouped(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 40;
      const groups = await WorkflowService.getUnseenGrouped(req.user!.id, limit);
      success(res, groups);
    } catch (err) { next(err); }
  }

  static async counts(req: Request, res: Response, next: NextFunction) {
    try {
      const counts = await WorkflowService.getStateCounts(req.user!.id);
      success(res, counts);
    } catch (err) { next(err); }
  }
}
