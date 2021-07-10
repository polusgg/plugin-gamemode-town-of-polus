import { CameraAnimationKeyframe } from "@nodepolus/framework/src/protocol/polus/animation/camera";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@nodepolus/framework/src/protocol/polus/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { EdgeAlignments, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";

export class GrenadierManager extends BaseManager {
  getId(): string { return "grenadier" }
  getTypeName(): string { return "Grenadier" }
}

export class Grenadier extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Grenadier",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      owner.getConnection()!.loadBundle(AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const roleManager = Services.get(ServiceType.RoleManager);

    roleManager.setBaseRole(this.owner, PlayerRole.Impostor);

    this.owner.getLobby().spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Throw.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierCooldown).getValue().value,
      position: new Vector2(2.1, 2.1),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 10,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(() => button.destroy());

      this.catch("meeting.ended", event => event.getGame())
        .execute(() => {
          button.setCurrentTime(button.getMaxTime());
        });

      button.on("clicked", () => {
        const range = gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierRange).getValue();
        const blindness = gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierBlindness).getValue();

        if (button.getCurrentTime() != 0 || button.isDestroyed()) {
          return;
        }

        const inRangePlayers = this.owner.getLobby().getPlayers()
          .filter(player => !player.isImpostor() && !player.isDead() && player.getPosition().distance(this.owner.getPosition()) <= range.value && player.getConnection() !== undefined);

        if (inRangePlayers.length === 0) {
          return;
        }

        button.reset();
        inRangePlayers.forEach(player => {
          Services.get(ServiceType.Animation)
            .beginCameraAnimation(player.getConnection()!, Services.get(ServiceType.CameraManager).getController(player), [
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
                offset: 75,
                position: Vector2.zero(),
              }),
              new CameraAnimationKeyframe({
                angle: 0,
                color: [255, 255, 255, 0],
                duration: 300,
                offset: 150 + (1000 * blindness.value),
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
      subtitle: "Use flashbangs to blind the <color=#8CFFFFFF>crewmates</color>",
      color: [255, 128, 0, 255],
    };
  }
}
