import * as fs from 'fs';
import * as path from 'path';
import { CoordObject } from "../../apiConnector";
import { TriggerDef } from "./triggerManager";
import { Logger } from '../../api';


export interface ResourceData {
  map: string;
  bot_position: CoordObject;
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
      this.log.error(`Le fichier ${filePath} n'existe pas.`);
      return null;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Validation des données attendues
      if (
        typeof data.map !== 'string' ||
        typeof data.bot_position !== 'object' ||
        !Array.isArray(data.triggersData)
      ) {
        this.log.error(`Le fichier ${resourceName}.json ne contient pas les données attendues.`);
        return null;
      }

      return {
        map: data.map,
        bot_position: data.bot_position,
        triggersData: data.triggersData,
      };
    } catch (error) {
      this.log.error(`Erreur lors du chargement du fichier ${resourceName}.json :`, error);
      return null;
    }
  }
}

/*
// Exemple d'utilisation
const resourceLoader = new ResourceLoader('laby');

// Charger une ressource spécifique
const resourceData = resourceLoader.loadResource('yumi1');
if (resourceData) {
  console.log('Carte :', resourceData.map);
  console.log('Position du bot :', resourceData.bot_position);
  console.log('Données des triggers :', resourceData.triggersData);
}
*/