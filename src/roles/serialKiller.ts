import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
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

  constructor(owner: PlayerInstance) {
    super(owner, PlayerRole.Crewmate);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const endGame = Services.get(ServiceType.EndGame);
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.owner.setTasks(new Set());

    this.getImpostorButton()?.setMaxTime(gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerCooldown).getValue().value);
    this.setOnClicked(target => this.owner.murder(target));
    this.setTargetSelector(players => players.filter(player => !player.isDead())[0]);

    endGame.registerExclusion(this.owner.getLobby().getSafeGame(), {
      intentName: "impostorDisconnected",
    });

    endGame.registerExclusion(this.owner.getLobby().getSafeGame(), {
      intentName: "crewmateVote",
    });

    endGame.registerExclusion(this.owner.getLobby().getSafeGame(), {
      intentName: "impostorKill",
    });

    endGame.registerExclusion(this.owner.getLobby().getSafeGame(), {
      intentName: "impostorKill",
    });

    this.catch("player.left", event => event.getLobby())
      .execute(event => this.checkEndCriteria(event.getLobby()));

    this.catch("player.kicked", event => event.getLobby())
      .execute(event => this.checkEndCriteria(event.getLobby()));

    this.catch("player.died", event => event.getPlayer().getLobby())
      .execute(event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.catch("player.murdered", event => event.getKiller()).execute(event => this.checkEndCriteria(event.getPlayer().getLobby()));

    this.catch("player.died", event => event.getPlayer())
      .execute(() => {
        endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorDisconnected");
        endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "crewmateVote");
        endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorVote");
        endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorKill");
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
    const endGame = Services.get(ServiceType.EndGame);

    if (lobby.getPlayers()
      .filter(player => !player.isDead() && player !== this.owner).length == 0) {
      endGame.registerEndGameIntent(lobby.getGame()!, {
        endGameData: new Map(lobby.getPlayers()
          .map(player => [player, {
            title: player === this.owner ? "Victory" : "Defeat",
            subtitle: "",
            color: [255, 84, 124, 255],
            yourTeam: [this.owner],
          }])),
        intentName: "serialKilledAll",
      });
    }
  }
}
