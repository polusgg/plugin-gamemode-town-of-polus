import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";

export class SnitchManager extends BaseManager {
  public bundle!: AssetBundle;

  constructor(lobby: LobbyInstance) {
    super(lobby);

    this.load();
  }

  async load(): Promise<void> {
    this.bundle = await AssetBundle.load("TownOfPolus");

    this.owner.getConnections().forEach(connection => {
      Services.get(ServiceType.Resource).load(connection, this.bundle!);
    });
  }

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

    const poiManager = Services.get(ServiceType.PointOfInterestManager);

    this.catch("player.task.completed", event => event.getPlayer()).execute(async event => {
      const taskLeftCount = event.getPlayer().getTasks().map(task => !task[1]).length;

      if (taskLeftCount == 2) {
        event.getPlayer().getLobby().getPlayers()
          .forEach(async player => {
            if (player.isImpostor()) {
              const poi = await poiManager.spawnPointOfInterest(player.getSafeConnection(), this.getManager<SnitchManager>("snitch").bundle.getSafeAsset("Assets/Mods/TownOfPolus/SnitchArrow.png"), Vector2.zero());

              await poi.attach(event.getPlayer());
            }
          });
      } else if (taskLeftCount == 0) {
        const poi = await poiManager.spawnPointOfInterest(event.getPlayer().getSafeConnection(), this.getManager<SnitchManager>("snitch").bundle.getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), Vector2.zero());

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
