import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { SerialKiller } from "./serialKiller";
import { AllowTaskInteractionPacket } from "@polusgg/plugin-polusgg-api/src/packets/root/allowTaskInteractionPacket";
import { getSpriteForRole } from "../..";

export class JesterManager extends BaseManager {
  getId(): string { return "jester" }
  getTypeName(): string { return "Jester" }
}

const COLOR = "#ff8cee";

const JESTER_DEAD_STRING = `<color=${COLOR}>Role: Jester</color>
<color=#ff1919>You're dead.</color>
Fake Tasks:`;

export class Jester extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Jester",
    alignment: RoleAlignment.Neutral,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${this.owner.getName().toString()}`);

    Services.get(ServiceType.RoleManager).setBaseRole(this.owner, PlayerRole.Crewmate);
    owner.getSafeConnection().writeReliable(new AllowTaskInteractionPacket(false));

    const connections = owner.getLobby().getConnections();

    // a vote win can never happen within the time it will take for every connection to load the bundle
    // so i'm not refactoring this to use an onready method
    for (let i = 0; i < connections.length; i++) {
      Services.get(ServiceType.Resource).load(connections[i], AssetBundle.loadSafeFromCache("TownOfPolus"));
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

        if (event.getGame().getLobby().getPlayers()
          .filter(x => x.getMeta<BaseRole>("pgg.api.role") instanceof SerialKiller && !x.isDead() && !x.getGameDataEntry().isDisconnected()).length === 0) {
          endGame.unregisterExclusion(event.getGame(), "crewmateVote");
        }
      });

    this.catch("meeting.ended", event => event.getGame())
      .where(event => event.getExiledPlayer() === this.owner)
      .execute(event => {
        endGame.registerEndGameIntent(event.getGame()!, {
          endGameData: new Map(event.getGame().getLobby().getPlayers()
            .map(player => [player, {
              title: player === this.owner ? "Victory" : "<color=#FF1919FF>Defeat</color>",
              subtitle: player === this.owner ? "You got voted out" : `The <color=${COLOR}>Jester</color> was voted out`,
              color: [255, 140, 238, 255],
              yourTeam: [this.owner],
              winSound: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/JesterSfx.mp3"),
              hasWon: player === this.owner,
            }])),
          intentName: "jesterVoted",
        });
      });

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, JESTER_DEAD_STRING);
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

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Jester
Trick everyone into voting you out.</color>
Fake Tasks:`;
  }
}
