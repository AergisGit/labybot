// triggerManager.ts

import { logger } from "../../api";
import { CoordObject } from '../../apiConnector';
import { MapRegion } from "../../apiMap";

export type TriggerType = "Zone" | "ZoneOut" | "Coord";
export type ActionType = "Whisper" | "Message" | "Effect" | "Door" | "Tile" | "Bond";

export interface TriggerDef {
    name: string;         // Nom du trigger
    type: TriggerType;    // Type : "Zone" ou "Coord"
    x1: number;          // Première coordonnée X
    y1: number;          // Première coordonnée Y
    x2?: number;         // Deuxième coordonnée X (optionnel pour Zone)
    y2?: number;         // Deuxième coordonnée Y (optionnel pour Zone)
    actions?: ActionType[];  // Action à effectuer
    effect?: string;     // Effet associé (optionnel)
    message?: string;    // Message affiché (optionnel)
    link?: string;       // Lien supplémentaire (optionnel)
}

export class Trigger implements TriggerDef  {
  constructor(
    public name: string,
    public type: TriggerType,
    public x1: number,
    public y1: number,
    public x2?: number,
    public y2?: number,
    public actions?: ActionType[],
    public effect?: string,
    public message?: string,
    public link?: string
  ) {}

  // Affiche les détails du trigger
  public display(): void {
    logger.debug(`Trigger: ${this.name}`);
    logger.debug(`Type: ${this.type}`);
    logger.debug(`Coordonnées: (${this.x1}, ${this.y1})` + (this.x2 !== undefined ? ` - (${this.x2}, ${this.y2})` : ""));
    if (this.actions) logger.debug(`Action: ${this.actions}`);
    if (this.effect) logger.debug(`Effet: ${this.effect}`);
    if (this.message) logger.debug(`Message: ${this.message}`);
    if (this.link) logger.debug(`Lien: ${this.link}`);
    logger.debug("-----------------------------");
  }
}

export class TriggerManager {
    constructor(private conn: any) {}

    private triggers: Trigger[] = [];
  

    // Method to add a trigger of type Coord (single coordinates)
    public addCoordTrigger(triggerData: TriggerDef, callback: Function): void {
        const coord: CoordObject = { X: triggerData.x1, Y: triggerData.y1 };
        
        // The callback that will handle the trigger when it's activated
        const triggerCallback = ((data) => {
            return (character: any) => {
                logger.debug(`${data.name} triggered! Action: ${data.actions}`);
                callback(character, data); // Utilise bien la copie locale "data"
            };
        })(triggerData);

      // Adding the trigger to the map using addTileTrigger
      this.conn.chatRoom.map.addTileTrigger(coord, triggerCallback);
    }

    // Method to add a trigger of type Coord (single coordinates)
    public addRegionTrigger(triggerData: TriggerDef, callback: Function): void {
        const region: MapRegion = {
            TopLeft: { X: triggerData.x1, Y: triggerData.y1 },
            BottomRight: { X: triggerData.x2, Y: triggerData.y2 },
        };

        // The callback that will handle the trigger when it's activated
        const triggerCallback = (character: any) => {
            callback(character, triggerData); // Call the main class's callback function with the trigger data
        };
  
      // Adding the trigger to the map using addTileTrigger
      this.conn.chatRoom.map.addEnterRegionTrigger(region, triggerCallback);
    }

    // Method to add a trigger of type Coord (single coordinates)
    public addRegionOutTrigger(triggerData: TriggerDef, callback: Function): void {
        const region: MapRegion = {
            TopLeft: { X: triggerData.x1, Y: triggerData.y1 },
            BottomRight: { X: triggerData.x2, Y: triggerData.y2 },
        };

        // The callback that will handle the trigger when it's activated
        const triggerCallback = (character: any) => {
            callback(character, triggerData); // Call the main class's callback function with the trigger data
        };
    
        // Adding the trigger to the map using addTileTrigger
        this.conn.chatRoom.map.addLeaveRegionTrigger(region, triggerCallback);
    }


    // Ajoute un trigger
    public addTrigger(triggerData: Trigger, callback: Function): void {
        this.triggers.push(triggerData); // on garde la trace des triggers mis en place

        switch(triggerData.type) {
            case "Zone":
                this.addRegionTrigger(triggerData, callback);
                break;
            case "ZoneOut":
                this.addRegionOutTrigger(triggerData, callback);
                break;
            case "Coord":
                this.addCoordTrigger(triggerData, callback);
                break;
            default:
                break;
        }
    }
  
    // Fonction pour ajouter tous les triggers à partir des données structurées
    addTriggersFromData(triggersData: TriggerDef[], callback: Function): void {
        triggersData.forEach(triggerData => {
            const trigger = new Trigger(
                triggerData.name,
                triggerData.type,
                triggerData.x1,
                triggerData.y1,
                triggerData.x2,
                triggerData.y2,
                triggerData.actions,
                triggerData.effect,
                triggerData.message,
                triggerData.link
            );
            this.addTrigger(trigger, callback);  // Ajouter le trigger au TriggerManager
        });
    }

    // Récupère tous les triggers
    public getAllTriggers(): Trigger[] {
      return this.triggers;
    }
  
    // Trouve un trigger par son nom
    public findTriggerByName(name: string): Trigger | undefined {
      return this.triggers.find(trigger => trigger.name === name);
    }
  
    // Filtre les triggers par type (Zone ou Coord)
    public filterTriggersByType(type: TriggerType): Trigger[] {
      return this.triggers.filter(trigger => trigger.type === type);
    }
  
    // Affiche tous les triggers
    public displayAll(): void {
      this.triggers.forEach(trigger => trigger.display());
    }
}
