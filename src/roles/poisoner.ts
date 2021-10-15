import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Mutable, Vector2 } from "@nodepolus/framework/src/types";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { PoisonerRange } from "../types/enums/poisonerRange";
import { Palette } from "@nodepolus/framework/src/static";
import { HudItem } from "@polusgg/plugin-polusgg-api/src/types/enums/hudItem";
import { VanillaWinConditions } from "@polusgg/plugin-polusgg-api/src/services/endGame/vanillaWinConditions";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";
import { Player } from "@nodepolus/framework/src/player";

const COLOR = "#a000fc";

const POISONER_DEAD_STRING = `<color=${COLOR}>Role: Poisoner</color>
<color=#ff1919>You're dead.</color>
Fake Task:`;

export class PoisonerManager extends BaseManager {
  getId(): string { return "poisoner" }
  getTypeName(): string { return "Poisoner" }
}

export class Poisoner extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Poisoner",
    alignment: RoleAlignment.Impostor,
    preventBaseEmoji: true,
  };

  poisonedPlayers: Map<PlayerInstance, number> = new Map;

  async onReadyImpostor(): Promise<void> {
    this.setOutlineColor([160, 0, 252]);

    await super.onReadyImpostor();

    if (this.owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

      Services.get(ServiceType.Resource).load(this.owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, POISONER_DEAD_STRING);
    });

    this.catch("meeting.started", e => e.getCaller().getLobby()).execute(event => {
      if (event.getCaller().getMeta<boolean>("pgg.top.isPoisoned")) {
        event.cancel();
      }
    });
  }

  async onReady(): Promise<void> {
    const roleManager = Services.get(ServiceType.RoleManager);
    const hudManager = Services.get(ServiceType.Hud);
    const bodyManager = Services.get(ServiceType.DeadBody);
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const cooldown = gameOptions.getOption(TownOfPolusGameOptionNames.PoisonerCooldown).getValue().value;
    const poisonDuration = gameOptions.getOption(TownOfPolusGameOptionNames.PoisonerPoisonDuration).getValue().value;
    const range = PoisonerRange[gameOptions.getOption(TownOfPolusGameOptionNames.PoisonerRange).getValue().getSelected()];

    roleManager.setBaseRole(this.owner, PlayerRole.Impostor);

    (this.owner.getMeta<BaseRole>("pgg.api.role") as Impostor).getImpostorButton()?.destroy();

    await this.catch("meeting.started", ev => ev.getMeetingHud(), true)
      .execute(async ev => {
        for (const player of ev.getGame().getLobby().getPlayers()) {
          if (player.getMeta<boolean>("pgg.top.isPoisoned")) {
            await hudManager.setHudString(player, Location.TaskText, player.getMeta<BaseRole>("pgg.api.role").getDescriptionText());
        
            ev.getMeetingHud().getMeetingHud().getPlayerState(player.getId())?.setDead(true);
            player.setMeta("pgg.top.isPoisoned", false);
            await player.kill();
            player.getGameDataEntry().setDead(true);
            await player.updateGameData();
          }
        }

        if (VanillaWinConditions.shouldEndGameImpostors(ev.getGame().getLobby())) {
          Services.get(ServiceType.EndGame).registerEndGameIntent(ev.getGame(), {
            endGameData: new Map(ev.getGame().getLobby().getPlayers()
              .map(player => [player as Player, {
                title: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Impostor ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                subtitle: player.isImpostor() ? `You won by kills\nsomeone died as a meeting was called` : `<color=#FF1919FF>Impostors</color> won by kills\nsomeone died as a meeting was called`,
                color: Palette.impostorRed() as Mutable<[number, number, number, number]>,
                yourTeam: ev.getGame()
                  .getLobby()
                  .getPlayers()
                  .filter(sus => sus.isImpostor()),
                winSound: WinSoundType.ImpostorWin,
                hasWon: player.isImpostor(),
              }])),
            intentName: "impostorKill",
          });
        }
      });

    await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Poison.png"),
      maxTimer: cooldown,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 15,
    }).then(button => {
      this.catch("meeting.ended", event => event.getGame())
        .execute(() => {
          if (button) {
            button.setCurrentTime(button.getMaxTime());
          }
        });

      Services.get(ServiceType.CoroutineManager)
        .beginCoroutine(this.owner, this.coSaturateButton(this.owner, button));

      this.catch("player.died", e => e.getPlayer()).execute(() => button.destroy());

      button.on("clicked", async () => {
        const target = button.getTargets(range)
          .filter(x => !x.isImpostor() && !x.isDead() && !x.getMeta<boolean>("pgg.top.isPoisoned"))[0] as PlayerInstance | undefined;
        let timeElapsed = 0;

        if (button.getCurrentTime() != 0 || !button.isSaturated() || button.isDestroyed() || target === undefined) {
          return;
        }

        await button.reset();
        await button.setCurrentTime(button.getMaxTime());
        target.setMeta("pgg.top.isPoisoned", true);
        hudManager.setHudString(target, Location.TaskText, this.getPoisonedText(target.getMeta<BaseRole>("pgg.api.role").getDescriptionText(), poisonDuration - timeElapsed));
        Services.get(ServiceType.Hud).setHudVisibility(target, HudItem.ReportButton, false);
        Services.get(ServiceType.Hud).setHudVisibility(target, HudItem.CallMeetingButton, false);

        timeElapsed += 1;

        this.poisonedPlayers.set(target, timeElapsed);

        const timer = setInterval(async () => {
          if (target.getGameDataEntry().isDisconnected()) {
            clearInterval(timer);
            target.setMeta("pgg.top.isPoisoned", false);
            this.poisonedPlayers.delete(target);
          } else if (timeElapsed >= poisonDuration) {
            clearInterval(timer);
            
            target.setMeta("pgg.top.isPoisoned", false);
            
            if (target.getLobby().getGame() !== undefined) {
              await hudManager.setHudString(target, Location.TaskText, target.getMeta<BaseRole>("pgg.api.role").getDescriptionText());

              hudManager.closeHud(target);
              target.kill();
              target.getGameDataEntry().setDead(true);
              target.updateGameData();
              bodyManager.spawn(target.getLobby(), {
                color: Palette.playerBody(target.getColor()).dark as Mutable<[number, number, number, number]>,
                shadowColor: Palette.playerBody(target.getColor()).light as Mutable<[number, number, number, number]>,
                position: target.getPosition(),
                playerId: target.getId(),
              });
          
              if (target.getMeta<BaseRole>("pgg.api.role").getName() === "Phantom") {
                Services.get(ServiceType.Hud).setHudVisibility(target, HudItem.CallMeetingButton, true);
              }
          
              if (target.getMeta<BaseRole>("pgg.api.role").getName() === "Serial Killer") {
                if (this.owner.getLobby().getPlayers().every(player => player.isDead() || !player.isImpostor())) {
                  Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getSafeGame()!, {
                    endGameData: new Map(this.owner.getLobby().getPlayers()
                      .map(player2 => {
                        const isCrewmate = player2.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate;
                        return [player2, {
                        title: isCrewmate ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                        subtitle: player2 === target ? `You died from poison` : `The <color=#ff547c>Serial Killer</color> died from poison`,
                        color: Palette.crewmateBlue() as Mutable<[ number, number, number, number ]>,
                        yourTeam: this.owner.getLobby().getPlayers()
                          .filter(sus => sus.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate),
                        winSound: WinSoundType.CrewmateWin,
                        hasWon: isCrewmate,
                      }]})),
                    intentName: "serialKilledAll",
                  });
                }
              }

              if (target.getMeta<BaseRole | undefined>("pgg.api.role")?.getName() === "Serial Killer" && this.owner.isDead() && this.owner.getLobby().getPlayers().filter(p => !p.isDead() && !p.getGameDataEntry().isDisconnected() && p.isImpostor()).length == 0) {
                Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getGame()!, {
                  endGameData: new Map(this.owner.getLobby().getGame()!.getLobby().getPlayers()
                    .map(player2 => [player2, {
                      title: player2.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                      subtitle: player2 === target ? "You got poisoned" : `The <color=#ff547c>Serial Killer</color> was poisoned to death`,
                      color: [255, 84, 124, 255],
                      yourTeam: this.owner.getLobby().getPlayers().filter(p => p.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate),
                      winSound: WinSoundType.CrewmateWin,
                      hasWon: player2.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate,
                    }])),
                  intentName: "serialVotedOut",
                });
              }

              this.poisonedPlayers.delete(target);
            }
          } else if (target.getLobby().getGame() === undefined) {
            clearInterval(timer);
            target.setMeta("pgg.top.isPoisoned", false);
            this.poisonedPlayers.delete(target);
          } else if (target.isDead()) {
            clearInterval(timer);
            target.setMeta("pgg.top.isPoisoned", false);
            this.poisonedPlayers.delete(target);
            await hudManager.setHudString(target, Location.TaskText, target.getMeta<BaseRole>("pgg.api.role").getDescriptionText());
          } else {
            await hudManager.setHudString(target, Location.TaskText, this.getPoisonedText(target.getMeta<BaseRole>("pgg.api.role").getDescriptionText(), poisonDuration - timeElapsed));
            this.poisonedPlayers.set(target, timeElapsed);
          }
          timeElapsed += 1;
          await hudManager.setHudString(this.owner, Location.TaskText, this.getDescriptionText());
        }, 1000);
      });
    });
  }

  getManagerType(): typeof BaseManager {
    return PoisonerManager;
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
      title: "Poisoner",
      subtitle: `Poison all crewmates to win`,
      color: [160, 0, 252, 255],
    };
  }

  getPoisonedText(baseText: string, time: number): string {
    return `${baseText.replace("\nFake Tasks:", "")}
<color=${COLOR}>You have been poisoned and will die in ${time} seconds.
You can’t call a meeting or report bodies.</color>${baseText.includes("Fake Tasks:") ? "\nFake Tasks:" : ""}`;
  }

  getDescriptionText(): string {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const poisonDuration = gameOptions.getOption(TownOfPolusGameOptionNames.PoisonerPoisonDuration).getValue().value;

    let description = `<color=${COLOR}>Role: Poisoner
Sabotage and poison the crewmates</color>`;

    if (this.poisonedPlayers) {
      for (const [ player, timeElapsed ] of this.poisonedPlayers) {
        const connection = this.owner.getConnection();
  
        const secondsLeft = poisonDuration - timeElapsed;
        if (connection) {
          description += `
${Services.get(ServiceType.Name).getFor(connection, player)} will die in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}`;
        }
      }
    }

    description += `
Fake Tasks:`;

    return description;
  }
}
