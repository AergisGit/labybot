/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Console } from 'node:console';

export type loglevel = 'debug' | 'info' | 'warn' | 'error';
export type logColor = 'black' | 'red' | 'green' | 'yellow' |'blue' | 'magenta' | 'cyan' | 'white';

/**
 * Logs according to logLevel
 */
export class Logger extends Console {
    
    private context: string;
    private level: loglevel;
    private isEnabled: boolean;
    private contextColor: string;


    // Mappage des noms de couleurs vers les codes ANSI
    private static colorMap: Record<string, string> = {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m'
    };

    constructor(
        context: string = 'GLOB',
        level: loglevel = 'info',
        isEnabled: boolean = true,
        contextColor: logColor = 'magenta'
    ) {
        const stdout = process.stdout;
        const stderr = process.stderr;
        super(stdout, stderr); // On appelle le constructeur de la classe Console
    
        this.context = context;
        this.level = level;
        this.isEnabled = isEnabled;
        this.contextColor = Logger.colorMap[contextColor] || Logger.colorMap.magenta;
    }

    // Méthode utilitaire pour afficher les logs avec un format standard
    private logWithTimestamp(level: loglevel, message: string, ...args: any[]): void {
        if (!this.isEnabled) return; // Si le logger est désactivé, on ne loggue rien
    
        const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '');
        
        // Définir les couleurs pour chaque niveau
        const levelColors: Record<loglevel, string> = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Vert
            warn: '\x1b[33m',  // Jaune
            error: '\x1b[31m', // Rouge
        };

        const resetColor = '\x1b[0m'; // Réinitialiser la couleur
        const color = levelColors[level] || resetColor;
    
        const formattedMessage = `${color}${level.padEnd(5)}${resetColor} ${timestamp} ${this.contextColor}${this.context}${resetColor} ${message}`;

        // Formater les objets passés dans args pour les avoir sur une seule ligne
        const formattedArgs = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg); // Convertir l'objet en chaîne JSON sur une seule ligne
            }
            return arg; // Pour les autres types de données, les laisser tels quels
        });

        // Log selon le niveau spécifié
        switch (level) {
            case 'error':
                super.error(formattedMessage, ...formattedArgs);
                break;
            case 'warn':
                super.warn(formattedMessage, ...formattedArgs);
                break;
            case 'info':
                super.info(formattedMessage, ...formattedArgs);
                break;
            default: // debug
                super.debug(formattedMessage, ...formattedArgs);
                break;
        }

    }
  
    // Méthodes publiques pour loguer avec différents niveaux
  
    error(message: string, ...args: any[]): void {
        if (['debug', 'info', 'warn', 'error'].includes(this.level)) {
            this.logThis('error', message, ...args); // Appelle la méthode générique log
        }
    }
  

    warn(message: string, ...args: any[]): void {
        if (['debug', 'info', 'warn'].includes(this.level)) {
            this.logThis('warn', message, ...args); // Appelle la méthode générique log
        }
    }
    //retro compatibilté, c'est un log de type warn
    warning(message: string, ...args: any[]): void {
        this.warn(message, ...args);
    }
    //retro compatibilté, c'est un log de type warn
    alert(message: string, ...args: any[]): void {
        this.warn(message, ...args);
    }
    

    info(message: string, ...args: any[]): void {
        if (['debug', 'info'].includes(this.level)) {
            this.logThis('info', message, ...args); // Appelle la méthode générique log
        }
    }
    // retro compatibilté, c'est un log d'info basique
    log(message: string, ...args: any[]): void {
        this.info(message, ...args);
    }

    
    debug(message: string, ...args: any[]): void {
        if (this.level === 'debug') {
            this.logThis('debug', message, ...args); // Appelle la méthode générique log
        }
    }

  
    // Méthode générique qui applique les niveaux
    logThis(level: loglevel , message: string, ...args: any[]): void {
        this.logWithTimestamp(level, message, ...args);
    }
  
    // Permet de basculer entre mode actif/inactif
    enableLogging() {
        this.isEnabled = true;
    }
  
    disableLogging() {
        this.isEnabled = false;
    }
}

//export default Logger;
export const logger = new Logger();
