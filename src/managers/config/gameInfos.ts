import * as fs from 'fs';
import * as path from 'path';
import { readFile } from "fs/promises";
import { GameInfosData } from "@shared/types/game";
import { CasinoConfig } from "../../games/casino";
import { Logger } from '../../utils/logger';


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
    this.gameInfos = this.loadGameInfos(this.game, this.gameName);
    this.log.info(`GameInfos initialized for ${this.game} (${this.gameName})`);
  }

  public setGame(game: string, gameName: string) {
    this.game = game;
    this.gameName = gameName;
    this.gameInfos = this.loadGameInfos(this.game, this.gameName);
  }

  // Get the directories under this.baseDir, and return for each game, the name of their files as gameName
  public getGamesList(): Record<string, string[]> {
    const gamesList: Record<string, string[]> = {};
    const games = fs.readdirSync(this.baseDir, { withFileTypes: true });

    for (const game of games) {
      if (game.isDirectory()) {
        const gameDir = path.join(this.baseDir, game.name);
        const files = fs.readdirSync(gameDir, { withFileTypes: true });
  
        const names = files
          .filter(file => file.isFile() && file.name.endsWith('.json'))
          .map(file => file.name.slice(0, -5)); // Remove the '.json' extension
  
        if (names.length > 0) {
          gamesList[game.name] = names;
        }
      }
    }
    this.log.debug(`Game names found: ${JSON.stringify(gamesList)}`);
  
    return gamesList;
  }

  /**
   * Charge une ressource JSON depuis un fichier et valide les données nécessaires.
   * @param game Nom du jeu (par exemple, "laby").
   * @param gameName Nom de la ressource (par exemple, "dustyLabyrinth").
   * @returns Les données JSON sous forme d'objet `GameInfosData` ou null si une erreur survient.
   */
  public loadGameInfos(game: string, gameName: string): GameInfosData | null {
    const filePath = path.join(this.baseDir, `${game}/${gameName}.json`);
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
    const filePath = path.join(this.baseDir, `${newGameInfos.game}/${newGameInfos.gameName}.json`);

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });  // Create directories if they don't exist
      this.log.warn("Config path '", filePath, "' did not exist, directories created.");
    }

    try {
      const fileContent = fs.writeFileSync(filePath, JSON.stringify(newGameInfos, null, 2), 'utf8');
      return true;
    } catch (error) {
      this.log.error(`Error while trying to sava ${newGameInfos.game}/${newGameInfos.gameName}.json :`, error);
      return false;
    }
  }

  /**
 * @returns Les données JSON sous forme d'objet `GameInfosData` ou null si une erreur survient.
 */
  public getGameInfos(game?: string, gameName?: string): GameInfosData | null {
    return this.gameInfos;
  }
}
