const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./shared/infrastructure/environment');
const PostgresDatabase = require('./shared/infrastructure/postgres-database');
const ErrorHandler = require('./shared/interfaces/error-handler');
const PostgresIdentityRepository = require('./identity-access/infrastructure/postgres-identity-repository');
const JwtTokenService = require('./identity-access/infrastructure/jwt-token-service');
const TotpService = require('./identity-access/infrastructure/totp-service');
const IdentityService = require('./identity-access/application/identity-service');
const IdentityController = require('./identity-access/interfaces/identity-controller');
const AuthenticationMiddleware = require('./identity-access/interfaces/authentication-middleware');
const IdentityRoutes = require('./identity-access/interfaces/identity-routes');
const PostgresProductRepository = require('./product-catalog/infrastructure/postgres-product-repository');
const ExcelProductImporter = require('./product-catalog/infrastructure/excel-product-importer');
const ProductCatalogService = require('./product-catalog/application/product-catalog-service');
const ProductController = require('./product-catalog/interfaces/product-controller');
const ProductRoutes = require('./product-catalog/interfaces/product-routes');
const PostgresInventoryRepository = require('./inventory-management/infrastructure/postgres-inventory-repository');
const InventoryService = require('./inventory-management/application/inventory-service');
const InventoryController = require('./inventory-management/interfaces/inventory-controller');
const InventoryRoutes = require('./inventory-management/interfaces/inventory-routes');
const PostgresSaleRepository = require('./sales-management/infrastructure/postgres-sale-repository');
const PdfReceiptGenerator = require('./sales-management/infrastructure/pdf-receipt-generator');
const SalesProcessingService = require('./sales-management/application/sales-processing-service');
const SalesController = require('./sales-management/interfaces/sales-controller');
const SalesRoutes = require('./sales-management/interfaces/sales-routes');
const PostgresAnalyticsRepository = require('./monitoring-analytics/infrastructure/postgres-analytics-repository');
const CsvReportExporter = require('./monitoring-analytics/infrastructure/csv-report-exporter');
const AnalyticsService = require('./monitoring-analytics/application/analytics-service');
const AnalyticsController = require('./monitoring-analytics/interfaces/analytics-controller');
const AnalyticsRoutes = require('./monitoring-analytics/interfaces/analytics-routes');
const PostgresSubscriptionRepository = require('./subscription-management/infrastructure/postgres-subscription-repository');
const SubscriptionService = require('./subscription-management/application/subscription-service');
const SubscriptionController = require('./subscription-management/interfaces/subscription-controller');
const SubscriptionRoutes = require('./subscription-management/interfaces/subscription-routes');
const PasswordRecoveryMailer = require('./identity-access/infrastructure/password-recovery-mailer');

class Application {
  constructor() {
    this.express = express();
    this.database = new PostgresDatabase(env.database);
    this.configureDependencies();
    this.configureMiddleware();
    this.configureRoutes();
  }

  configureDependencies() {
    const tokenService = new JwtTokenService({ secret: env.jwtSecret, expiresIn: env.jwtExpiresIn });
    const subscriptionService = new SubscriptionService(new PostgresSubscriptionRepository(this.database));
    const identityRepository = new PostgresIdentityRepository(this.database);
    const authentication = new AuthenticationMiddleware({ tokenService, identityRepository });
    const identityController = new IdentityController(new IdentityService({ repository: identityRepository, tokenService, totpService: new TotpService(), subscriptionService, recoveryMailer: new PasswordRecoveryMailer({ config: env.email }) }));
    const productController = new ProductController(new ProductCatalogService({ repository: new PostgresProductRepository(this.database), excelImporter: new ExcelProductImporter() }));
    const inventoryController = new InventoryController(new InventoryService(new PostgresInventoryRepository(this.database)));
    const salesController = new SalesController(new SalesProcessingService({ repository: new PostgresSaleRepository(this.database), receiptGenerator: new PdfReceiptGenerator(), subscriptionService }));
    const analyticsRepository = new PostgresAnalyticsRepository(this.database, env.reportTimeZone);
    const analyticsController = new AnalyticsController(new AnalyticsService({ repository: analyticsRepository, reportExporter: new CsvReportExporter(), timeZone: env.reportTimeZone }), subscriptionService);
    const subscriptionController = new SubscriptionController(subscriptionService);
    this.routes = {
      identity: new IdentityRoutes({ controller: identityController, authentication }).router,
      products: new ProductRoutes({ controller: productController, authentication }).router,
      inventory: new InventoryRoutes({ controller: inventoryController, authentication }).router,
      sales: new SalesRoutes({ controller: salesController, authentication }).router,
      analytics: new AnalyticsRoutes({ controller: analyticsController, authentication }).router,
      subscriptions: new SubscriptionRoutes({ controller: subscriptionController, authentication }).router
    };
  }

  configureMiddleware() {
    this.express.use(helmet());
    this.express.use(cors({ origin: env.frontendOrigin, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'], exposedHeaders: ['Content-Disposition'], credentials: true }));
    this.express.use(express.json({ limit: '2mb' }));
  }

  configureRoutes() {
    this.express.get('/api/health', async (req, res, next) => {
      try { res.json({ status: 'ok', service: 'safestock-analytics-api', database: await this.database.healthCheck() }); } catch (error) { next(error); }
    });
    this.express.use('/api', this.routes.identity);
    this.express.use('/api/productos', this.routes.products);
    this.express.use('/api/inventario', this.routes.inventory);
    this.express.use('/api/ventas', this.routes.sales);
    this.express.use('/api', this.routes.analytics);
    this.express.use('/api/suscripcion', this.routes.subscriptions);
    this.express.use('/api/subscription', this.routes.subscriptions);
    const errors = new ErrorHandler();
    this.express.use(errors.notFound.bind(errors));
    this.express.use(errors.handle.bind(errors));
  }
}

module.exports = new Application().express;
