import { CameraAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/camera";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle, AudioAsset } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { GameState, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Vector2 } from "@nodepolus/framework/src/types";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";
import { PlayerAnimationField } from "@polusgg/plugin-polusgg-api/src/types/playerAnimationFields";
import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { Palette } from "@nodepolus/framework/src/static";
import { SoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/soundType";
import { AudioAssetDeclaration } from "@polusgg/plugin-polusgg-api/src/types/assetBundleDeclaration";

export class GrenadierManager extends BaseManager {
  getId(): string { return "grenadier" }
  getTypeName(): string { return "Grenadier" }
}

const COLOR = "#728F3D";

const GRENADIER_DEAD_STRING = `<color=${COLOR}>Role: Grenadier</color>
<color=#ff1919>You're dead.</color>
Fake Task:`;

export class Grenadier extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Grenadier",
    alignment: RoleAlignment.Impostor,
    preventBaseEmoji: true,
  };

  private get grenadierRange(): number { return 5.5 }
  private readonly grenadierBlindness: NumberValue;
  private readonly grenadierCooldown: NumberValue;

  constructor(owner: PlayerInstance) {
    super(owner);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.grenadierBlindness = gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierBlindness).getValue();
    this.grenadierCooldown = gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierCooldown).getValue();

    const resourceService = Services.get(ServiceType.Resource);
    if (owner.getConnection() !== undefined) {
      resourceService.load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, GRENADIER_DEAD_STRING);
    });
    
    for (const player of this.owner.getLobby().getPlayers()) {
      const roleName = player.getMeta<BaseRole|undefined>("pgg.api.role")?.getName();
      if (roleName === "crewmate" || roleName === "impostor") {
        resourceService.load(player.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus"));
      }
    }
  }

  onReady(): void {
    Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

    const roleManager = Services.get(ServiceType.RoleManager);

    roleManager.setBaseRole(this.owner, PlayerRole.Impostor);

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Throw.png"),
      maxTimer: this.grenadierCooldown.value,
      position: new Vector2(-2.1, -2.0),
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

        if (button.getCurrentTime() != 0 || !button.isSaturated() || button.isDestroyed() || button.getCurrentTime() !== 0) {
          return;
        }

        const inRangePlayers = this.anyTargets();

        if (inRangePlayers.length === 0) {
          return;
        }

        const topAssetBundle = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus");
        const flashbangAsset = topAssetBundle.getSafeAsset("Assets/Mods/TownOfPolus/FlashbangSfx.mp3");
        const flashbangSfxAsset = new AudioAsset(flashbangAsset.getBundle(), flashbangAsset.getDeclaration() as AudioAssetDeclaration);
        
        Services.get(ServiceType.SoundManager)
          .playSound(this.owner.getConnection()!, new AudioAsset(
            topAssetBundle,
            flashbangSfxAsset.getDeclaration()
          ), {
            position: this.owner.getPosition(),
            soundType: SoundType.Sfx
          });

        button.stopCountingDown();
        button.setCurrentTime(button.getMaxTime());
        inRangePlayers.forEach(player => {
          Services.get(ServiceType.SoundManager)
            .playSound(player.getConnection()!, new AudioAsset(
              topAssetBundle,
              flashbangSfxAsset.getDeclaration()
            ), {
              position: player.getPosition(),
              soundType: SoundType.Sfx
            });

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

          Services.get(ServiceType.Animation)
            .beginPlayerAnimation(player, [PlayerAnimationField.TertiaryColor], [
              new PlayerAnimationKeyframe({
                tertiaryColor: [255, 255, 255, 255],
                duration: 150,
                offset: 0,
              }),
              new PlayerAnimationKeyframe({
                tertiaryColor: Palette.playerVisor() as any,
                duration: 300,
                offset: 150 + (1000 * blindness.value),
              }),
            ], true);
        });
        setTimeout(() => {
          button.reset();
        }, 450 + (1000 * blindness.value));
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
      if (button.isCountingDown()) {
        yield;
      }

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
      color: [114, 143, 61, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Grenadier
Sabotage and kill the crewmates.
Use flashbangs to blind the crewmates.</color>
Fake Tasks:`;
  }
}
