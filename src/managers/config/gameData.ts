import * as fs from 'fs';
import * as path from 'path';
import { readFile } from "fs/promises";
import { CoordObject, RoomDefinition } from "../../apiConnector";
import { TriggerDef } from "../../games/utils/triggerManager";
import { CasinoConfig } from "../../games/casino";
import { Logger } from '../../utils/logger';


export interface GameData {
  room?: RoomDefinition;
  botDescription?: string[];

  map?: string;
  maps?: [{name: string, map: string }]; // Pour les jeux avec plusieurs maps
  botPosition?: CoordObject;

  triggersData?: TriggerDef[];

  mongo_db?: string;
  casino?: CasinoConfig;
}

// Get GameData from file
export async function getGameData(game: string, gameName: string): Promise<GameData> {
    const cfgFile = process.argv[2] ?? `./config/games/${game}/${gameName}.json`;
    const configString = await readFile(cfgFile, "utf-8");

    return  JSON.parse(configString) as GameData;
}

export class ResourceLoader {
  private baseDir: string;
  private log: Logger;

  constructor(game: string) {
    this.baseDir = path.resolve(__dirname, `./config/games/${game}/`)
    this.log = new Logger('URES', 'debug', true, 'blue');
  }

  /**
   * Charge une ressource JSON depuis un fichier et valide les données nécessaires.
   * @param gameName Nom de la ressource (par exemple, "yumi1").
   * @returns Les données JSON sous forme d'objet `GameData` ou null si une erreur survient.
   */
  loadResource(gameName: string): GameData | null {
    const filePath = path.join(this.baseDir, `${gameName}.json`);
    if (!fs.existsSync(filePath)) {
      this.log.error(`The file ${filePath} does not exist.`);
      return null;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Validation des données attendues
      if (
        (data.map && typeof data.map !== 'string') ||
        (data.botPosition && typeof data.botPosition !== 'object') ||
        (data.botDescription && !Array.isArray(data.botDescription)) ||
        (data.triggersData && !Array.isArray(data.triggersData))
      ) {
        this.log.error(`The content of file ${gameName}.json isn't valid`);
        return null;
      }

      this.log.error(`The content of the file ${filePath} has been loadd.`);
      return {
        map: data.map,
        botPosition: data.botPosition,
        botDescription: data.botDescription,
        triggersData: data.triggersData,
      };
    } catch (error) {
      this.log.error(`Error while loading ${gameName}.json :`, error);
      return null;
    }
  }
}
