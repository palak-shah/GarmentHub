import { Request, Response, NextFunction } from 'express';
import { NetworkService } from '../services/network.service';
import { success } from '../utils/apiResponse';

export class NetworkController {
  static async stories(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NetworkService.getStories(req.user!.id);
      success(res, data);
    } catch (err) { next(err); }
  }

  static async connections(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NetworkService.getConnections(req.user!.id);
      success(res, data);
    } catch (err) { next(err); }
  }

  static async suggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NetworkService.getSuggestions(req.user!.id);
      success(res, data);
    } catch (err) { next(err); }
  }

  static async follow(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NetworkService.follow(req.user!.id, req.params.userId);
      success(res, data, 'Followed');
    } catch (err) { next(err); }
  }

  static async unfollow(req: Request, res: Response, next: NextFunction) {
    try {
      await NetworkService.unfollow(req.user!.id, req.params.userId);
      success(res, null, 'Unfollowed');
    } catch (err) { next(err); }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const data = await NetworkService.searchUsers(q, req.user!.id);
      success(res, data);
    } catch (err) { next(err); }
  }

  static async getInviteCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = await NetworkService.getOrCreateInviteCode(req.user!.id);
      success(res, { code });
    } catch (err) { next(err); }
  }

  static async connectViaInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NetworkService.connectViaInvite(req.body.code, req.user!.id);
      success(res, data, 'Connected');
    } catch (err) { next(err); }
  }
}
