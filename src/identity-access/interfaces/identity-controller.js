class IdentityController {
  constructor(service) {
    this.service = service;
    for (const method of ['login', 'register', 'verify', 'verifyTwoFactor', 'recoverPassword', 'verifyRecoveryCode', 'resetPassword', 'setupTwoFactor', 'enableTwoFactor', 'listUsers', 'createUser', 'updateProfile', 'updateStatus', 'changePassword', 'listAccessHistory']) this[method] = this[method].bind(this);
  }

  metadata(req) { return { ip: req.ip, userAgent: req.get('user-agent') || null }; }
  async login(req, res, next) { try { res.json(await this.service.login(req.body, this.metadata(req))); } catch (e) { next(e); } }
  async register(req, res, next) { try { res.status(201).json(await this.service.register(req.body)); } catch (e) { next(e); } }
  async verify(req, res) { res.json({ valid: true, usuario: req.user }); }
  async verifyTwoFactor(req, res, next) { try { res.json(await this.service.verifyTwoFactor(req.body, this.metadata(req))); } catch (e) { next(e); } }
  async recoverPassword(req, res, next) { try { res.json(await this.service.recoverPassword(req.body.correo)); } catch (e) { next(e); } }
  async verifyRecoveryCode(req, res, next) { try { res.json(await this.service.verifyRecoveryCode(req.body)); } catch (e) { next(e); } }
  async resetPassword(req, res, next) { try { res.json(await this.service.resetPassword(req.body)); } catch (e) { next(e); } }
  async setupTwoFactor(req, res, next) { try { res.json(await this.service.setupTwoFactor(req.user.id)); } catch (e) { next(e); } }
  async enableTwoFactor(req, res, next) { try { res.json(await this.service.enableTwoFactor(req.user.id, req.body.codigo)); } catch (e) { next(e); } }
  async listUsers(req, res, next) { try { res.json(await this.service.listUsers(req.user.organizationId)); } catch (e) { next(e); } }
  async createUser(req, res, next) { try { res.status(201).json(await this.service.createUser(req.body, req.user.organizationId)); } catch (e) { next(e); } }
  async updateProfile(req, res, next) { try { res.json(await this.service.updateProfile(req.user.id, req.body)); } catch (e) { next(e); } }
  async updateStatus(req, res, next) { try { res.json(await this.service.updateStatus({ targetId: req.params.id, requesterId: req.user.id, organizationId: req.user.organizationId, estado: req.body.estado, password: req.body.password })); } catch (e) { next(e); } }
  async changePassword(req, res, next) { try { res.json(await this.service.changePassword(req.user.id, req.body)); } catch (e) { next(e); } }
  async listAccessHistory(req, res, next) { try { res.json(await this.service.listAccessHistory(req.query)); } catch (e) { next(e); } }
}

module.exports = IdentityController;
