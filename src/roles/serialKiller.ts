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
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";

export class SerialKillerManager extends BaseManager {
  getId(): string { return "serial_killer" }
  getTypeName(): string { return "Serial Killer" }
}

export class SerialKiller extends Impostor {
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

  protected won = false;

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReadyImpostor.bind(this));
    } else {
      this.onReadyImpostor();
    }
  }

  onReadyImpostor(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.owner.setTasks(new Set());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("Global").getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerCooldown).getValue().value,
      position: new Vector2(2.1, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      if (button.getCurrentTime() != 0) {
        return;
      }

      button.reset();

      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
      button.on("clicked", () => {
        const target = button.getTarget(this.owner.getLobby().getOptions().getKillDistance());

        if (target === undefined) {
          return;
        }

        this.owner.murder(target);
      });
    });

    this.owner.getLobby().getServer().on("player.left", event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.owner.getLobby().getServer().on("player.kicked", event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.owner.getLobby().getServer().on("player.exiled", event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.catch("player.murdered", event => event.getPlayer()).execute(event => {
      this.checkEndCriteria(event.getKiller().getLobby());
    });

    this.catch("game.ended", event => event.getGame()).execute(event => {
      if ((!this.owner.isDead() && this.canceledWinReasons.includes(event.getReason())) || this.won) {
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
      this.won = true;
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
