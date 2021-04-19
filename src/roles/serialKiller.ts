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
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";

export class SerialKillerManager extends BaseManager {
  getId(): string { return "serial_killer" }
  getTypeName(): string { return "Serial Killer" }
}

export class SerialKiller extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Serial Killer",
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
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    this.owner.setTasks(new Set());

    //pov you're assassin and you CAN kill the impostors

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: this.owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.1, 0.7),
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

    this.owner.getLobby().getServer().on("player.left", event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.owner.getLobby().getServer().on("player.kicked", event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.owner.getLobby().getServer().on("player.exiled", event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.catch("player.murdered", event => event.getPlayer()).execute(event => {
      this.checkEndCriteria(event.getKiller().getLobby());
    });

    this.catch("game.ended", event => event.getGame()).execute(event => {
      if (!this.owner.isDead() && this.canceledWinReasons.includes(event.getReason())) {
        event.cancel();
      }
      //this looks like its already done? => this should only occur if the owner isn't dead
    });
  }

  getManagerType(): typeof BaseManager {
    return SerialKillerManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Serial Killer",
      subtitle: "Kill everyone",
      color: [255, 84, 124, 255],
    };
  }

  private checkEndCriteria(lobby: LobbyInstance): void {
    const roleManager = Services.get(ServiceType.RoleManager);

    if (lobby.getPlayers()
      .filter(player => player.isDead()).length == 1 && !this.owner.isDead()) {
      lobby.getPlayers()
        .forEach(async player => roleManager.setEndGameData(player.getSafeConnection(), {
          title: "Defeat",
          subtitle: "The Serial Killer killed everyone",
          color: [255, 84, 124, 255],
          yourTeam: [this.owner],
        }));
      roleManager.endGame(lobby.getSafeGame());
    }
  }
}
