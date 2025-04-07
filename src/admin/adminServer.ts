import express from "express";
import path from 'path';
import { BotManager } from "./botManager";
import { Logger } from "../api";

export class AdminServer {
  private app: express.Application;
  private botManager: BotManager;
  public log: Logger;

  constructor(botManager: BotManager) {
    this.app = express();
    this.botManager = botManager;
    this.log = new Logger("SERV", "debug", true, "cyan");

    // Middleware pour parse les requêtes JSON
    this.app.use(express.json());
    
    // Site statique
    this.app.use(express.static(path.join(__dirname, "./public"))); // Sert la page HTML

    // Routes d'administration
    this.app.get("/bots", (req, res) => {
      res.json(this.botManager.getBotStatus());
    });

    this.app.post("/start-bot", (req, res) => {
      const { botId } = req.body;
      if (botId) {
        this.botManager.startBot(botId);
        res.status(200).send(`Bot ${botId} started`);
      } else {
        res.status(400).send("BotId required");
      }
    });

    this.app.post("/stop-bot", (req, res) => {
      const { botId } = req.body;
      if (botId) {
        this.botManager.stopBot(botId);
        res.status(200).send(`Bot ${botId} stopped`);
      } else {
        res.status(400).send("BotId required");
      }
    });
  }

  public startAdminServer(port: number = 3000) {
    this.app.listen(port, () => {
      console.log("Admin server started on port ", port);
    });
  }
}
