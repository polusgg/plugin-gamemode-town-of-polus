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
import { AllowTaskInteractionPacket } from "@polusgg/plugin-polusgg-api/src/packets/root/allowTaskInteractionPacket";

export class SerialKillerManager extends BaseManager {
  getId(): string { return "serial_killer" }
  getTypeName(): string { return "Serial Killer" }
}

const COLOR = "#ff547c";

const SERIALKILLER_DEAD_STRING = `<color=${COLOR}>Role: Serial Killer</color>
<color=#ff1919>You're dead.</color>
Fake Tasks:`;

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
      owner.getSafeConnection().writeReliable(new AllowTaskInteractionPacket(false));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
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
    return `<color=${COLOR}>Role: Serial Killer
Kill everyone.</color>
Fake Tasks:`;
  }

  private checkEndCriteria(lobby: LobbyInstance, player?: PlayerInstance): void {
    if (this.unexcluded) {
      return;
    }

    const endGame = Services.get(ServiceType.EndGame);

    if (player === this.owner) {
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorDisconnected");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "crewmateVote");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorVote");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorKill");
      endGame.unregisterExclusion(this.owner.getLobby().getSafeGame(), "sheriffKill");
      this.unexcluded = true;

      return;
    }

    if (lobby.getPlayers()
      .filter(player2 => !player2.isDead() && !(player2.getMeta<boolean | undefined>("pgg.countAsDead") ?? false) && player2 !== this.owner && !player2.getGameDataEntry().isDisconnected()).length <= 0) {
      endGame.registerEndGameIntent(lobby.getSafeGame()!, {
        endGameData: new Map(lobby.getPlayers()
          .map(player2 => [player2, {
            title: player2 === this.owner ? "Victory" : "<color=#FF1919FF>Defeat</color>",
            subtitle: player2 === this.owner ? "You murdered everyone" : "The <color=${COLOR}>Serial Killer</color> murdered everyone",
            color: [255, 84, 124, 255],
            yourTeam: [this.owner],
            winSound: WinSoundType.ImpostorWin,
          }])),
        intentName: "serialKilledAll",
      });
    }
  }
}
