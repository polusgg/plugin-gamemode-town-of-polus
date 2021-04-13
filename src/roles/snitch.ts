import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";

export class SnitchManager extends BaseManager {
  getId(): string { return "snitch" }
  getTypeName(): string { return "Snitch" }
}

export class Snitch extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Snitch",
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    owner.setTasks(new Set());

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady);
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const poiManager = Services.get(ServiceType.PointOfInterestManager);

    this.catch("player.task.completed", event => event.getPlayer()).execute(async event => {
      const taskLeftCount = event.getPlayer().getTasks().map(task => !task[1]).length;

      if (taskLeftCount == 2) {
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.isImpostor()) {
              const poi = await poiManager.spawnPointOfInterest(player.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/SnitchArrow.png"), Vector2.zero());

              await poi.attach(event.getPlayer());
            }
          });
      } else if (taskLeftCount == 0) {
        const poi = await poiManager.spawnPointOfInterest(event.getPlayer().getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), Vector2.zero());

        poi.attach(event.getPlayer());
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return SnitchManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    return {
      title: "Snitch",
      subtitle: `Finish your tasks to reveal the impostor${(player.getLobby().getPlayers().filter(x => x.isImpostor()).length > 1 ? "s" : "")}`,
      color: [0, 255, 221, 255],
    };
  }
}
