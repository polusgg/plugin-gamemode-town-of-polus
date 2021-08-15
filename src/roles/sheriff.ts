import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Mutable } from "@nodepolus/framework/src/types";
import { Palette } from "@nodepolus/framework/src/static";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";
import { SerialKiller } from "./serialKiller";

export class SheriffManager extends BaseManager {
  getId(): string { return "sheriff" }
  getTypeName(): string { return "Sheriff" }
}

const COLOR = "#c49645";

const SHERIFF_DEAD_STRING = `<color=${COLOR}>Role: Sheriff</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

// todo not duplicate code for crewmate wins on sheriff!!!!

export class Sheriff extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Sheriff",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner, PlayerRole.Crewmate, "TownOfPolus/TownOfPolus", "Assets/Mods/TownOfPolus/Shoot.png");

    const endGame = Services.get(ServiceType.EndGame);

    Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

    this.catch("player.murdered", event => event.getPlayer().getLobby())
      .where(event => event.getPlayer().getLobby().getPlayers()
        // player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Impostor
        .filter(player => (player.isImpostor() || player.getMeta<BaseRole | undefined>("pgg.api.role") instanceof SerialKiller) && !player.isDead() && !player.getGameDataEntry().isDisconnected())
        .length == 0)
      .execute(async event => {
        const impostorCount = this.owner.getLobby().getPlayers().filter(player => player.isImpostor()).length;

        if (event.getPlayer().getLobby().getGame() !== undefined) {
          await endGame.registerEndGameIntent(event.getPlayer().getLobby().getSafeGame()!, {
            endGameData: new Map(event.getPlayer().getLobby().getPlayers()
              .map(player => [player, {
                title: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                // subtitle: "<color=#FF1919FF>Sheriff</color> killed all <color=#C49645FF>Impostors</color>",
                subtitle: player === this.owner ? `You killed ${impostorCount != 1 ? "all" : "the"} <color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}` : `<color=${COLOR}>Sheriff</color> killed ${impostorCount != 1 ? "all" : "the"} <color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}</color>`,
                color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
                yourTeam: event.getPlayer().getLobby().getPlayers()
                  .filter(sus => sus.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate),
                winSound: WinSoundType.CrewmateWin,
                hasWon: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate,
              }])),
            intentName: "sheriffKill",
          });
        }
      });

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, SHERIFF_DEAD_STRING);
    });
  }

  async onReadyImpostor(): Promise<void> {
    await super.onReadyImpostor();

    if (this.owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(this.owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
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

        if (target.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate) {
          await this.owner.murder(this.owner);

          if ((this.owner.getLobby().getHostInstance() as unknown as { shouldEndGame(): boolean }).shouldEndGame()) {
            const impostorCount = this.owner.getLobby().getPlayers().filter(player => player.isImpostor()).length;

            console.trace("Registering sheriff misfire event");

            await Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getGame()!, {
              intentName: "sheriffMisfire",
              endGameData: new Map(this.owner.getLobby().getPlayers()
                .map((player, _, players) => [player, {
                  title: player.isImpostor() ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                  subtitle: player === this.owner ? `You misfired!` : `<color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}</color> won by <color=${COLOR}>Sheriff</color> misfire`,
                  color: Palette.impostorRed() as Mutable<[number, number, number, number]>,
                  yourTeam: players.filter(sus => sus.isImpostor()),
                  winSound: WinSoundType.ImpostorWin,
                  hasWon: player.isImpostor(),
                }])),
            });
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
      subtitle: `Shoot the ${impostorCount != 1 ? `${impostorCount} ` : ""}<color=#FF1919FF>Impostor${(impostorCount != 1 ? "s" : "")}</color>`,
      color: [196, 150, 69, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Sheriff
Finish your tasks and shoot the impostors.</color>`;
  }
}
