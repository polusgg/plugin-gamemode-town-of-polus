import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { shuffleArrayClone } from "@nodepolus/framework/src/util/shuffle";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Palette, Tasks } from "@nodepolus/framework/src/static";
import { SetStringPacket } from "@polusgg/plugin-polusgg-api/src/packets/root";
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

        return;
      }
      // todo make sure Prez finishes moving-pgg branch

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

      this.catch("meeting.started", event => event.getCaller()).execute(event => event.cancel());

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

      await this.owner.getSafeConnection().writeReliable(new SetStringPacket("Complete your tasks and call a meeting", Location.TaskText));
      this.owner.setMeta("pgg.api.targetable", false);
      this.setAlignment(RoleAlignment.Neutral);
      this.giveTasks();
      this.owner.revive();
      await this.showPhantom();
    });

    this.catch("meeting.started", event => event.getCaller())
      .where(event => this.state === PhantomState.Transformed && event.getCaller().getTasks().filter(x => !x[1]).length < 1 && event.getVictim() === undefined)
      .execute(event => {
        endGame.registerEndGameIntent(event.getGame(), {
          endGameData: new Map(event.getGame().getLobby().getPlayers()
            .map(player => [player as Player, {
              title: player === this.owner ? "Victory" : "<color=#FF1919FF>Defeat</color>",
              subtitle: "",
              color: [255, 140, 238, 255],
              yourTeam: [this.owner],
              winSound: WinSoundType.ImpostorWin,
            }])),
          intentName: "phantomMeeting",
        });
      });
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

    await Services.get(ServiceType.Animation).setOpacity(this.owner, 0);
    this.button?.getEntity().despawn();
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
    ], false);

    this.button = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/PhantomButton.png"),
      maxTimer: 69,
      position: Vector2.zero(),
      alignment: EdgeAlignments.None,
      // isCountingDown: false,
      currentTime: 0,
    }, this.owner.getLobby().getConnections());
    this.button.on("clicked", event => {
      if (event.connection === this.owner.getSafeConnection()) {
        return;
      }

      this.state = PhantomState.Caught;
      this.owner.kill();
      this.owner.getGameDataEntry().setDead(true);
      this.owner.updateGameData();
      this.button?.destroy();
      this.owner.setTasks(new Set());
      // console.log("phantom clicked");
    });
    await this.button.attach(this.owner);
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
Finish your tasks without being seen.</color>`;
  }

  getDescriptionText(): string {
    return `<color=#8cffff>Role: Crewmate (DEBUG: Phantom)
Finish your tasks.</color>`;
  }
}
