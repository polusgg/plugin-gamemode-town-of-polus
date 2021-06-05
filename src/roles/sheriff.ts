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
import { Palette } from "@nodepolus/framework/src/static";
import { Mutable } from "@nodepolus/framework/src/types";
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

    this.catch("player.task.completed", event => event.getPlayer())
      .where(() => this.getAlignment() === RoleAlignment.Crewmate)
      .where(event => event.getPlayer().getLobby().getPlayers()
        .filter(player => player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate)
        .filter(player => player.getTasks().filter(x => !x[1]).length < 1).length == 0,
      )
      .execute(event => endGame.registerEndGameIntent(event.getPlayer().getLobby().getGame()!, {
        endGameData: new Map(event.getPlayer().getLobby().getPlayers()
          .map(player => [player, {
            title: player.isImpostor() ? "Defeat" : "Victory",
            subtitle: "<color=#8CFFFFFF>Crew</color> won by tasks",
            color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
            yourTeam: event.getPlayer().getLobby().getPlayers()
              .filter(sus => !sus.isImpostor()),
            winSound: WinSoundType.CrewmateWin,
          }])),
        intentName: "crewmateTasks",
      }));

    // this is going to call this code for every crewmate at least once
    this.catch("meeting.ended", event => event.getGame())
      .where(() => this.getAlignment() === RoleAlignment.Crewmate)
      .where(event => event.getGame().getLobby().getPlayers()
        .filter(player => player.isImpostor() && !player.isDead())
        .length == 0,
      )
      .execute(event => endGame.registerEndGameIntent(event.getGame(), {
        endGameData: new Map(event.getGame().getLobby().getPlayers()
          .map(player => [player, {
            title: player.isImpostor() ? "Defeat" : "Victory",
            subtitle: "<color=#8CFFFFFF>Crewmates</color> voted out the <color=#FF1919FF>Impostors</color>",
            color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
            yourTeam: event.getGame().getLobby().getPlayers()
              .filter(sus => !sus.isImpostor()),
            winSound: WinSoundType.CrewmateWin,
          }])),
        intentName: "crewmateVote",
      }));

    this.catch("player.left", event => event.getLobby())
      .where(event => event.getLobby().getPlayers().filter(player => !player.isImpostor() && player !== event.getPlayer()).length == 0)
      .execute(event => endGame.registerEndGameIntent(event.getPlayer().getLobby().getGame()!, {
        endGameData: new Map(event.getPlayer().getLobby().getPlayers()
          .map(player => [player, {
            title: "Defeat",
            subtitle: "<color=#FF1919FF>Crewmates</color> disconnected",
            color: Palette.impostorRed() as Mutable<[number, number, number, number]>,
            yourTeam: event.getPlayer().getLobby().getPlayers(),
            winSound: WinSoundType.ImpostorWin,
          }])),
        intentName: "crewmateDisconnected",
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
