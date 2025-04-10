import * as fs from 'fs';
import * as path from 'path';
import { CoordObject } from "../../apiConnector";
import { TriggerDef } from "./triggerManager";
import { Logger } from '../../api';


export interface ResourceData {
  map?: string;
  botPosition?: CoordObject;
  botDescription?: string[];
  triggersData?: TriggerDef[];
}

export class ResourceLoader {
  private baseDir: string;
  private log: Logger;

  constructor(game: string) {
    this.baseDir = path.resolve(__dirname, `./resources/games/${game}/`)
    this.log = new Logger('URES', 'debug', true, 'blue');
  }

  /**
   * Charge une ressource JSON depuis un fichier et valide les données nécessaires.
   * @param resourceName Nom de la ressource (par exemple, "yumi1").
   * @returns Les données JSON sous forme d'objet `ResourceData` ou null si une erreur survient.
   */
  loadResource(resourceName: string): ResourceData | null {
    const filePath = path.join(this.baseDir, `${resourceName}.json`);
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
        this.log.error(`The content of file ${resourceName}.json isn't valid`);
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
      this.log.error(`Error while loading ${resourceName}.json :`, error);
      return null;
    }
  }
}
