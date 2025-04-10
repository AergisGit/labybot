
export interface BotInfos {
    botId: number;
    connected: boolean;
    botName: string;
    botNumber: number;
    roomData: {
      Name: string;
      Space: string;
      MapData: {
        Type: string;
      };
      Private: boolean;
      Locked: boolean;
      Visibility: string[];
      Access: string[];
      Admin: string[];
      Character: {
        Name: string;
        MemberNumber: number;
      }[];
      Limit: number;
    };
    roomMap?: string;
    playerCount: number;
    game?: string;
    gameName?: string;
  }
  