import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";

export class JesterManager extends BaseManager {
  getId(): string { return "jester" }
  getTypeName(): string { return "Jester" }
}

export class Jester extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Jester",
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus"));
    }

    const roleManager = Services.get(ServiceType.RoleManager);

    owner.setTasks(new Set());

    this.catch("meeting.ended", event => event.getExiledPlayer()).execute(event => {
      this.owner.getLobby().getConnections().forEach(connection => {
        roleManager.setEndGameData(connection, {
          title: "Defeated",
          subtitle: "The jester was voted out",
          color: [255, 140, 238, 255],
          yourTeam: [owner],
          displayPlayAgain: true,
          displayQuit: true,
        });
      });

      roleManager.setEndGameData(owner.getConnection(), {
        title: "Victory",
        subtitle: "You got voted out",
        color: [255, 140, 238, 255],
        yourTeam: [owner],
        displayPlayAgain: true,
        displayQuit: true,
      });

      roleManager.endGame(event.getGame());
    });
  }

  getManagerType(): typeof BaseManager {
    return JesterManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Jester",
      subtitle: "Get voted out to win",
      color: [255, 140, 238, 255],
    };
  }
}
