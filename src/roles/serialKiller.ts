import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { GameState, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";

export class SerialKillerManager extends BaseManager {
  getId(): string { return "serial_killer" }
  getTypeName(): string { return "Serial Killer" }
}

export class SerialKiller extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Serial Killer",
    alignment: RoleAlignment.Neutral,
  };

  private unexcluded = false;

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
      intentName: "impostorVote",
    });

    endGame.registerExclusion(this.owner.getLobby().getSafeGame(), {
      intentName: "impostorKill",
    });

    endGame.registerExclusion(this.owner.getLobby().getSafeGame(), {
      intentName: "sheriffKill",
    });

    this.catch("player.left", event => event.getLobby())
      // .where(() => this.owner.isDead())
      .execute(event => this.checkEndCriteria(event.getLobby(), event.getPlayer()));

    this.catch("player.kicked", event => event.getLobby())
      .execute(event => this.checkEndCriteria(event.getLobby(), event.getPlayer()));

    this.catch("player.died", event => event.getPlayer().getLobby())
      .execute(event => this.checkEndCriteria(event.getPlayer().getLobby(), event.getPlayer()));

    this.catch("player.murdered", event => event.getPlayer().getLobby())
      .execute(event => this.checkEndCriteria(event.getPlayer().getLobby(), event.getPlayer()));
  }

  onDestroy(): void {
    if (this.owner.getLobby().getGameState() === GameState.Started) {
      this.checkEndCriteria(this.owner.getLobby(), this.owner);
    }
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

  private checkEndCriteria(lobby: LobbyInstance, player?: PlayerInstance): void {
    if (this.unexcluded) {
      return;
    }

    const endGame = Services.get(ServiceType.EndGame);

    console.log("sussy criteria fuck you");

    if (player === this.owner) {
      // console.log("sussy");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorDisconnected");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "crewmateVote");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorVote");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorKill");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "sheriffKill");
      this.unexcluded = true;

      return;
    }

    console.log("sdfafojfsaogipogm[");

    if (lobby.getPlayers()
      .filter(player2 => !player2.isDead() && player2 !== this.owner).length <= 0) {
      endGame.registerEndGameIntent(lobby.getGame()!, {
        endGameData: new Map(lobby.getPlayers()
          .map(player2 => [player2, {
            title: player2 === this.owner ? "Victory" : "Defeat",
            subtitle: "The serial killer murdered everyone",
            color: [255, 84, 124, 255],
            yourTeam: [this.owner],
            winSound: WinSoundType.ImpostorWin,
          }])),
        intentName: "serialKilledAll",
      });
    }
  }
}
