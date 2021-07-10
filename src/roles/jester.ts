import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { AssetBundle } from "@nodepolus/framework/src/protocol/polus/assets";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";

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

    Services.get(ServiceType.RoleManager).setBaseRole(this.owner, PlayerRole.Crewmate);

    const connections = owner.getLobby().getConnections();

    // a vote win can never happen within the time it will take for every connection to load the bundle
    // so i'm not refactoring this to use an onready method
    for (let i = 0; i < connections.length; i++) {
      owner.getConnection()!.loadBundle(AssetBundle.loadSafeFromCache("TownOfPolus"));
    }

    if (owner.getConnection() !== undefined) {
      const nameService = Services.get(ServiceType.Name);

      nameService.setFor(owner.getSafeConnection(), owner, nameService.getFor(owner.getSafeConnection(), owner));
    }

    const endGame = Services.get(ServiceType.EndGame);

    owner.setTasks(new Set());

    this.catch("meeting.started", event => event.getGame())
      .where(() => !this.owner.isDead())
      .execute(event => {
        endGame.registerExclusion(event.getGame(), {
          intentName: "impostorVote",
        });
        endGame.registerExclusion(event.getGame(), {
          intentName: "crewmateVote",
        });
      });

    this.catch("meeting.ended", event => event.getGame())
      .where(event => event.getExiledPlayer() !== this.owner)
      .execute(event => {
        endGame.unregisterExclusion(event.getGame(), "impostorVote");
        endGame.unregisterExclusion(event.getGame(), "crewmateVote");
      });

    this.catch("meeting.ended", event => event.getGame())
      .where(event => event.getExiledPlayer() === this.owner)
      .execute(event => {
        endGame.registerEndGameIntent(event.getGame()!, {
          endGameData: new Map(event.getGame().getLobby().getPlayers()
            .map(player => [player, {
              title: player === this.owner ? "Victory" : "Defeat",
              subtitle: player === this.owner ? "You got voted out" : "The jester was voted out",
              color: [255, 84, 124, 255],
              yourTeam: [this.owner],
              winSound: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/JesterSfx.mp3"),
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
