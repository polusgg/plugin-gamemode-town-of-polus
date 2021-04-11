import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Vector2 } from "@nodepolus/framework/src/types";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { AssassinManager } from "./assassin";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Player } from "@nodepolus/framework/src/player";
import { CameraAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/camera";

export class GrenadierManager extends BaseManager {
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

  getId(): string { return "grenadier" }
  getTypeName(): string { return "Grenadier" }
}

export class Grenadier extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Grenadier",
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    const roleManager = Services.get(ServiceType.RoleManager);

    roleManager.setBaseRole(owner as Player, PlayerRole.Impostor);

    owner.setTasks(new Set());

    Services.get(ServiceType.Button).spawnButton(owner.getSafeConnection(), {
      asset: this.getManager<AssassinManager>("grenadier").bundle.getSafeAsset("Assets/Mods/OfficialAssets/Throw.png"),
      maxTimer: owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", () => {
        owner.getLobby().getPlayers().forEach(player => {
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
