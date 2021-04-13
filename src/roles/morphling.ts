import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TextComponent } from "@nodepolus/framework/src/api/text";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Vector2 } from "@nodepolus/framework/src/types";
import { Player } from "@nodepolus/framework/src/player";

export class MorphlingManager extends BaseManager {
  getId(): string { return "morphling" }
  getTypeName(): string { return "Morphling" }
}

class PlayerAppearance {
  constructor(
    public name: TextComponent,
    public hat: number,
    public pet: number,
    public skin: number,
    public color: number,
  ) {}

  static save(player: PlayerInstance): PlayerAppearance {
    return new PlayerAppearance(
      player.getName(),
      player.getColor(),
      player.getPet(),
      player.getSkin(),
      player.getColor(),
    );
  }

  apply(player: PlayerInstance): void {
    player.setName(this.name);
    player.setHat(this.hat);
    player.setPet(this.pet);
    player.setSkin(this.skin);
    player.setColor(this.color);
  }
}

export class Morphling extends BaseRole {
  public targetAppearance?: PlayerAppearance;
  public ownAppearance?: PlayerAppearance;
  public timeout?: NodeJS.Timeout;

  protected metadata: RoleMetadata = {
    name: "Morphling",
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
    Services.get(ServiceType.RoleManager).setBaseRole(this.owner as Player, PlayerRole.Impostor);

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/OfficialAssets/Sample.png"),
      maxTimer: 20,
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", async () => {
        if (this.targetAppearance === undefined) {
          const target = button.getTarget(3);

          if (target !== undefined) {
            button.setColor([162, 18, 219, 0x7F]);
            button.setAsset(AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/OfficialAssets/Sample.png"));
            button.setCurrentTime(5);
            this.targetAppearance = PlayerAppearance.save(target);
          }
        } else {
          this.ownAppearance = PlayerAppearance.save(this.owner);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [
            new PlayerAnimationKeyframe({
              angle: 0,
              duration: 100,
              offset: 0,
              opacity: 0,
              position: Vector2.zero(),
              scale: Vector2.one(),
              primaryColor: [255, 255, 255, 255],
              secondaryColor: [255, 255, 255, 255],
            }),
          ], false);

          if (this.owner.getLobby().getMeetingHud() !== undefined) {
            return;
          }

          this.targetAppearance.apply(this.owner);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [
            new PlayerAnimationKeyframe({
              angle: 0,
              duration: 100,
              offset: 0,
              opacity: 1,
              position: Vector2.zero(),
              scale: Vector2.one(),
              primaryColor: [255, 255, 255, 255],
              secondaryColor: [255, 255, 255, 255],
            }),
          ], false);

          this.timeout = setTimeout(async () => {
            await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [
              new PlayerAnimationKeyframe({
                angle: 0,
                duration: 100,
                offset: 0,
                opacity: 0,
                position: Vector2.zero(),
                scale: Vector2.one(),
                primaryColor: [255, 255, 255, 255],
                secondaryColor: [255, 255, 255, 255],
              }),
            ], false);
            this.ownAppearance!.apply(this.owner);
            await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [
              new PlayerAnimationKeyframe({
                angle: 0,
                duration: 100,
                offset: 0,
                opacity: 1,
                position: Vector2.zero(),
                scale: Vector2.one(),
                primaryColor: [255, 255, 255, 255],
                secondaryColor: [255, 255, 255, 255],
              }),
            ], false);
          }, 5000);
        }
      });
    });

    this.catch("meeting.started", event => event.getGame()).execute(() => {
      this.ownAppearance?.apply(this.owner);
    });
  }

  getManagerType(): typeof BaseManager {
    return MorphlingManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Morphling",
      subtitle: "Transform and deceive the crew",
      color: [162, 18, 219, 255],
    };
  }
}
