import express, { RequestHandler } from "express";
import path from 'path';
import { GameManager } from "./gameManager";
import { Logger } from "../api";

export class AdminServer {
  private app: express.Application;
  private gameManager: GameManager;
  public log: Logger;

  constructor(gameManager: GameManager) {
    this.app = express();
    this.gameManager = gameManager;
    this.log = new Logger("APIS", "debug", true, "cyan");

    // Middleware to parse JSON requests
    this.app.use(express.json());
    
    // Static website
    this.app.use(express.static(path.join(__dirname, "./public"))); // Sert la page HTML


    // Route Handlers

    // Test api
    const doSomeTest: RequestHandler = (req, res) => {
      const someTest = "I did some test !"
      this.log.debug("someTest");
      res.json({"info": someTest});
    };


    // Get bot status
    const getBotStatusHandler: RequestHandler<{ botId: string }> = (req, res) => {
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) {
        res.status(400).send("Invalid botId");
        this.log.warn(`Could not get status of bot [${botId}].`)
        return
      }
      res.json(this.gameManager.getBotStatus(botId));
    };

    // Get bot Config
    const getBotConfigHandler: RequestHandler<{ botId: string }> = (req, res) => {
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) {
        res.status(400).send("Invalid botId");
        this.log.warn(`Could not get config of bot [${botId}].`)
        return
      }
      res.json(this.gameManager.getBotConfig(botId));
    };

    // Get bot Config
    const getBotDataHandler: RequestHandler<{ botId: string }> = (req, res) => {
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) {
        res.status(400).send("Invalid botId");
        this.log.warn(`Could not get data of bot [${botId}].`)
        return
      }
      res.json(this.gameManager.getBotData(botId));
    };

    // Start bot
    const startBotHandler: RequestHandler = (req, res) => {
      const { botId } = req.body;
      this.log.info(`Start bot [${botId}].`);
      if (botId !== undefined && botId !== null) {
        this.gameManager.startBot(botId);
        res.status(200).send(`Bot ${botId} started`);
      } else {
        res.status(400).send("botId required");
      }
    };

    // Stop bot
    const stopBotHandler: RequestHandler = (req, res) => {
      const { botId } = req.body;
      this.log.info(`Stop bot [${botId}].`);
      if (botId !== undefined && botId !== null) {
        this.gameManager.stopBot(botId);
        res.status(200).send(`Bot ${botId} stopped`);
      } else {
        res.status(400).send("botId required");
      }
    };

    // Restart bot
    const restartBotHandler: RequestHandler = (req, res) => {
      const { botId } = req.body;
      this.log.info(`Restart bot [${botId}].`);
      if (botId !== undefined && botId !== null) {
        this.gameManager.restartBot(botId);
        res.status(200).send(`Bot ${botId} restarted`);
      } else {
        res.status(400).send("botId required");
      }
    };


    // Start game
    const startGameHandler: RequestHandler<{ botId: string }> = (req, res) => {
      const botId = parseInt(req.params.botId);
      this.log.info(`Start game on bot [${botId}].`);
      if (botId !== undefined && botId !== null) {
        this.gameManager.startGame(botId);
        res.status(200).send(`Game started on bot ${botId}`);
      } else {
        res.status(400).send("Invalid botId");
      }
    };

    // Stop game
    const stopGameHandler: RequestHandler<{ botId: string }> = (req, res) => {
      const botId = parseInt(req.params.botId);
      this.log.info(`Stop game on bot [${botId}].`);
      if (botId !== undefined && botId !== null) {
        this.gameManager.stopGame(botId);
        res.status(200).send(`Game stopped on bot ${botId}`);
      } else {
        res.status(400).send("Invalid botId");
      }
    };

    // Restart game
    const restartGameHandler: RequestHandler<{ botId: string }> = (req, res) => {
      const botId = parseInt(req.params.botId);
      this.log.info(`Restart game on bot [${botId}].`);
      if (botId !== undefined && botId !== null) {
        this.gameManager.restartGame(botId);
        res.status(200).send(`Game restarted on bot ${botId}`);
      } else {
        res.status(400).send("Invalid botId");
      }
    };


    // Admin Routes

    // Utils
    this.app.get("/test", doSomeTest);

    // Bot
    this.app.get("/bot/:botId/status", getBotStatusHandler);
    this.app.get("/bot/:botId/config", getBotConfigHandler);
    this.app.get("/bot/:botId/data", getBotDataHandler);

    this.app.post("/bot/:botId/start", startBotHandler);
    this.app.post("/bot/:botId/stop", stopBotHandler);
    this.app.post("/bot/:botId/restart", restartBotHandler);

    // Game
    this.app.post("/bot/:botId/game/start", startGameHandler);
    this.app.post("/bot/:botId/game/stop", stopGameHandler);
    this.app.post("/bot/:botId/game/restart", restartGameHandler);

  }

  // Server express that will provide the static http files and  the api
  public startAdminServer(port: number = 3000) {
    this.app.listen(port, () => {
      this.log.info("Admin server started on port ", port);
    });
  }
}
