import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { shuffleArrayClone } from "@nodepolus/framework/src/util/shuffle";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Palette, Tasks } from "@nodepolus/framework/src/static";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { Vector2 } from "@nodepolus/framework/src/types";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { PlayerAnimationField } from "@polusgg/plugin-polusgg-api/src/types/playerAnimationFields";
import { PhantomState } from "../types/enums/phantomState";
import { ResourceResponse } from "@polusgg/plugin-polusgg-api/src/types";
import { Player } from "@nodepolus/framework/src/player";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";

export class PhantomManager extends BaseManager {
  getId(): string { return "phantom" }
  getTypeName(): string { return "Phantom" }
}

const CREWMATE_DEAD_STRING = `<color=#8cffff>Role: Crewmate</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

const PHANTOM_DEAD_STRING = `<color=#8cffff>Role: Phantom</color>
<color=#ff1919>You're dead.</color>`;

export class Phantom extends Crewmate {
  public state: PhantomState = PhantomState.Alive;
  protected metadata: RoleMetadata = {
    name: "Phantom",
    alignment: RoleAlignment.Crewmate,
  };

  private button: Button | undefined;

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      const allPlayers = owner.getLobby().getRealPlayers();

      allPlayers.push(owner);

      const promises: Promise<ResourceResponse>[] = [];

      for (let i = 0; i < allPlayers.length; i++) {
        promises.push(Services.get(ServiceType.Resource).load(allPlayers[i].getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")));
      }

      Promise.allSettled(promises).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const endGame = Services.get(ServiceType.EndGame);

    this.catch("player.murdered", x => x.getPlayer()).execute(async _event => {
      if (this.state !== PhantomState.Alive) {
        if (this.state === PhantomState.Transformed) {
          console.error("Phantom should never die while transformed! This is undefined behaviour, and should never occur under any circumstance!");
        }

        await Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, CREWMATE_DEAD_STRING);

        return;
      }

      this.catch("player.task.completed", x => x.getPlayer()).execute(async event => {
        if (event.getPlayer().getGameDataEntry().isDoneWithTasks()) {
          await Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, this.getAfterTasksFinishedText());
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

      if (Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby()).getOption(TownOfPolusGameOptionNames.PhantomRevealTime)
        .getValue()
        .getSelected() === "After Meeting") {
        await (async (): Promise<void> => new Promise<void>(resolve => {
          this.catch("meeting.started", m => m.getGame()).execute(_ => {
            if (!_.isCancelled() && _.getCaller().getId() !== this.owner.getId()) {
              resolve();
            }
          });
          this.catch("game.ended", g => g.getGame()).execute(_ => {
            resolve();
          });
        }))();
      }

      this.state = PhantomState.Transformed;

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
      await Services.get(ServiceType.Animation).setOpacity(this.owner, 0);
      await this.owner.revive();
      await this.showPhantom();
    });

    this.catch("meeting.started", event => event.getGame())
      .where(() => this.state === PhantomState.Transformed)
      .execute(event => {
        if (event.getCaller() === this.owner || event.isCancelled()) {
          event.cancel();
        } else {
          this.unshowPhantom();
        }
      });

    this.catch("meeting.ended", event => event.getGame())
      .where(() => this.state === PhantomState.Transformed)
      .execute(_event => {
        console.log(_event, this);
        this.showPhantom();
      });

    this.catch("meeting.started", event => event.getCaller())
      .where(event => this.state === PhantomState.Transformed && event.getCaller().getTasks().filter(x => !x[1]).length < 1 && event.getVictim() === undefined)
      .execute(event => {
        endGame.registerEndGameIntent(event.getGame(), {
          endGameData: new Map(event.getGame().getLobby().getPlayers()
            .map(player => [player as Player, {
              title: player === this.owner ? "Victory" : "<color=#FF1919FF>Defeat</color>",
              subtitle: player === this.owner ? "You haunted everyone" : "The <color=#8cffff>Phantom</color> haunted everyone",
              color: [140, 255, 255, 255],
              yourTeam: [this.owner],
              winSound: WinSoundType.ImpostorWin,
            }])),
          intentName: "phantomMeeting",
        });
      });
  }

  async display(): Promise<void> {
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getRealDescriptionText());
    await Services.get(ServiceType.Hud).setHudString(this.owner, Location.RoomTracker, "You've become the <color=#8cffff>Phantom</color>!");

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

  async unshowPhantom(): Promise<void> {
    if (this.state !== PhantomState.Transformed) {
      return;
    }

    this.owner.getGameDataEntry().setDead(true);
    await Services.get(ServiceType.Animation).setOpacity(this.owner, 0);
    this.button?.destroy();
    this.button = undefined;
  }

  async showPhantom(): Promise<void> {
    if (this.state !== PhantomState.Transformed) {
      return;
    }

    this.owner.getGameDataEntry().setDead(false);

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
    ], false);

    this.button = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/PhantomButton.png"),
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

      this.state = PhantomState.Caught;
      this.owner.kill();
      this.owner.getGameDataEntry().setDead(true);
      this.owner.updateGameData();
      this.button?.destroy();
      // this.owner.setTasks(new Set());
      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, PHANTOM_DEAD_STRING);
      // console.log("phantom clicked");
    });
  }

  getManagerType(): typeof BaseManager {
    return PhantomManager;
  }

  getAssignmentScreen(player: PlayerInstance, impostorCount: number): StartGameScreenData {
    return {
      title: "Crewmate",
      subtitle: `There ${(impostorCount != 1 ? "are" : "is")} ${impostorCount} <color=#FF1919FF>impostor${(impostorCount != 1 ? "s" : "")}</color> among us`,
      color: Palette.crewmateBlue(),
    };
  }

  getRealDescriptionText(): string {
    return `<color=#8cffff>Role: Phantom
Finish your tasks without being seen 
and call a meeting.</color>`;
  }

  getAfterTasksFinishedText(): string {
    return `<color=#8cffff>Role: Phantom
You've finished your tasks.
Call a meeting and win.</color>`;
  }

  getDescriptionText(): string {
    return `<color=#8cffff>Role: Crewmate (DEBUG: Phantom)
Finish your tasks.</color>`;
  }
}
