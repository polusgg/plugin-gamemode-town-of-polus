import { CameraAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/camera";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { GameState, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";

export class GrenadierManager extends BaseManager {
  getId(): string { return "grenadier" }
  getTypeName(): string { return "Grenadier" }
}

export class Grenadier extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Grenadier",
    alignment: RoleAlignment.Impostor,
  };

  private readonly grenadierRange: number = 5.5;
  private readonly grenadierBlindness: NumberValue;
  private readonly grenadierCooldown: NumberValue;

  constructor(owner: PlayerInstance) {
    super(owner);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.grenadierBlindness = gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierBlindness).getValue();
    this.grenadierCooldown = gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierCooldown).getValue();

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const roleManager = Services.get(ServiceType.RoleManager);

    roleManager.setBaseRole(this.owner, PlayerRole.Impostor);

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Throw.png"),
      maxTimer: this.grenadierCooldown.value,
      position: new Vector2(2.1, 2.0),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 10,
    }).then(button => {
      Services.get(ServiceType.CoroutineManager).beginCoroutine(this.owner, this.coSaturateGrenadierButton(this.owner, button));

      this.catch("player.died", event => event.getPlayer()).execute(() => button.destroy());

      this.catch("meeting.ended", event => event.getGame())
        .execute(() => {
          button.setCurrentTime(button.getMaxTime());
        });

      button.on("clicked", () => {
        const blindness = this.grenadierBlindness;

        if (button.getCurrentTime() != 0 || !button.isSaturated() || button.isDestroyed()) {
          return;
        }

        const inRangePlayers = this.anyTargets();

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

  anyTargets(): PlayerInstance[] {
    return this.owner.getLobby().getPlayers()
      .filter(player => !player.isImpostor() && !player.isDead() && player.getPosition().distance(this.owner.getPosition()) <= this.grenadierRange && player.getConnection() !== undefined);
  }

  * coSaturateGrenadierButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    let wasInVent = false;

    while (true) {
      //todo break out on custom predicate
      if (player.isDead()) {
        break;
      }

      const targets = this.anyTargets();

      const isSaturated = button.isSaturated();

      if ((this.owner.getVent() === undefined) === wasInVent) {
        if (!wasInVent) {
          button.setSaturated(false);
        }

        wasInVent = (this.owner.getVent() !== undefined);

        while (this.owner.getVent() !== undefined) {
          if (player.isDead()) {
            break;
          }

          yield;
        }
        continue;
      }

      if ((targets.length === 0) === isSaturated) {
        button.setSaturated(!isSaturated);
      }

      yield;
    }
  }

  getManagerType(): typeof BaseManager {
    return GrenadierManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Grenadier",
      subtitle: "Use the flashbangs to blind the <color=#8CFFFFFF>Crewmates</color>",
      color: [255, 128, 0, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=#ff8000>Role: Grenadier
Sabotage and kill the crewmates
You can use the flashbangs to blind the other teams.</color>`;
  }
}
