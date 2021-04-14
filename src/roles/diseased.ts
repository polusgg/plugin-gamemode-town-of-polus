import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";

export class DiseasedManager extends BaseManager {
  getId(): string { return "diseased" }
  getTypeName(): string { return "Diseased" }
}

export class Diseased extends BaseRole {
  public died = false;

  protected metadata: RoleMetadata = {
    name: "Diseased",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady);
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    this.owner.setTasks(new Set());

    this.catch("player.died", x => x.getPlayer()).execute(() => {
      const killCooldown = this.owner.getLobby().getOptions().getKillCooldown();

      this.owner.getLobby().getOptions().setKillCooldown(killCooldown);
    });
  }

  getManagerType(): typeof BaseManager {
    return DiseasedManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    const impostors = player.getLobby().getPlayers().filter(x => x.isImpostor()).length;

    return {
      title: "Crewmate",
      subtitle: `There ${(impostors > 1 ? "are" : "is")} [FF1919FF]impostor${(impostors > 1 ? "s" : "")}[] among us`,
      color: [255, 140, 238, 255],
    };
  }
}
