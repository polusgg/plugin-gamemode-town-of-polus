import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { GameState, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";
import { RoleDestroyedReason } from "@polusgg/plugin-polusgg-api/src/types/enums/roleDestroyedReason";

export class SerialKillerManager extends BaseManager {
  getId(): string { return "serial_killer" }
  getTypeName(): string { return "Serial Killer" }
}

const SERIALKILLER_DEAD_STRING = `<color=#ff547c>Role: Serial Killer</color>
<color=#ff1919>You're dead.</color>`;

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

    this.catch("player.murdered", e => e.getPlayer()).execute(event => {
    Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, SERIALKILLER_DEAD_STRING);
    });
  }

  onReady(): void {
    const endGame = Services.get(ServiceType.EndGame);
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.getImpostorButton()?.setMaxTime(gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerCooldown).getValue().value);
    this.setOnClicked(async target => this.owner.murder(target));
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
      .execute(event => this.checkEndCriteria(event.getLobby(), event.getPlayer()));

    this.catch("player.kicked", event => event.getLobby())
      .execute(event => this.checkEndCriteria(event.getLobby(), event.getPlayer()));

    this.catch("player.died", event => event.getPlayer().getLobby())
      .execute(event => this.checkEndCriteria(event.getPlayer().getLobby(), event.getPlayer()));

    this.catch("player.murdered", event => event.getPlayer().getLobby())
      .execute(event => this.checkEndCriteria(event.getPlayer().getLobby(), event.getPlayer()));
  }

  onDestroy(destroyReason: RoleDestroyedReason): void {
    if (this.owner.getLobby().getGameState() === GameState.Started && destroyReason === RoleDestroyedReason.Disconnect) {
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

  getDescriptionText(): string {
    return `<color=#ff547c>Role: Serial Killer
Kill everyone.</color>
Fake Tasks:`;
  }

  private checkEndCriteria(lobby: LobbyInstance, player?: PlayerInstance): void {
    if (this.unexcluded) {
      return;
    }

    const endGame = Services.get(ServiceType.EndGame);

    console.log("sussy criteria cereal killer");

    if (player === this.owner) {
      console.log("excluded?????");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorDisconnected");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "crewmateVote");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorVote");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorKill");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "sheriffKill");
      this.unexcluded = true;

      return;
    }

    console.log("serial killer didn't disappear");

    if (lobby.getPlayers()
      .filter(player2 => !player2.isDead() && player2 !== this.owner && !player2.getGameDataEntry().isDisconnected()).length <= 0) {
      endGame.registerEndGameIntent(lobby.getSafeGame()!, {
        endGameData: new Map(lobby.getPlayers()
          .map(player2 => [player2, {
            title: player2 === this.owner ? "Victory" : "<color=#FF1919FF>Defeat</color>",
            subtitle: player2 === this.owner ? "You murdered everyone" : "The <color=#ff547c>Serial Killer</color> murdered everyone",
            color: [255, 84, 124, 255],
            yourTeam: [this.owner],
            winSound: WinSoundType.ImpostorWin,
          }])),
        intentName: "serialKilledAll",
      });
    }
  }
}
