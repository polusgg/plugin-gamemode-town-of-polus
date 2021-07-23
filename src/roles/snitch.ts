import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../..";
import { ResourceResponse } from "@polusgg/plugin-polusgg-api/src/types";
import { TownOfPolusGameOptionNames } from "../types";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";

export class SnitchManager extends BaseManager {
  getId(): string { return "snitch" }
  getTypeName(): string { return "Snitch" }
}

const SNITCH_DEAD_STRING = `<color=#00ffdd>Role: Snitch</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

export class Snitch extends Crewmate {
  protected metadata: RoleMetadata = {
    name: "Snitch",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      const impostors = owner.getLobby().getRealPlayers().filter(player => player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor);

      impostors.push(owner);

      const promises: Promise<ResourceResponse>[] = [];

      for (let i = 0; i < impostors.length; i++) {
        promises.push(Services.get(ServiceType.Resource).load(impostors[i].getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")));
      }

      Promise.allSettled(promises).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.murdered", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, SNITCH_DEAD_STRING);
    });
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const poiManager = Services.get(ServiceType.PointOfInterestManager);

    this.catch("player.task.completed", event => event.getPlayer()).execute(event => {
      const taskLeftCount = event.getPlayer().getTasks().filter(task => !task[1]).length;

      console.log("TaskLeftCount", taskLeftCount);

      const SRT = gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks).getValue().value;

      if (taskLeftCount <= SRT && taskLeftCount !== 0) {
        event.getPlayer().getLobby().getPlayers()
          .filter(player => player.isImpostor())
          .forEach(player => {
            Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `The <color=#00ffdd>Snitch</color> only has <size=120%><b>${taskLeftCount}</b></size> task${taskLeftCount == 1 ? "" : "s"} left, and is about to reveal <color=#ff1919>your role!</color>`);
          });
      }

      if (taskLeftCount == SRT && !this.owner.isDead()) {
        console.log("TLC @ SRT");
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              console.log("Loading SnitchArrow for", player.getConnection()?.getId());

              const poi = await poiManager.spawnPointOfInterest(player.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/SnitchArrow.png"), Vector2.zero());

              poi.attach(this.owner);

              this.catch("player.died", event2 => event2.getPlayer()).execute(_ => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                poi.despawn();
              });

              this.catch("player.left", event2 => event2.getPlayer()).execute(_ => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                poi.despawn();
              });
            }
          });
      } else if (taskLeftCount == 0 && !this.owner.isDead()) {
        console.log("TLC @ 0");
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              console.log("Loading ImpostorArrow for", player.getConnection()?.getId());

              const poi = await poiManager.spawnPointOfInterest(this.owner.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), Vector2.zero());

              Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `The <color=#00ffdd>Snitch</color> has finished their tasks and revealed <color=#ff1919>your role!</color>`);

              setTimeout(() => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
              }, 10000);

              await poi.attach(player);

              this.catch("player.died", event2 => event2.getPlayer()).execute(_ => {
                Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `__unset`);
                poi.despawn();
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
      subtitle: `Finish your tasks to reveal the ${impostorCount != 1 ? `${impostorCount} ` : ""}<color=#FF1919FF>impostor${impostorCount != 1 ? "s" : ""}</color>`,
      color: [0, 255, 221, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=#00ffdd>Role: Snitch
Finish your tasks to reveal the impostor.</color>`;
  }
}
