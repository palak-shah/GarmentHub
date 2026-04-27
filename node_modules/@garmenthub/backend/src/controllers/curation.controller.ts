import { Request, Response, NextFunction } from 'express';
import { CurationService } from '../services/curation.service';
import { success, created } from '../utils/apiResponse';
import type { CreateCuratedShareDto } from '../dto/curation.dto';

export class CurationController {
  static async createShare(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateCuratedShareDto;
      const lines =
        body.products && body.products.length > 0
          ? body.products
          : (body.productIds ?? []).map((productId) => ({ productId }));
      const share = await CurationService.createShare(
        req.user!.id,
        lines,
        body.customerIds,
        body.note,
        body.orderMode,
      );
      const payload = JSON.parse(JSON.stringify(share)) as unknown;
      created(res, payload, 'Products shared');
    } catch (err) { next(err); }
  }

  static async listSent(req: Request, res: Response, next: NextFunction) {
    try {
      const shares = await CurationService.listSentByTrader(req.user!.id);
      success(res, shares);
    } catch (err) { next(err); }
  }

  static async listReceived(req: Request, res: Response, next: NextFunction) {
    try {
      const shares = await CurationService.listReceivedByCustomer(req.user!.id);
      success(res, shares);
    } catch (err) { next(err); }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await CurationService.markShareRead(req.params.shareId, req.user!.id);
      success(res, { ok: true });
    } catch (err) { next(err); }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await CurationService.getTraderCustomers(req.user!.id);
      success(res, customers);
    } catch (err) { next(err); }
  }
}
