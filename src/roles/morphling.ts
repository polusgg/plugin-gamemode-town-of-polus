import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { TextComponent } from "@nodepolus/framework/src/api/text";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Player } from "@nodepolus/framework/src/player";
import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";

export class MorphlingManager extends BaseManager {
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

    Services.get(ServiceType.RoleManager).setBaseRole(owner as Player, PlayerRole.Impostor);

    Services.get(ServiceType.Button).spawnButton(owner.getSafeConnection(), {
      asset: this.getManager<MorphlingManager>("morphling").bundle.getSafeAsset("Assets/Mods/OfficialAssets/Sample.png"),
      maxTimer: 20,
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", async () => {
        if (this.targetAppearance === undefined) {
          const target = button.getTarget(3);

          if (target !== undefined) {
            button.setColor([162, 18, 219, 0x7F]);
            button.setAsset(this.getManager<MorphlingManager>("morphling").bundle.getSafeAsset("Assets/Mods/OfficialAssets/Sample.png"));
            button.setCurrentTime(5);
            this.targetAppearance = PlayerAppearance.save(target);
          }
        } else {
          this.ownAppearance = PlayerAppearance.save(owner);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(owner, [
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

          if (owner.getLobby().getMeetingHud() !== undefined) {
            return;
          }

          this.targetAppearance.apply(owner);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(owner, [
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
            await await Services.get(ServiceType.Animation).beginPlayerAnimation(owner, [
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
            this.ownAppearance!.apply(owner);
            await await Services.get(ServiceType.Animation).beginPlayerAnimation(owner, [
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
      this.ownAppearance?.apply(owner);
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
