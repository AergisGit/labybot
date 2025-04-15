import * as fs from 'fs';
import * as path from 'path';
import { readFile, writeFile } from "fs/promises";
import { CoordObject, RoomDefinition } from "../../apiConnector";
import { TriggerDef } from "../../games/utils/triggerManager";
import { CasinoConfig } from "../../games/casino";
import { Logger } from '../../utils/logger';


export interface GameInfosData {
  game: string;
  gameName: string;

  room?: RoomDefinition;
  botDescription?: string[];

  map?: string;
  maps?: [{ name: string, map: string }]; // Pour les jeux avec plusieurs maps
  botPosition?: CoordObject;

  triggersData?: TriggerDef[];

  mongo_db?: string;
  casino?: CasinoConfig;
}

// Get GameInfos from file
export async function getGameInfos(game: string, gameName: string): Promise<GameInfosData> {
  const cfgFile = `./config/games/${game}/${gameName}.json`;
  const configString = await readFile(cfgFile, "utf-8");

  return JSON.parse(configString) as GameInfosData;
}

export class GameInfos {
  private baseDir: string;
  private log: Logger;
  private game: string;
  private gameName: string;
  private gameInfos: GameInfosData | null = null;

  constructor(game: string, gameName: string) {
    this.baseDir = path.resolve(__dirname, `./config/games/`)
    this.log = new Logger('GINF', 'debug', true, 'blue');
    this.game = game;
    this.gameName = gameName;
  }

  public init() {
    this.gameInfos = this.loadGameInfos();
    this.log.info(`GameInfos initialized for ${this.game} (${this.gameName})`);
  }

  public setGame(game: string, gameName: string) {
    this.game = game;
    this.gameName = gameName;
    this.gameInfos = this.loadGameInfos();
  }

  /**
   * Charge une ressource JSON depuis un fichier et valide les données nécessaires.
   * @param game Nom du jeu (par exemple, "laby").
   * @param gameName Nom de la ressource (par exemple, "dustyLabyrinth").
   * @returns Les données JSON sous forme d'objet `GameInfosData` ou null si une erreur survient.
   */
  public loadGameInfos(): GameInfosData | null {

    const filePath = path.join(this.baseDir, `${this.game}/${this.gameName}.json`);
    if (!fs.existsSync(filePath)) {
      this.log.error(`The file ${filePath} does not exist.`);
      return null;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent) as GameInfosData;

    } catch (error) {
      this.log.error(`Error while loading ${filePath}:`, error);
      return null;
    }
  }

  public saveGameInfos(newGameInfos: GameInfosData): boolean {
    const filePath = path.join(this.baseDir, `${this.game}/${this.gameName}.json`);

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });  // Create directories if they don't exist
      this.log.warn("Config path '", filePath, "' did not exist, directories created.");
    }

    try {
      const fileContent = fs.writeFileSync(filePath, JSON.stringify(newGameInfos, null, 2), 'utf8');
      return true;
    } catch (error) {
      this.log.error(`Error while trying to sava ${this.game}/${this.gameName}.json :`, error);
      return false;
    }
  }

  /**
 * @returns Les données JSON sous forme d'objet `GameInfosData` ou null si une erreur survient.
 */
  public getGameInfos(): GameInfosData | null {
    return this.gameInfos;
  }
}
