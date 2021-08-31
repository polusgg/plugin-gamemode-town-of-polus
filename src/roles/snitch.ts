import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { getAlignmentSpriteForRole, getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { ResourceResponse } from "@polusgg/plugin-polusgg-api/src/types";
import { TownOfPolusGameOptionNames } from "../types";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";

export class SnitchManager extends BaseManager {
  getId(): string { return "snitch" }
  getTypeName(): string { return "Snitch" }
}

const COLOR = "#00ffdd";

const SNITCH_DEAD_STRING = `<color=${COLOR}>Role: Snitch</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

export class Snitch extends Crewmate {
  protected metadata: RoleMetadata = {
    name: "Snitch",
    alignment: RoleAlignment.Crewmate,
    preventBaseEmoji: true,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

      const impostors = owner.getLobby().getRealPlayers().filter(player => player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor);

      impostors.push(owner);

      const promises: Promise<ResourceResponse>[] = [];

      for (let i = 0; i < impostors.length; i++) {
        promises.push(Services.get(ServiceType.Resource).load(impostors[i].getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")));
      }

      Promise.allSettled(promises).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, SNITCH_DEAD_STRING);
    });
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const poiManager = Services.get(ServiceType.PointOfInterestManager);

    this.catch("player.task.completed", event => event.getPlayer()).where(p => !p.getPlayer().isDead()).execute(event => {
      const taskLeftCount = event.getPlayer().getTasks().filter(task => !task[1]).length;

      const remainingTasks = gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks).getValue().value;

      if (taskLeftCount <= remainingTasks && taskLeftCount !== 0) {
        event.getPlayer().getLobby().getPlayers()
          .filter(player => player.isImpostor())
          .forEach(player => {
            Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `The <color=${COLOR}>Snitch</color> only has <size=120%><b>${taskLeftCount}</b></size> task${taskLeftCount == 1 ? "" : "s"} left, and is about to reveal <color=#ff1919>your role!</color>`);
          });
      }

      if (taskLeftCount == remainingTasks && !this.owner.isDead()) {
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              const poi = await poiManager.spawnPointOfInterest(player.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/SnitchArrow.png"), this.owner.getPosition(), this.owner);

              this.catch("player.died", event2 => event2.getPlayer().getLobby()).execute(event3 => {
                if (event3.getPlayer() === this.owner || event3.getPlayer().isImpostor()) {
                  Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                  poi.despawn();
                }
              });

              this.catch("player.left", event2 => event2.getPlayer()).execute(_ => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                poi.despawn();
              });
            }
          });
      } else if (taskLeftCount == 0 && !this.owner.isDead()) {
        Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, this.getAfterTasksFinishedText());

        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              const poi = await poiManager.spawnPointOfInterest(this.owner.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), player.getPosition(), player);
              const realAlignment = getAlignmentSpriteForRole(player.getMeta<BaseRole>("pgg.api.role"));

              Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), player, `${realAlignment} ${player.getName().toString()}`);
              Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `The <color=${COLOR}>Snitch</color> has finished their tasks and revealed <color=#ff1919>your role!</color>`);

              setTimeout(() => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
              }, 10000);

              this.catch("player.died", event2 => event2.getPlayer().getLobby()).execute(event3 => {
                if (event3.getPlayer() === this.owner || event3.getPlayer().isImpostor()) {
                  Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                  poi.despawn();
                }
              });

              this.catch("player.left", event2 => event2.getPlayer()).execute(_ => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                poi.despawn();
              });
            }
          });
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return SnitchManager;
  }

  getAssignmentScreen(player: PlayerInstance, impostorCount: number): StartGameScreenData {
    return {
      title: "Snitch",
      subtitle: `Finish your tasks to reveal the ${impostorCount != 1 ? `${impostorCount} ` : ""}<color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}</color>`,
      color: [0, 255, 221, 255],
    };
  }

  getAfterTasksFinishedText(): string {
    return `<color=${COLOR}>Role: Snitch
You've finished your tasks, follow the red\narrows to locate the impostors.</color>`
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Snitch
Finish your tasks to reveal the impostor.</color>`;
  }
}
