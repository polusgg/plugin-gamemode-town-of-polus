import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
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
    alignment: RoleAlignment.Neutral,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus"));

      const nameService = Services.get(ServiceType.Name);

      nameService.setFor(owner.getSafeConnection(), owner, nameService.getFor(owner.getSafeConnection(), owner));
    }

    const endGame = Services.get(ServiceType.EndGame);

    owner.setTasks(new Set());

    this.catch("meeting.ended", event => event.getExiledPlayer()).execute(event => {
      endGame.registerEndGameIntent(event.getGame()!, {
        endGameData: new Map(event.getGame().getLobby().getPlayers()
          .map(player => [player, {
            title: player === this.owner ? "Victory" : "Defeat",
            subtitle: player === this.owner ? "You got voted out" : "The jester was voted out",
            color: [255, 84, 124, 255],
            yourTeam: [this.owner],
          }])),
        intentName: "jesterVoted",
      });
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
