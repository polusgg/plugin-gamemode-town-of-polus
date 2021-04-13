import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { GameOverReason } from "@nodepolus/framework/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";

export class AssassinManager extends BaseManager {
  getId(): string { return "assassin" }
  getTypeName(): string { return "Assassin" }
}

export class Assassin extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Assassin",
    alignment: RoleAlignment.Neutral,
  };

  protected canceledWinReasons: GameOverReason[] = [
    GameOverReason.CrewmateDisconnect,
    GameOverReason.ImpostorDisconnect,
    GameOverReason.CrewmatesByVote,
    GameOverReason.ImpostorsByKill,
  ];

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady);
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const roleManager = Services.get(ServiceType.RoleManager);

    this.owner.setTasks(new Set());

    //pov you're assassin and you CAN kill the impostors

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: this.owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
      button.on("clicked", () => {
        const target = button.getTarget(this.owner.getLobby().getOptions().getKillDistance());

        if (target === undefined) {
          return;
        }

        target.murder(this.owner);
      });
    });

    this.catch("player.murdered", event => event.getKiller()).execute(event => {
      if (event.getPlayer().getLobby().getPlayers()
        .filter(player => player.isDead()).length == 1 && this.owner.isDead()) {
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => roleManager.setEndGameData(player.getSafeConnection(), {
            title: "Defeat",
            subtitle: "The assassin killed everyone",
            color: [255, 84, 124, 255],
            yourTeam: [this.owner],
          }));
        roleManager.endGame(event.getKiller().getLobby().getSafeGame());
      }
    });

    this.catch("game.ended", event => event.getGame()).execute(event => {
      if (!this.owner.isDead() && this.canceledWinReasons.includes(event.getReason())) {
        event.cancel();
      }
      //this looks like its already done? => this should only occur if the owner isn't dead
    });
  }

  getManagerType(): typeof BaseManager {
    return AssassinManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Assassin",
      subtitle: "Kill everyone",
      color: [255, 84, 124, 255],
    };
  }
}
