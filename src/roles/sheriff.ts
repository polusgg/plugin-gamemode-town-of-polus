import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { GameOverReason, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { Mutable } from "@nodepolus/framework/src/types";
import { Palette } from "@nodepolus/framework/src/static";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";

export class SheriffManager extends BaseManager {
  getId(): string { return "sheriff" }
  getTypeName(): string { return "Sheriff" }
}

// todo not duplicate code for crewmate wins on sheriff!!!!

export class Sheriff extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Sheriff",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner, PlayerRole.Crewmate);

    Crewmate.setupWinConditions(this);

    const endGame = Services.get(ServiceType.EndGame);

    this.catch("player.murdered", event => event.getPlayer().getLobby())
      .where(event => event.getPlayer().getLobby().getPlayers()
        // player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Impostor
        .filter(player => player.isImpostor() && !player.isDead())
        .length == 0)
      .execute(event => endGame.registerEndGameIntent(event.getPlayer().getLobby().getGame()!, {
        endGameData: new Map(event.getPlayer().getLobby().getPlayers()
          .map(player => [player, {
            title: "Victory",
            // subtitle: "<color=#FF1919FF>Sheriff</color> killed all <color=#C49645FF>Impostors</color>",
            subtitle: "<color=#FF1919FF>Sheriff</color> killed all <color=#C49645FF>Impostors</color>",
            color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
            yourTeam: event.getPlayer().getLobby().getPlayers()
              .filter(sus => sus.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate),
            winSound: WinSoundType.ImpostorWin,
          }])),
        intentName: "sheriffKill",
      }));

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const button = this.getImpostorButton();

    if (button !== undefined) {
      button.setMaxTime(gameOptions.getOption(TownOfPolusGameOptionNames.SheriffCooldown).getValue().value);

      this.setOnClicked(target => {
        this.owner.murder(target);

        if (!target.isImpostor()) {
          this.owner.murder(this.owner);
        }

        if (this.owner.getLobby().getPlayers().filter(x => x.isImpostor() && !x.isDead()).length == 0) {
          // ending by vote is the most logical game over reason, if we want to change this later then we can
          this.owner.getLobby().getHostInstance().endGame(GameOverReason.CrewmatesByVote);
        }
      });

      this.setTargetSelector(players => players.filter(player => !player.isDead())[0]);
    }
  }

  getManagerType(): typeof BaseManager {
    return SheriffManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    return {
      title: "Sheriff",
      subtitle: `Shoot the <color=#FF1919FF>impostor${(player.getLobby().getPlayers().filter(x => x.isImpostor()).length > 1 ? "s" : "")}</color>`,
      color: [196, 150, 69, 255],
    };
  }
}
