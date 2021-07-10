import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@nodepolus/framework/src/protocol/polus/assets";
import { Vector2 } from "@nodepolus/framework/src/types";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { ResourceResponse } from "@polusgg/plugin-polusgg-api/src/types";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";

export class SnitchManager extends BaseManager {
  getId(): string { return "snitch" }
  getTypeName(): string { return "Snitch" }
}

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
        promises.push(impostors[i].getConnection()!.loadBundle(AssetBundle.loadSafeFromCache("TownOfPolus")));
      }

      Promise.allSettled(promises).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const poiManager = Services.get(ServiceType.PointOfInterestManager);

    this.catch("player.task.completed", event => event.getPlayer()).execute(event => {
      const taskLeftCount = event.getPlayer().getTasks().filter(task => !task[1]).length - 1;

      if (taskLeftCount == gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks).getValue().value) {
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              const poi = await poiManager.spawnPointOfInterest(player.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/SnitchArrow.png"), Vector2.zero());

              await poi.attach(this.owner);
            }
          });
      } else if (taskLeftCount == 0) {
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              const poi = await poiManager.spawnPointOfInterest(this.owner.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), Vector2.zero());

              await poi.attach(player);
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
}
