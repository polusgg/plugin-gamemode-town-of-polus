import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
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

    const endGame = Services.get(ServiceType.EndGame);

    this.catch("player.murdered", event => event.getPlayer().getLobby())
      .where(event => event.getPlayer().getLobby().getPlayers()
        // player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Impostor
        .filter(player => (player.isImpostor() || player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Neutral) && !player.isDead())
        .length == 0)
      .execute(async event => endGame.registerEndGameIntent(event.getPlayer().getLobby().getSafeGame()!, {
        endGameData: new Map(event.getPlayer().getLobby().getPlayers()
          .map(player => [player, {
            title: "Victory",
            // subtitle: "<color=#FF1919FF>Sheriff</color> killed all <color=#C49645FF>Impostors</color>",
            subtitle: "<color=#C49645FF>Sheriff</color> killed all <color=#FF1919FF>Impostors</color>",
            color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
            yourTeam: event.getPlayer().getLobby().getPlayers()
              .filter(sus => !sus.isImpostor()),
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

      this.setOnClicked(async target => {
        this.owner.murder(target);

        console.log(this.owner.getName(), "Murdered", target.getName());
        console.log(target.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment());

        if (target.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate || (target.getMeta<BaseRole | undefined>("pgg.api.role") === undefined && !target.isImpostor())) {
          await this.owner.murder(this.owner);

          if ((this.owner.getLobby().getHostInstance() as unknown as { shouldEndGame(): boolean }).shouldEndGame()) {
            console.log("GAME SHOULD BE ENDED");

            Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getGame()!, {
              intentName: "impostorKill",
              endGameData: new Map(this.owner.getLobby().getPlayers()
                .map((player, _, players) => [player, {
                  title: player.isImpostor() ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                  subtitle: "The <color=#C49645FF>Sheriff</color> committed suicide, resulting in a <color=#FF1919FF>Impostor</color> victory",
                  color: Palette.impostorRed() as Mutable<[number, number, number, number]>,
                  yourTeam: players.filter(sus => sus.isImpostor()),
                  winSound: WinSoundType.ImpostorWin,
                }])),
            });
          } else {
            console.log("GAME SHOULD NOT BE ENDED???");
          }
        }
      });

      this.setTargetSelector(players => players.filter(player => !player.isDead())[0]);
    }
  }

  getManagerType(): typeof BaseManager {
    return SheriffManager;
  }

  getAssignmentScreen(player: PlayerInstance, impostorCount: number): StartGameScreenData {
    return {
      title: "Sheriff",
      subtitle: `Shoot the ${impostorCount != 1 ? `${impostorCount} ` : ""}<color=#FF1919FF>impostor${(impostorCount != 1 ? "s" : "")}</color>`,
      color: [196, 150, 69, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=#c49645>Role: Sheriff
Finish your task or vote out the imposter.
You can kill the impostor and neutrals but don't kill crewmates</color>`;
  }
}
