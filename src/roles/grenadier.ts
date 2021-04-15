import { CameraAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/camera";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Vector2 } from "@nodepolus/framework/src/types";
import { Player } from "@nodepolus/framework/src/player";

export class GrenadierManager extends BaseManager {
  getId(): string { return "grenadier" }
  getTypeName(): string { return "Grenadier" }
}

export class Grenadier extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Grenadier",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const roleManager = Services.get(ServiceType.RoleManager);

    roleManager.setBaseRole(this.owner as Player, PlayerRole.Impostor);

    this.owner.setTasks(new Set());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Throw.png"),
      maxTimer: this.owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", () => {
        this.owner.getLobby().getPlayers().forEach(player => {
          Services.get(ServiceType.Animation)
            .beginCameraAnimation(Services.get(ServiceType.CameraManager).getController(player), [
              new CameraAnimationKeyframe({
                angle: 0,
                color: [255, 255, 255, 0],
                duration: 75,
                offset: 0,
                position: Vector2.zero(),
              }),
              new CameraAnimationKeyframe({
                angle: 0,
                color: [255, 255, 255, 255],
                duration: 75,
                offset: 0,
                position: Vector2.zero(),
              }),
              new CameraAnimationKeyframe({
                angle: 0,
                color: [255, 255, 255, 0],
                duration: 3000,
                offset: 150,
                position: Vector2.zero(),
              }),
            ]);
        });
      });
    });
  }

  getManagerType(): typeof BaseManager {
    return GrenadierManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Grenadier",
      subtitle: "Use flashbangs to blind the crew",
      color: [255, 128, 0, 255],
    };
  }
}
