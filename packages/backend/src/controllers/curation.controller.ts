import { Request, Response, NextFunction } from 'express';
import { CurationService } from '../services/curation.service';
import { success, created } from '../utils/apiResponse';
import type {
  AddGroupMembersBody,
  CreateCuratedShareDto,
  CreateCustomerGroupBody,
  UpdateCustomerGroupBody,
} from '../dto/curation.dto';

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
        body.customerIds ?? [],
        body.customerGroupIds ?? [],
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

  static async sharedPhotosForProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await CurationService.sharedPhotosForProduct(req.user!.id, req.params.productId);
      success(res, payload);
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

  static async listCustomerGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await CurationService.listCustomerGroups(req.user!.id);
      success(res, groups);
    } catch (err) { next(err); }
  }

  static async getCustomerGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const group = await CurationService.getCustomerGroup(req.user!.id, req.params.groupId);
      success(res, group);
    } catch (err) { next(err); }
  }

  static async createCustomerGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateCustomerGroupBody;
      const group = await CurationService.createCustomerGroup(req.user!.id, body.name);
      created(res, group, 'Group created');
    } catch (err) { next(err); }
  }

  static async updateCustomerGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdateCustomerGroupBody;
      const group = await CurationService.updateCustomerGroup(req.user!.id, req.params.groupId, body.name);
      success(res, group, 'Group updated');
    } catch (err) { next(err); }
  }

  static async deleteCustomerGroup(req: Request, res: Response, next: NextFunction) {
    try {
      await CurationService.deleteCustomerGroup(req.user!.id, req.params.groupId);
      success(res, null, 'Group deleted');
    } catch (err) { next(err); }
  }

  static async addCustomerGroupMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as AddGroupMembersBody;
      const group = await CurationService.addMembersToCustomerGroup(
        req.user!.id,
        req.params.groupId,
        body.customerIds,
      );
      success(res, group, 'Members added');
    } catch (err) { next(err); }
  }

  static async removeCustomerGroupMember(req: Request, res: Response, next: NextFunction) {
    try {
      await CurationService.removeMemberFromCustomerGroup(
        req.user!.id,
        req.params.groupId,
        req.params.customerId,
      );
      success(res, { ok: true });
    } catch (err) { next(err); }
  }
}
