import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { shuffleArrayClone } from "@nodepolus/framework/src/util/shuffle";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Palette, Tasks } from "@nodepolus/framework/src/static";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { Mutable, Vector2 } from "@nodepolus/framework/src/types";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { PlayerAnimationField } from "@polusgg/plugin-polusgg-api/src/types/playerAnimationFields";
import { PhantomState } from "../types/enums/phantomState";
import { ResourceResponse } from "@polusgg/plugin-polusgg-api/src/types";
import { Player } from "@nodepolus/framework/src/player";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";
import { HudItem } from "@polusgg/plugin-polusgg-api/src/types/enums/hudItem";
import { VanillaWinConditions } from "@polusgg/plugin-polusgg-api/src/services/endGame/vanillaWinConditions";
import { DeathReason, SystemType } from "@nodepolus/framework/src/types/enums";
import { SubmergedOxygenSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems/submergedOxygenSystem";
import { EmojiService } from "@polusgg/plugin-polusgg-api/src/services/emojiService/emojiService";

export class PhantomManager extends BaseManager {
  getId(): string { return "phantom" }
  getTypeName(): string { return "Phantom" }
}

const COLOR = "#8cffff";

const CREWMATE_DEAD_STRING = `<color=${COLOR}>Role: Crewmate</color>
<color=#ff1919>You've been caught, finish your tasks.</color>`;

const PHANTOM_DEAD_STRING = `<color=${COLOR}>Role: Phantom</color>
<color=#ff1919>You've been caught.</color>`;

export class Phantom extends Crewmate {
  public state: PhantomState = PhantomState.Alive;
  protected metadata: RoleMetadata = {
    name: "Phantom",
    alignment: RoleAlignment.Crewmate,
    preventBaseEmoji: true,
  };

  private button: Button | undefined;

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${EmojiService.static("crewmate")} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

      const allPlayers = owner.getLobby().getRealPlayers();

      allPlayers.push(owner);

      const promises: Promise<ResourceResponse>[] = [];

      for (let i = 0; i < allPlayers.length; i++) {
        promises.push(Services.get(ServiceType.Resource).load(allPlayers[i].getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")));
      }

      Promise.allSettled(promises).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const endGame = Services.get(ServiceType.EndGame);

    this.catch("player.died", e => e.getPlayer()).execute(async event => {
      if (event.getReason() === DeathReason.Unknown) {
        await this.handleMurder();
      } else {
        await Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, CREWMATE_DEAD_STRING);
      }
    });

    this.catch("player.murdered", x => x.getPlayer()).where(e => e.getPlayer() !== e.getKiller()).execute(async _event => {
      await this.handleMurder();
    });

    this.catch("meeting.started", event => event.getGame())
      .where(() => this.state === PhantomState.Transformed)
      .execute(event => {
        if (event.getCaller() === this.owner || event.isCancelled()) {
          event.cancel();
        } else {
          event.getMeetingHud().getMeetingHud().getPlayerState(this.owner.getId())!.setDead(true);
          this.unshowPhantom();
        }
      });

    this.catch("meeting.ended", event => event.getGame())
      .where(() => this.state === PhantomState.Transformed)
      .execute(_event => {
        this.showPhantom();
      });

    this.catch("meeting.started", event => event.getCaller())
      .where(event => this.state === PhantomState.Transformed && event.getCaller().getTasks().filter(x => !x[1]).length < 1 && event.getVictim() === undefined)
      .execute(event => {
        endGame.registerEndGameIntent(event.getGame(), {
          endGameData: new Map(event.getGame().getLobby().getPlayers()
            .map(player => [player as Player, {
              title: player === this.owner ? "Victory" : "<color=#FF1919FF>Defeat</color>",
              subtitle: player === this.owner ? "You haunted everyone" : `The <color=${COLOR}>Phantom</color> haunted everyone`,
              color: [140, 255, 255, 255],
              yourTeam: [this.owner],
              winSound: WinSoundType.ImpostorWin,
              hasWon: player === this.owner,
            }])),
          intentName: "phantomMeeting",
        });
      });
  }

  async display(): Promise<void> {
    const hud = Services.get(ServiceType.Hud);

    await hud.setHudString(this.owner, Location.TaskText, this.getRealDescriptionText());
    await hud.setHudString(this.owner, Location.RoomTracker, `You've become the <color=${COLOR}>Phantom</color>!`);
    await hud.setHudString(this.owner, Location.MeetingButtonHudText, `You're the <color=${COLOR}>Phantom</color>.\n\nFinish your tasks!`);
    await this.owner.setRemainingEmergencies(1);

    setTimeout(() => {
      Services.get(ServiceType.Hud).setHudString(this.owner, Location.RoomTracker, "__unset");
    }, 10000);
  }

  giveTasks(): void {
    let tasks = Tasks.forLevel(this.owner.getLobby().getLevel());

    tasks = shuffleArrayClone([...tasks]);
    tasks = tasks.slice(0, Services.get(ServiceType.GameOptions)
      .getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby()).getOption(TownOfPolusGameOptionNames.PhantomRemainingTasks)
      .getValue().value,
    );

    this.owner.setTasks(new Set(tasks));
  }

  async handleMurder(): Promise<void> {
    if (this.state !== PhantomState.Alive) {
      return;
    }

    this.owner.setMeta("pgg.countAsDead", true);

    if (VanillaWinConditions.shouldEndGameImpostors(this.owner.getLobby())) {
      Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getSafeGame(), {
        intentName: "impostorKill",
        endGameData: new Map(this.owner.getLobby().getPlayers().map(p => ([
          p,
          {
            title: p.isImpostor() ? "Victory" : "<color=#FF1919FF>Defeat</color>",
            subtitle: "<color=#FF1919FF>Impostors</color> won by kills",
            color: Palette.impostorRed() as Mutable<[number, number, number, number]>,
            yourTeam: p.getLobby()
              .getPlayers()
              .filter(sus => sus.isImpostor()),
            winSound: WinSoundType.ImpostorWin,
            hasWon: p.isImpostor(),
          },
        ]))),
      });
    }

    Services.get(ServiceType.EndGame).registerExclusion(this.owner.getLobby().getSafeGame(), { intentName: "impostorVote" });
    Services.get(ServiceType.EndGame).registerExclusion(this.owner.getLobby().getSafeGame(), { intentName: "crewmateVote" });
    Services.get(ServiceType.Hud).setHudVisibility(this.owner, HudItem.ReportButton, false);

    this.catch("player.task.completed", x => x.getPlayer()).execute(async event => {
      if (event.getPlayer().getGameDataEntry().isDoneWithTasks()) {
        await Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, this.getAfterTasksFinishedText());
        await Services.get(ServiceType.Hud).setHudString(this.owner, Location.MeetingButtonHudText, `<size=90%>You've finished your tasks.\n\nCall a meeting and win!</size>`);
      }
    });

    this.catch("submerged.room.oxygen.console.repaired", ev => ev.getGame())
      .execute(ev => {
        ev.cancel();
        const system = ev.getGame().getLobby().getShipStatus()?.getShipStatus().getSystemFromType(SystemType.Oxygen) as SubmergedOxygenSystem|undefined;

        if (system) {
          system.addPlayerWithMask(ev.getPlayer().getId());

          if (system.getPlayersWithMask().length === ev.getGame().getLobby().getPlayers().filter(p => !p.isDead() && p.getMeta<BaseRole|undefined>("pgg.api.role")?.getName() !== "Phantom").length) {
            system.setDuration(10000);
            system.clearPlayersWithMasks();
          }
          
          ev.getGame().getLobby().getHostInstance().getSystemsHandler()?.sendDataUpdate();
        }
      });

    this.catch("meeting.vote.added", x => x.getVoter())
      .execute(event => event.cancel());

    /*const notMurderers = event.getKiller().getLobby().getPlayers()
      .filter(p => p !== event.getKiller())
      .map(player => player.getSafeConnection());*/

    // todo make sure dead bodies can be reported (they can't right now!!!)
    // todo stop spawning vanilla among us dead bodies on the client?

    /*Services.get(ServiceType.DeadBody).spawn(event.getPlayer().getLobby(), {
      color: Palette.playerBody(this.owner.getColor()).dark as Mutable<[number, number, number, number]>,
      shadowColor: Palette.playerBody(this.owner.getColor()).light as Mutable<[number, number, number, number]>,
      position: this.owner.getPosition(),
    }, notMurderers);*/

    this.state = PhantomState.Transformed;
    Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

    if (this.owner.getLobby().getMeetingHud() !== undefined) {
      const watcher = this.catch("meeting.concluded", meeting => meeting.getGame());

      watcher.execute(_ => {
        this.display();
        watcher.destroy();
      });
    } else {
      this.display();
    }

    this.owner.setMeta("pgg.api.targetable", false);
    this.setAlignment(RoleAlignment.Neutral);
    this.giveTasks();

    if (this.owner.getLobby().getPlayers()
      .filter(player => player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate)
      .filter(player => !player.getLobby().getGameData()?.getGameData()
        .getSafePlayer(player.getId())
        .isDoneWithTasks(),
      ).length == 0) {
      Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getGame()!, {
        endGameData: new Map(this.owner.getLobby().getPlayers()
          .map(player => [player, {
            title: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate ? "Victory" : "<color=#FF1919FF>Defeat</color>",
            subtitle: "<color=#8CFFFFFF>Crewmates</color> won by tasks\n<size=50%>(The impostor killed a phantom in crew form, resetting their tasks. All other crewmates were finished with their tasks)</size>",
            color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
            yourTeam: this.owner.getLobby().getPlayers()
              .filter(sus => sus.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate),
            winSound: WinSoundType.CrewmateWin,
            hasWon: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate,
          }])),
        intentName: "crewmateTasks",
      });

      return;
    }
    await Services.get(ServiceType.Animation).setOpacity(this.owner, 0);
    await this.owner.revive();
    await this.showPhantom();
  }

  async unshowPhantom(): Promise<void> {
    if (this.state !== PhantomState.Transformed) {
      return;
    }

    await Services.get(ServiceType.Animation).setOpacity(this.owner, 0);
    this.button?.destroy();
    this.button = undefined;
  }

  async showPhantom(): Promise<void> {
    if (this.state !== PhantomState.Transformed) {
      return;
    }

    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getRealDescriptionText());

    const appearTime = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby()).getOption(TownOfPolusGameOptionNames.PhantomAppearTime)
      .getValue().value;

    // await Services.get(ServiceType.Animation).setOpacity(this.owner, 0);
    // slowly reveal phantom, then add a button onto them (button.attachTo) and save it in this.button
    await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.Opacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity], [
      new PlayerAnimationKeyframe({
        offset: 0,
        duration: 0,
        opacity: 0,
        petOpacity: 0,
      }),
      new PlayerAnimationKeyframe({
        offset: 5000,
        duration: appearTime === 0
          ? 1
          : 1000 * appearTime,
        opacity: 0.05,
        petOpacity: 0,
      }),
    ], false, this.owner.getLobby().getConnections().filter(conn => conn !== this.owner.getConnection()));

    await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.Opacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity], [
      new PlayerAnimationKeyframe({
        offset: 0,
        duration: 0,
        opacity: 0,
        petOpacity: 0,
      }),
      new PlayerAnimationKeyframe({
        offset: 5000,
        duration: appearTime === 0
          ? 1
          : 1000 * appearTime,
        opacity: 0.3,
        petOpacity: 0,
      }),
    ], false, [ this.owner.getConnection()! ]);

    this.button = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/PhantomButton.png"),
      maxTimer: 69,
      position: Vector2.zero(),
      alignment: EdgeAlignments.None,
      // isCountingDown: false,
      currentTime: 0,
      attachedTo: this.owner,
    }, this.owner.getLobby().getConnections());
    this.button.on("clicked", event => {
      if (event.connection === this.owner.getSafeConnection() || event.connection.getPlayer()?.isDead()) {
        return;
      }

      Services.get(ServiceType.EndGame).unregisterExclusion(this.owner.getLobby().getSafeGame(), "impostorVote");
      Services.get(ServiceType.EndGame).unregisterExclusion(this.owner.getLobby().getSafeGame(), "crewmateVote");

      this.state = PhantomState.Caught;
      this.owner.kill();
      this.owner.getGameDataEntry().setDead(true);
      this.owner.updateGameData();
      this.button?.destroy();
      // this.owner.setTasks(new Set());
      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, PHANTOM_DEAD_STRING);
      // console.log("phantom clicked");
    });

    Services.get(ServiceType.Hud).setHudVisibility(this.owner, HudItem.ReportButton, false);
  }

  getManagerType(): typeof BaseManager {
    return PhantomManager;
  }

  getAssignmentScreen(player: PlayerInstance, impostorCount: number): StartGameScreenData {
    return {
      title: "Crewmate",
      subtitle: `There ${(impostorCount != 1 ? "are" : "is")} ${impostorCount} <color=#FF1919FF>Impostor${(impostorCount != 1 ? "s" : "")}</color> among us`,
      color: Palette.crewmateBlue(),
    };
  }

  getRealDescriptionText(): string {
    return `<color=${COLOR}>Role: Phantom
Finish your tasks without being seen 
and call a meeting.</color>`;
  }

  getAfterTasksFinishedText(): string {
    if (this.state === PhantomState.Caught) {
      return `<color=${COLOR}>Role: Phantom</color>
<color=#ff1919>You've been caught.</color>`;
    }

    return `<color=${COLOR}>Role: Phantom
You've finished your tasks.
Call a meeting and win.</color>`;
  }

  getDescriptionText(): string {
//    return `<color=${COLOR}>Role: Crewmate (DEBUG: Phantom)
//Finish your tasks.</color>`;
    return `<color=${COLOR}>Role: Crewmate
Finish your tasks.</color>`;
  }
}
