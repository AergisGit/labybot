import express, { RequestHandler } from "express";
import path from 'path';
import { createServer } from 'http';
import { setupSocketServer } from './socketServer';
import { GameManager } from "../core/gameManager";
import { apiRoutes } from './routes';
import { Logger } from "../api";

export class AdminServer {
  public log: Logger;
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.log = new Logger("APIS", "debug", true, "cyan");
    this.app = express();
    this.gameManager = gameManager;

    // Middleware to parse JSON requests
    this.app.use(express.json());

    // Serve React application
    this.log.debug('Public path:', path.join(__dirname, './public'));
    this.app.use(express.static(path.join(__dirname, './public')));

    // Créer un serveur HTTP pour inclure WebSocket
    this.httpServer = createServer(this.app);

    // Configurer le serveur WebSocket
    setupSocketServer(this.httpServer, this.gameManager);

    // Route Handlers

    // Un handler pour le fallback React
    const reactFallbackHandler: RequestHandler = (req, res) => {
      this.log.info(`Fallback route hit ?`);// for path: ${req.path}`);
      res.sendFile(path.join(__dirname, './public', 'index.html'));
    };

    // Test api
    const doSomeTest: RequestHandler = (req, res) => {
      const someTest = "I did some test !"
      this.log.debug("someTest");
      res.json({ "info": someTest });
    };

    // Routes

    // Utils
    this.app.get("/api/test", doSomeTest);

    // Vers gameManager
    this.app.use('/api', apiRoutes(this.gameManager));

    // Client React
    this.app.get('/*splat', reactFallbackHandler);

  }

  // Server express that will provide the static http files and  the api
  public startAdminServer(port: number = 3000) {
    this.httpServer.listen(port, () => {
      this.log.info("Admin server started on port ", port);
    });
  }


}
